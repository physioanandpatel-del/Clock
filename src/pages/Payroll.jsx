import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DollarSign } from 'lucide-react';
import { format, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { getInitials, getHoursWorked, getEffectiveRate } from '../utils/helpers';
import TimeframeSelector, { calculateRange } from '../components/TimeframeSelector';
import './Payroll.css';

function initTimeframe() {
  const range = calculateRange('weekly');
  return { preset: 'weekly', startDate: format(range.start, 'yyyy-MM-dd'), endDate: format(range.end, 'yyyy-MM-dd') };
}

export default function Payroll() {
  const { state } = useApp();
  const { employees, shifts, currentLocationId } = state;

  const [timeframe, setTimeframe] = useState(initTimeframe);

  const locationEmployees = useMemo(() => employees.filter((e) => (e.locationIds || [e.locationId]).includes(currentLocationId)), [employees, currentLocationId]);
  const locationEmpIds = useMemo(() => new Set(locationEmployees.map((e) => e.id)), [locationEmployees]);

  const rangeStart = parseISO(timeframe.startDate);
  const rangeEnd = parseISO(timeframe.endDate);

  const periodShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (!locationEmpIds.has(s.employeeId)) return false;
      const d = parseISO(s.start);
      return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
    });
  }, [shifts, locationEmpIds, rangeStart, rangeEnd]);

  const overtimeThreshold = useMemo(() => {
    const preset = timeframe.preset;
    if (preset === 'daily') return 8;
    if (preset === 'weekly') return 40;
    if (preset === 'biweekly') return 80;
    if (preset === 'semimonthly') return 80;
    if (preset === 'monthly') return 160;
    if (preset === 'quarterly') return 480;
    if (preset === 'annually') return 2080;
    // custom: pro-rate based on days
    const days = Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1);
    return Math.round((days / 7) * 40);
  }, [timeframe.preset, rangeStart, rangeEnd]);

  const employeePayroll = useMemo(() => {
    return locationEmployees.map((emp) => {
      const empShifts = periodShifts.filter((s) => s.employeeId === emp.id);
      let totalHours = 0;
      empShifts.forEach((s) => { totalHours += getHoursWorked(s.start, s.end); });
      const regularHours = Math.min(totalHours, overtimeThreshold);
      const overtimeHours = Math.max(0, totalHours - regularHours);
      const rate = getEffectiveRate(emp);
      const regularPay = regularHours * rate;
      const overtimePay = overtimeHours * rate * 1.5;
      return { ...emp, totalHours, regularHours, overtimeHours, regularPay, overtimePay, totalPay: regularPay + overtimePay, shiftCount: empShifts.length, effectiveRate: rate };
    }).filter((e) => e.shiftCount > 0).sort((a, b) => b.totalPay - a.totalPay);
  }, [locationEmployees, periodShifts, overtimeThreshold]);

  const totals = useMemo(() => {
    let hours = 0, pay = 0;
    employeePayroll.forEach((e) => { hours += e.totalHours; pay += e.totalPay; });
    return { hours, pay };
  }, [employeePayroll]);

  return (
    <div className="payroll-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Review payroll by period</p>
        </div>
      </div>

      <TimeframeSelector value={timeframe} onChange={setTimeframe} />

      <div className="payroll-summary-cards">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue"><DollarSign size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Total Payroll</span>
            <span className="stat-card__value">${totals.pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green"><DollarSign size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Total Hours</span>
            <span className="stat-card__value">{totals.hours.toLocaleString()}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--orange"><DollarSign size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Employees</span>
            <span className="stat-card__value">{employeePayroll.length}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Employee Breakdown</h2>
        </div>
        <div className="card__body payroll-table-wrap">
          {employeePayroll.length === 0 ? (
            <div className="empty-state">
              <DollarSign size={40} className="empty-state__icon" />
              <p>No shifts in this pay period</p>
            </div>
          ) : (
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shifts</th>
                  <th>Regular Hrs</th>
                  <th>OT Hrs</th>
                  <th>Rate</th>
                  <th>Regular Pay</th>
                  <th>OT Pay</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {employeePayroll.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className="payroll-emp">
                        <div className="payroll-emp__avatar" style={{ background: emp.color }}>{getInitials(emp.name)}</div>
                        <div>
                          <div className="payroll-emp__name">{emp.name}</div>
                          <div className="payroll-emp__role">{(emp.roles || [emp.role]).join(', ')}</div>
                        </div>
                      </div>
                    </td>
                    <td>{emp.shiftCount}</td>
                    <td>{emp.regularHours}h</td>
                    <td>{emp.overtimeHours > 0 ? `${emp.overtimeHours}h` : '-'}</td>
                    <td>${emp.effectiveRate}/hr</td>
                    <td>${emp.regularPay.toFixed(2)}</td>
                    <td>{emp.overtimePay > 0 ? `$${emp.overtimePay.toFixed(2)}` : '-'}</td>
                    <td className="payroll-total-cell">${emp.totalPay.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Totals</strong></td>
                  <td colSpan={4}></td>
                  <td></td>
                  <td className="payroll-total-cell"><strong>${totals.pay.toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
