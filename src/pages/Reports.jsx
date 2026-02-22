import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3 } from 'lucide-react';
import { format, parseISO, isWithinInterval, differenceInDays, addDays } from 'date-fns';
import { getHoursWorked, getInitials, getEffectiveRate } from '../utils/helpers';
import TimeframeSelector, { calculateRange } from '../components/TimeframeSelector';
import './Reports.css';

const TABS = ['Labor', 'Attendance', 'Time Off', 'Sales'];

function initTimeframe() {
  const range = calculateRange('weekly');
  return { preset: 'weekly', startDate: format(range.start, 'yyyy-MM-dd'), endDate: format(range.end, 'yyyy-MM-dd') };
}

export default function Reports() {
  const { state } = useApp();
  const { employees, shifts, timeEntries, absences, salesEntries, currentLocationId, locations } = state;

  const currentLocation = locations.find((l) => l.id === currentLocationId);
  const locationEmployees = useMemo(() => employees.filter((e) => (e.locationIds || [e.locationId]).includes(currentLocationId)), [employees, currentLocationId]);
  const locationEmpIds = useMemo(() => new Set(locationEmployees.map((e) => e.id)), [locationEmployees]);

  const [activeTab, setActiveTab] = useState('Labor');
  const [timeframe, setTimeframe] = useState(initTimeframe);

  const rangeStart = parseISO(timeframe.startDate);
  const rangeEnd = parseISO(timeframe.endDate);
  const rangeDays = Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1);

  // Labor data by day
  const laborByDay = useMemo(() => {
    const days = [];
    for (let d = 0; d < rangeDays; d++) {
      const date = addDays(rangeStart, d);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayShifts = shifts.filter((s) => locationEmpIds.has(s.employeeId) && format(parseISO(s.start), 'yyyy-MM-dd') === dateStr);
      let cost = 0, hours = 0;
      dayShifts.forEach((s) => {
        const emp = locationEmployees.find((e) => e.id === s.employeeId);
        if (emp) { const h = getHoursWorked(s.start, s.end); hours += h; cost += h * getEffectiveRate(emp, s.position); }
      });
      const sales = salesEntries.filter((s) => s.locationId === currentLocationId && s.date === dateStr).reduce((sum, s) => sum + s.amount, 0);
      days.push({ date: dateStr, label: rangeDays <= 14 ? format(date, 'EEE') : format(date, 'M/d'), cost, hours, sales });
    }
    return days;
  }, [shifts, salesEntries, locationEmployees, locationEmpIds, currentLocationId, rangeStart, rangeDays]);

  const maxSales = Math.max(...laborByDay.map((d) => d.sales), 1);
  const maxCost = Math.max(...laborByDay.map((d) => d.cost), 1);
  const maxBar = Math.max(maxSales, maxCost);

  const totalLabor = laborByDay.reduce((s, d) => s + d.cost, 0);
  const totalSales = laborByDay.reduce((s, d) => s + d.sales, 0);
  const totalHours = laborByDay.reduce((s, d) => s + d.hours, 0);

  // Attendance
  const attendanceData = useMemo(() => {
    return locationEmployees.map((emp) => {
      const entries = timeEntries.filter((t) => t.employeeId === emp.id && t.status === 'completed' && isWithinInterval(parseISO(t.clockIn), { start: rangeStart, end: rangeEnd }));
      const uniqueDays = new Set(entries.map((t) => format(parseISO(t.clockIn), 'yyyy-MM-dd')));
      const outsideCount = entries.filter((t) => t.geofenceStatus === 'outside').length;
      let totalHrs = 0;
      entries.forEach((t) => { totalHrs += getHoursWorked(t.clockIn, t.clockOut); });
      return { ...emp, daysWorked: uniqueDays.size, totalHrs, entries: entries.length, outsideCount };
    }).sort((a, b) => b.daysWorked - a.daysWorked);
  }, [locationEmployees, timeEntries, rangeStart, rangeEnd]);

  // Time Off
  const timeOffData = useMemo(() => {
    return locationEmployees.map((emp) => {
      const empAbs = absences.filter((a) => a.employeeId === emp.id);
      let sickUsed = 0, vacUsed = 0, persUsed = 0, pending = 0;
      empAbs.forEach((a) => {
        const days = Math.max(1, differenceInDays(parseISO(a.endDate), parseISO(a.startDate)) + 1);
        if (a.status === 'approved') {
          if (a.type === 'sick') sickUsed += days;
          else if (a.type === 'vacation') vacUsed += days;
          else if (a.type === 'personal') persUsed += days;
        }
        if (a.status === 'pending') pending += days;
      });
      const pto = emp.ptoBalance || { sick: 10, vacation: 10, personal: 3 };
      return { ...emp, sickUsed, vacUsed, persUsed, pending, sickTotal: pto.sick, vacTotal: pto.vacation, persTotal: pto.personal };
    });
  }, [locationEmployees, absences]);

  // Sales by day
  const salesByDay = useMemo(() => laborByDay.map((d) => ({ ...d })), [laborByDay]);
  const maxDailySales = Math.max(...salesByDay.map((d) => d.sales), 1);

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">{currentLocation?.name}</p>
        </div>
      </div>

      <TimeframeSelector value={timeframe} onChange={setTimeframe} />

      <div className="reports-tabs">
        {TABS.map((tab) => (
          <button key={tab} className={`reports-tab ${activeTab === tab ? 'reports-tab--active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Labor' && (
        <div>
          <div className="report-summary">
            <div className="report-stat"><span className="report-stat__value">${totalLabor.toLocaleString()}</span><span className="report-stat__label">Total Labor Cost</span></div>
            <div className="report-stat"><span className="report-stat__value">${totalSales.toLocaleString()}</span><span className="report-stat__label">Total Sales</span></div>
            <div className="report-stat"><span className="report-stat__value">{totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : 0}%</span><span className="report-stat__label">Labor %</span></div>
            <div className="report-stat"><span className="report-stat__value">{totalHours}</span><span className="report-stat__label">Total Hours</span></div>
          </div>
          <div className="card">
            <div className="card__header"><h2 className="card__title"><BarChart3 size={18} /> Sales vs Labor Cost</h2></div>
            <div className="card__body">
              <div className="bar-chart">
                {laborByDay.map((d) => (
                  <div key={d.date} className="bar-chart__col">
                    <div className="bar-chart__bars">
                      <div className="bar bar--sales" style={{ height: `${(d.sales / maxBar) * 100}%` }} title={`Sales: $${d.sales}`} />
                      <div className="bar bar--labor" style={{ height: `${(d.cost / maxBar) * 100}%` }} title={`Labor: $${d.cost}`} />
                    </div>
                    <span className="bar-chart__label">{d.label}</span>
                  </div>
                ))}
              </div>
              <div className="bar-chart__legend">
                <span className="legend-item"><span className="legend-dot legend-dot--sales" /> Sales</span>
                <span className="legend-item"><span className="legend-dot legend-dot--labor" /> Labor</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Attendance' && (
        <div className="card">
          <div className="card__header"><h2 className="card__title">Attendance Summary</h2></div>
          <div className="card__body">
            <table className="report-table">
              <thead><tr><th>Employee</th><th>Days Worked</th><th>Clock-ins</th><th>Hours</th><th>Geofence Flags</th></tr></thead>
              <tbody>
                {attendanceData.map((emp) => (
                  <tr key={emp.id}>
                    <td><div className="payroll-emp"><div className="payroll-emp__avatar" style={{ background: emp.color }}>{getInitials(emp.name)}</div><div><div className="payroll-emp__name">{emp.name}</div></div></div></td>
                    <td>{emp.daysWorked}</td>
                    <td>{emp.entries}</td>
                    <td>{emp.totalHrs}h</td>
                    <td>{emp.outsideCount > 0 ? <span className="flag-badge">{emp.outsideCount}</span> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Time Off' && (
        <div className="card">
          <div className="card__header"><h2 className="card__title">Time Off Summary</h2></div>
          <div className="card__body">
            <table className="report-table">
              <thead><tr><th>Employee</th><th>Sick</th><th>Vacation</th><th>Personal</th><th>Pending</th></tr></thead>
              <tbody>
                {timeOffData.map((emp) => (
                  <tr key={emp.id}>
                    <td><div className="payroll-emp"><div className="payroll-emp__avatar" style={{ background: emp.color }}>{getInitials(emp.name)}</div><div><div className="payroll-emp__name">{emp.name}</div></div></div></td>
                    <td>{emp.sickUsed}/{emp.sickTotal} days</td>
                    <td>{emp.vacUsed}/{emp.vacTotal} days</td>
                    <td>{emp.persUsed}/{emp.persTotal} days</td>
                    <td>{emp.pending > 0 ? <span className="badge badge--pending">{emp.pending} days</span> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Sales' && (
        <div>
          <div className="report-summary">
            <div className="report-stat"><span className="report-stat__value">${totalSales.toLocaleString()}</span><span className="report-stat__label">Total Sales</span></div>
            <div className="report-stat"><span className="report-stat__value">${rangeDays > 0 ? Math.round(totalSales / rangeDays).toLocaleString() : 0}</span><span className="report-stat__label">Daily Avg</span></div>
          </div>
          <div className="card">
            <div className="card__header"><h2 className="card__title"><BarChart3 size={18} /> Daily Sales</h2></div>
            <div className="card__body">
              <div className="bar-chart">
                {salesByDay.map((d) => (
                  <div key={d.date} className="bar-chart__col">
                    <div className="bar-chart__bars">
                      <div className="bar bar--sales" style={{ height: `${(d.sales / maxDailySales) * 100}%` }} title={`$${d.sales}`} />
                    </div>
                    <span className="bar-chart__label">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
