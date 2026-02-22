import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Palmtree, ThermometerSun, User2, CalendarDays } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getInitials } from '../utils/helpers';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isWithinInterval, parseISO, getDay, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';
import './VacationCalendar.css';

const TYPE_COLORS = {
  vacation: { bg: '#dbeafe', border: '#2563eb', text: '#1d4ed8' },
  sick: { bg: '#fee2e2', border: '#ef4444', text: '#dc2626' },
  personal: { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' },
  other: { bg: '#f1f5f9', border: '#64748b', text: '#475569' },
};

export default function VacationCalendar() {
  const { state } = useApp();
  const { employees, absences, currentLocationId } = state;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const locationEmployees = employees.filter((e) => e.locationIds?.includes(currentLocationId));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const filteredAbsences = useMemo(() => {
    const locEmpIds = locationEmployees.map((e) => e.id);
    return (absences || []).filter((a) => {
      if (!locEmpIds.includes(a.employeeId)) return false;
      if (a.status === 'denied') return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      return true;
    });
  }, [absences, locationEmployees, typeFilter]);

  const getAbsencesForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return filteredAbsences.filter((a) => {
      try {
        const start = parseISO(a.startDate);
        const end = parseISO(a.endDate);
        return isWithinInterval(day, { start, end });
      } catch { return false; }
    });
  };

  const selectedDayAbsences = selectedDay ? getAbsencesForDay(selectedDay) : [];

  const stats = useMemo(() => {
    const monthAbsences = filteredAbsences.filter((a) => {
      try {
        const start = parseISO(a.startDate);
        const end = parseISO(a.endDate);
        return (start <= monthEnd && end >= monthStart);
      } catch { return false; }
    });
    return {
      total: monthAbsences.length,
      vacation: monthAbsences.filter((a) => a.type === 'vacation').length,
      sick: monthAbsences.filter((a) => a.type === 'sick').length,
      personal: monthAbsences.filter((a) => a.type === 'personal').length,
      pending: monthAbsences.filter((a) => a.status === 'pending').length,
    };
  }, [filteredAbsences, monthStart, monthEnd]);

  return (
    <div className="vacation-cal-page">
      <div className="vacation-cal-header">
        <div className="vacation-cal-nav">
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={16} /></button>
          <h2 className="vacation-cal-title">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={16} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(new Date())}>Today</button>
        </div>
        <div className="vacation-cal-filters">
          {['all', 'vacation', 'sick', 'personal'].map((t) => (
            <button key={t} className={`filter-btn ${typeFilter === t ? 'filter-btn--active' : ''}`} onClick={() => setTypeFilter(t)}>
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="vacation-cal-stats">
        <div className="vc-stat"><CalendarDays size={16} /> <span>{stats.total} time-off requests</span></div>
        <div className="vc-stat" style={{ color: TYPE_COLORS.vacation.text }}><Palmtree size={16} /> {stats.vacation} vacation</div>
        <div className="vc-stat" style={{ color: TYPE_COLORS.sick.text }}><ThermometerSun size={16} /> {stats.sick} sick</div>
        <div className="vc-stat" style={{ color: TYPE_COLORS.personal.text }}><User2 size={16} /> {stats.personal} personal</div>
        {stats.pending > 0 && <div className="vc-stat vc-stat--pending">{stats.pending} pending approval</div>}
      </div>

      <div className="vacation-cal-layout">
        <div className="vacation-cal-grid-wrap">
          <div className="vacation-cal-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="vc-day-header">{d}</div>
            ))}
            {calDays.map((day) => {
              const dayAbsences = getAbsencesForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const selected = selectedDay && isSameDay(day, selectedDay);
              return (
                <div key={day.toISOString()} className={`vc-day ${!inMonth ? 'vc-day--out' : ''} ${today ? 'vc-day--today' : ''} ${selected ? 'vc-day--selected' : ''} ${dayAbsences.length > 0 ? 'vc-day--has-absences' : ''}`} onClick={() => setSelectedDay(day)}>
                  <div className="vc-day__number">{format(day, 'd')}</div>
                  <div className="vc-day__absences">
                    {dayAbsences.slice(0, 3).map((a) => {
                      const emp = employees.find((e) => e.id === a.employeeId);
                      const tc = TYPE_COLORS[a.type] || TYPE_COLORS.other;
                      return (
                        <div key={a.id} className="vc-absence-chip" style={{ background: tc.bg, color: tc.text, borderLeft: `3px solid ${tc.border}` }}>
                          {emp?.name?.split(' ')[0] || '?'}
                          {a.status === 'pending' && <span className="vc-pending-dot" />}
                        </div>
                      );
                    })}
                    {dayAbsences.length > 3 && <div className="vc-more">+{dayAbsences.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="vacation-cal-detail">
          {selectedDay ? (
            <>
              <h4>{format(selectedDay, 'EEEE, MMMM d, yyyy')}</h4>
              {selectedDayAbsences.length === 0 ? (
                <p className="text-secondary vc-detail-empty">No time off scheduled</p>
              ) : (
                <div className="vc-detail-list">
                  {selectedDayAbsences.map((a) => {
                    const emp = employees.find((e) => e.id === a.employeeId);
                    const tc = TYPE_COLORS[a.type] || TYPE_COLORS.other;
                    return (
                      <div key={a.id} className="vc-detail-item" style={{ borderLeft: `3px solid ${tc.border}` }}>
                        <div className="vc-detail-item__header">
                          <div className="vc-detail-avatar" style={{ background: emp?.color || '#ccc' }}>{emp ? getInitials(emp.name) : '?'}</div>
                          <div>
                            <div className="vc-detail-name">{emp?.name || 'Unknown'}</div>
                            <div className="vc-detail-roles">{emp?.roles?.join(', ')}</div>
                          </div>
                        </div>
                        <div className="vc-detail-meta">
                          <span className="vc-type-badge" style={{ background: tc.bg, color: tc.text }}>{a.type}</span>
                          <span className={`vc-status-badge vc-status-badge--${a.status}`}>{a.status}</span>
                        </div>
                        <div className="vc-detail-dates">{a.startDate} to {a.endDate}</div>
                        {a.notes && <div className="vc-detail-notes">{a.notes}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="vc-detail-empty">
              <CalendarDays size={32} />
              <p>Click a day to see details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
