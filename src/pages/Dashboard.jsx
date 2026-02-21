import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Clock, DollarSign, CalendarDays, TrendingUp, AlertCircle, Target, MapPin } from 'lucide-react';
import { format, isToday, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { formatTime, formatDuration, getInitials, calculateLaborCost } from '../utils/helpers';
import './Dashboard.css';

export default function Dashboard() {
  const { state } = useApp();
  const { employees, shifts, timeEntries, locations, currentLocationId, salesEntries, absences } = state;

  const currentLocation = locations.find((l) => l.id === currentLocationId);
  const locationEmployees = useMemo(() => employees.filter((e) => e.locationId === currentLocationId), [employees, currentLocationId]);
  const locationEmpIds = useMemo(() => new Set(locationEmployees.map((e) => e.id)), [locationEmployees]);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const stats = useMemo(() => {
    const locShifts = shifts.filter((s) => locationEmpIds.has(s.employeeId));
    const todayShifts = locShifts.filter((s) => isToday(parseISO(s.start)));
    const weekShifts = locShifts.filter((s) => {
      const d = parseISO(s.start);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
    const activeClockIns = timeEntries.filter((t) => t.status === 'active' && locationEmpIds.has(t.employeeId));
    const weekLabor = calculateLaborCost(weekShifts, locationEmployees);
    const weekSales = salesEntries
      .filter((s) => s.locationId === currentLocationId)
      .filter((s) => { const d = parseISO(s.date); return isWithinInterval(d, { start: weekStart, end: weekEnd }); })
      .reduce((sum, s) => sum + s.amount, 0);
    const laborPercent = weekSales > 0 ? (weekLabor / weekSales) * 100 : 0;
    const pendingAbsences = absences.filter((a) => a.status === 'pending' && locationEmpIds.has(a.employeeId));

    return {
      totalEmployees: locationEmployees.length,
      todayShifts: todayShifts.length,
      activeClockIns: activeClockIns.length,
      weeklyLabor: weekLabor,
      weekShiftsCount: weekShifts.length,
      weekSales,
      laborPercent,
      pendingAbsences: pendingAbsences.length,
    };
  }, [locationEmployees, locationEmpIds, shifts, timeEntries, salesEntries, absences, currentLocationId, weekStart, weekEnd]);

  const todayShifts = useMemo(
    () =>
      shifts
        .filter((s) => locationEmpIds.has(s.employeeId) && isToday(parseISO(s.start)))
        .map((s) => ({ ...s, employee: locationEmployees.find((e) => e.id === s.employeeId) }))
        .sort((a, b) => new Date(a.start) - new Date(b.start)),
    [shifts, locationEmployees, locationEmpIds]
  );

  const activeEntries = useMemo(
    () =>
      timeEntries
        .filter((t) => t.status === 'active' && locationEmpIds.has(t.employeeId))
        .map((t) => ({ ...t, employee: locationEmployees.find((e) => e.id === t.employeeId) })),
    [timeEntries, locationEmployees, locationEmpIds]
  );

  const targetPercent = currentLocation?.targetLaborPercent || 30;
  const isOverTarget = stats.laborPercent > targetPercent + 2;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {currentLocation?.name} &middot; {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue"><Users size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Employees</span>
            <span className="stat-card__value">{stats.totalEmployees}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green"><CalendarDays size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Today's Shifts</span>
            <span className="stat-card__value">{stats.todayShifts}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--orange"><Clock size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Clocked In</span>
            <span className="stat-card__value">{stats.activeClockIns}</span>
          </div>
        </div>
        <div className={`stat-card ${isOverTarget && stats.weekSales > 0 ? 'stat-card--danger' : ''}`}>
          <div className={`stat-card__icon ${isOverTarget && stats.weekSales > 0 ? 'stat-card__icon--red' : 'stat-card__icon--purple'}`}>
            <Target size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__label">Labour %</span>
            <span className="stat-card__value">{stats.laborPercent > 0 ? `${stats.laborPercent.toFixed(1)}%` : '--'}</span>
          </div>
        </div>
      </div>

      <div className="dashboard__grid">
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><CalendarDays size={18} /> Today's Schedule</h2>
            <span className="badge badge--blue">{todayShifts.length} shifts</span>
          </div>
          <div className="card__body">
            {todayShifts.length === 0 ? (
              <div className="empty-state"><CalendarDays size={40} className="empty-state__icon" /><p>No shifts scheduled for today</p></div>
            ) : (
              <div className="shift-list">
                {todayShifts.map((shift) => (
                  <div key={shift.id} className="shift-item">
                    <div className="shift-item__avatar" style={{ background: shift.employee?.color || '#94a3b8' }}>
                      {shift.employee ? getInitials(shift.employee.name) : '?'}
                    </div>
                    <div className="shift-item__info">
                      <div className="shift-item__name">{shift.employee?.name || 'Unassigned'}</div>
                      <div className="shift-item__meta">{shift.position} &middot; {formatTime(shift.start)} - {formatTime(shift.end)}</div>
                    </div>
                    <div className="shift-item__duration">{formatDuration(shift.start, shift.end)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><Clock size={18} /> Currently Clocked In</h2>
            <span className="badge badge--green">{activeEntries.length} active</span>
          </div>
          <div className="card__body">
            {activeEntries.length === 0 ? (
              <div className="empty-state"><Clock size={40} className="empty-state__icon" /><p>No one is currently clocked in</p></div>
            ) : (
              <div className="shift-list">
                {activeEntries.map((entry) => (
                  <div key={entry.id} className="shift-item">
                    <div className="shift-item__avatar" style={{ background: entry.employee?.color || '#94a3b8' }}>
                      {entry.employee ? getInitials(entry.employee.name) : '?'}
                    </div>
                    <div className="shift-item__info">
                      <div className="shift-item__name">{entry.employee?.name || 'Unknown'}</div>
                      <div className="shift-item__meta">Clocked in at {formatTime(entry.clockIn)}</div>
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
            <h2 className="card__title"><TrendingUp size={18} /> Weekly Overview</h2>
          </div>
          <div className="card__body">
            <div className="weekly-stats">
              <div className="weekly-stat">
                <span className="weekly-stat__value">{stats.weekShiftsCount}</span>
                <span className="weekly-stat__label">Scheduled Shifts</span>
              </div>
              <div className="weekly-stat">
                <span className="weekly-stat__value">${stats.weeklyLabor.toLocaleString()}</span>
                <span className="weekly-stat__label">Labour Cost</span>
              </div>
              <div className="weekly-stat">
                <span className="weekly-stat__value">${stats.weekSales.toLocaleString()}</span>
                <span className="weekly-stat__label">Weekly Sales</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><AlertCircle size={18} /> Quick Actions</h2>
            {stats.pendingAbsences > 0 && <span className="badge badge--pending">{stats.pendingAbsences} pending</span>}
          </div>
          <div className="card__body">
            <div className="quick-actions">
              <a href="/schedule" className="quick-action-btn"><CalendarDays size={18} /> Create Schedule</a>
              <a href="/employees" className="quick-action-btn"><Users size={18} /> Add Employee</a>
              <a href="/time-clock" className="quick-action-btn"><Clock size={18} /> Time Clock</a>
              <a href="/labour" className="quick-action-btn"><TrendingUp size={18} /> Labour & Forecasting</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
