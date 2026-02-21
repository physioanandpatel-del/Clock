import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval, parseISO, setDate, lastDayOfMonth } from 'date-fns';
import { getInitials, getHoursWorked } from '../utils/helpers';
import './Payroll.css';

export default function Payroll() {
  const { state, dispatch } = useApp();
  const { employees, shifts, payrollSettings, currentLocationId } = state;

  const [currentDate, setCurrentDate] = useState(new Date());

  const locationEmployees = useMemo(() => employees.filter((e) => e.locationId === currentLocationId), [employees, currentLocationId]);
  const locationEmpIds = useMemo(() => new Set(locationEmployees.map((e) => e.id)), [locationEmployees]);

  const period = payrollSettings.period;

  const periodRange = useMemo(() => {
    if (period === 'weekly') {
      const start = startOfWeek(currentDate, { weekStartsOn: payrollSettings.startDay });
      return { start, end: endOfWeek(currentDate, { weekStartsOn: payrollSettings.startDay }) };
    } else if (period === 'biweekly') {
      const ws = startOfWeek(currentDate, { weekStartsOn: payrollSettings.startDay });
      return { start: ws, end: addDays(ws, 13) };
    } else if (period === 'semimonthly') {
      const day = currentDate.getDate();
      const monthStart = startOfMonth(currentDate);
      if (day <= 15) {
        return { start: monthStart, end: setDate(monthStart, 15) };
      } else {
        return { start: setDate(monthStart, 16), end: lastDayOfMonth(monthStart) };
      }
    } else {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  }, [currentDate, period, payrollSettings.startDay]);

  const periodShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (!locationEmpIds.has(s.employeeId)) return false;
      const d = parseISO(s.start);
      return isWithinInterval(d, { start: periodRange.start, end: periodRange.end });
    });
  }, [shifts, locationEmpIds, periodRange]);

  const overtimeThreshold = period === 'biweekly' ? 80 : period === 'monthly' ? 160 : period === 'semimonthly' ? 80 : 40;

  const employeePayroll = useMemo(() => {
    return locationEmployees.map((emp) => {
      const empShifts = periodShifts.filter((s) => s.employeeId === emp.id);
      let totalHours = 0;
      empShifts.forEach((s) => { totalHours += getHoursWorked(s.start, s.end); });
      const regularHours = Math.min(totalHours, overtimeThreshold);
      const overtimeHours = Math.max(0, totalHours - regularHours);
      const regularPay = regularHours * emp.hourlyRate;
      const overtimePay = overtimeHours * emp.hourlyRate * 1.5;
      return { ...emp, totalHours, regularHours, overtimeHours, regularPay, overtimePay, totalPay: regularPay + overtimePay, shiftCount: empShifts.length };
    }).filter((e) => e.shiftCount > 0).sort((a, b) => b.totalPay - a.totalPay);
  }, [locationEmployees, periodShifts, overtimeThreshold]);

  const totals = useMemo(() => {
    let hours = 0, pay = 0;
    employeePayroll.forEach((e) => { hours += e.totalHours; pay += e.totalPay; });
    return { hours, pay };
  }, [employeePayroll]);

  function navigate(dir) {
    if (period === 'weekly') setCurrentDate((d) => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else if (period === 'biweekly') setCurrentDate((d) => dir > 0 ? addWeeks(d, 2) : subWeeks(d, 2));
    else if (period === 'semimonthly') {
      setCurrentDate((d) => {
        const day = d.getDate();
        if (dir > 0) {
          return day <= 15 ? setDate(d, 16) : setDate(addMonths(d, 1), 1);
        } else {
          return day > 15 ? setDate(d, 1) : setDate(subMonths(d, 1), 16);
        }
      });
    } else {
      setCurrentDate((d) => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    }
  }

  function handlePeriodChange(e) {
    dispatch({ type: 'UPDATE_PAYROLL_SETTINGS', payload: { period: e.target.value } });
  }

  return (
    <div className="payroll-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Review payroll by period</p>
        </div>
        <div className="payroll-period-select">
          <label className="form-label">Pay Period</label>
          <select className="form-input" value={period} onChange={handlePeriodChange}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="semimonthly">Semi-Monthly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      <div className="payroll-nav">
        <button className="btn btn--icon" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
        <span className="payroll-nav__label">
          {format(periodRange.start, 'MMM d, yyyy')} - {format(periodRange.end, 'MMM d, yyyy')}
        </span>
        <button className="btn btn--icon" onClick={() => navigate(1)}><ChevronRight size={18} /></button>
      </div>

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
                          <div className="payroll-emp__role">{emp.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>{emp.shiftCount}</td>
                    <td>{emp.regularHours}h</td>
                    <td>{emp.overtimeHours > 0 ? `${emp.overtimeHours}h` : '-'}</td>
                    <td>${emp.hourlyRate}/hr</td>
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
