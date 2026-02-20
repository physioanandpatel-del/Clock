import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Clock, DollarSign, CalendarDays, TrendingUp, AlertCircle } from 'lucide-react';
import { format, isToday, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { formatTime, formatDuration, getInitials, calculateLaborCost } from '../utils/helpers';
import './Dashboard.css';

export default function Dashboard() {
  const { state } = useApp();
  const { employees, shifts, timeEntries } = state;

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const stats = useMemo(() => {
    const todayShifts = shifts.filter((s) => isToday(parseISO(s.start)));
    const weekShifts = shifts.filter((s) => {
      const d = parseISO(s.start);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
    const activeClockIns = timeEntries.filter((t) => t.status === 'active');
    const weekLabor = calculateLaborCost(weekShifts, employees);

    return {
      totalEmployees: employees.length,
      todayShifts: todayShifts.length,
      activeClockIns: activeClockIns.length,
      weeklyLabor: weekLabor,
      weekShiftsCount: weekShifts.length,
    };
  }, [employees, shifts, timeEntries, weekStart, weekEnd]);

  const todayShifts = useMemo(
    () =>
      shifts
        .filter((s) => isToday(parseISO(s.start)))
        .map((s) => ({
          ...s,
          employee: employees.find((e) => e.id === s.employeeId),
        }))
        .sort((a, b) => new Date(a.start) - new Date(b.start)),
    [shifts, employees]
  );

  const activeEntries = useMemo(
    () =>
      timeEntries
        .filter((t) => t.status === 'active')
        .map((t) => ({
          ...t,
          employee: employees.find((e) => e.id === t.employeeId),
        })),
    [timeEntries, employees]
  );

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">
            <Users size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__label">Total Employees</span>
            <span className="stat-card__value">{stats.totalEmployees}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <CalendarDays size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__label">Today's Shifts</span>
            <span className="stat-card__value">{stats.todayShifts}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--orange">
            <Clock size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__label">Clocked In</span>
            <span className="stat-card__value">{stats.activeClockIns}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <DollarSign size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__label">Weekly Labor</span>
            <span className="stat-card__value">${stats.weeklyLabor.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="dashboard__grid">
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">
              <CalendarDays size={18} />
              Today's Schedule
            </h2>
            <span className="badge badge--blue">{todayShifts.length} shifts</span>
          </div>
          <div className="card__body">
            {todayShifts.length === 0 ? (
              <div className="empty-state">
                <CalendarDays size={40} className="empty-state__icon" />
                <p>No shifts scheduled for today</p>
              </div>
            ) : (
              <div className="shift-list">
                {todayShifts.map((shift) => (
                  <div key={shift.id} className="shift-item">
                    <div
                      className="shift-item__avatar"
                      style={{ background: shift.employee?.color || '#94a3b8' }}
                    >
                      {shift.employee ? getInitials(shift.employee.name) : '?'}
                    </div>
                    <div className="shift-item__info">
                      <div className="shift-item__name">
                        {shift.employee?.name || 'Unassigned'}
                      </div>
                      <div className="shift-item__meta">
                        {shift.position} &middot; {formatTime(shift.start)} - {formatTime(shift.end)}
                      </div>
                    </div>
                    <div className="shift-item__duration">
                      {formatDuration(shift.start, shift.end)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h2 className="card__title">
              <Clock size={18} />
              Currently Clocked In
            </h2>
            <span className="badge badge--green">{activeEntries.length} active</span>
          </div>
          <div className="card__body">
            {activeEntries.length === 0 ? (
              <div className="empty-state">
                <Clock size={40} className="empty-state__icon" />
                <p>No one is currently clocked in</p>
              </div>
            ) : (
              <div className="shift-list">
                {activeEntries.map((entry) => (
                  <div key={entry.id} className="shift-item">
                    <div
                      className="shift-item__avatar"
                      style={{ background: entry.employee?.color || '#94a3b8' }}
                    >
                      {entry.employee ? getInitials(entry.employee.name) : '?'}
                    </div>
                    <div className="shift-item__info">
                      <div className="shift-item__name">
                        {entry.employee?.name || 'Unknown'}
                      </div>
                      <div className="shift-item__meta">
                        Clocked in at {formatTime(entry.clockIn)}
                      </div>
                    </div>
                    <span className="badge badge--green-dot">Active</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h2 className="card__title">
              <TrendingUp size={18} />
              Weekly Overview
            </h2>
          </div>
          <div className="card__body">
            <div className="weekly-stats">
              <div className="weekly-stat">
                <span className="weekly-stat__value">{stats.weekShiftsCount}</span>
                <span className="weekly-stat__label">Scheduled Shifts</span>
              </div>
              <div className="weekly-stat">
                <span className="weekly-stat__value">{employees.length}</span>
                <span className="weekly-stat__label">Active Staff</span>
              </div>
              <div className="weekly-stat">
                <span className="weekly-stat__value">${stats.weeklyLabor.toLocaleString()}</span>
                <span className="weekly-stat__label">Est. Labor Cost</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h2 className="card__title">
              <AlertCircle size={18} />
              Quick Actions
            </h2>
          </div>
          <div className="card__body">
            <div className="quick-actions">
              <a href="/schedule" className="quick-action-btn">
                <CalendarDays size={18} />
                Create Schedule
              </a>
              <a href="/employees" className="quick-action-btn">
                <Users size={18} />
                Add Employee
              </a>
              <a href="/time-clock" className="quick-action-btn">
                <Clock size={18} />
                Time Clock
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
