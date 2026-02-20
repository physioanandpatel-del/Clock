import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, LogIn, LogOut, Search } from 'lucide-react';
import { format } from 'date-fns';
import { getInitials, formatTime, formatDuration } from '../utils/helpers';
import './TimeClock.css';

export default function TimeClock() {
  const { state, dispatch } = useApp();
  const { employees, timeEntries } = state;

  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const employeesWithStatus = useMemo(() => {
    return employees
      .map((emp) => {
        const activeEntry = timeEntries.find(
          (t) => t.employeeId === emp.id && t.status === 'active'
        );
        const todayEntries = timeEntries.filter(
          (t) =>
            t.employeeId === emp.id &&
            t.status === 'completed' &&
            new Date(t.clockIn).toDateString() === new Date().toDateString()
        );
        return {
          ...emp,
          activeEntry,
          todayEntries,
          isClockedIn: !!activeEntry,
        };
      })
      .filter(
        (emp) =>
          !search || emp.name.toLowerCase().includes(search.toLowerCase())
      );
  }, [employees, timeEntries, search]);

  function handleClockIn(employeeId) {
    dispatch({ type: 'CLOCK_IN', payload: { employeeId } });
  }

  function handleClockOut(entryId) {
    dispatch({ type: 'CLOCK_OUT', payload: entryId });
  }

  const activeCount = employeesWithStatus.filter((e) => e.isClockedIn).length;

  return (
    <div className="timeclock-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Time Clock</h1>
          <p className="page-subtitle">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      <div className="timeclock-display">
        <Clock size={32} className="timeclock-display__icon" />
        <div className="timeclock-display__time">
          {format(currentTime, 'h:mm:ss a')}
        </div>
        <div className="timeclock-display__status">
          <span className="badge badge--green">{activeCount} clocked in</span>
          <span className="badge badge--blue">{employees.length - activeCount} off</span>
        </div>
      </div>

      <div className="employees-toolbar">
        <div className="search-box">
          <Search size={16} className="search-box__icon" />
          <input
            type="text"
            className="search-box__input"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="timeclock-list">
        {employeesWithStatus.map((emp) => (
          <div key={emp.id} className={`timeclock-card ${emp.isClockedIn ? 'timeclock-card--active' : ''}`}>
            <div className="timeclock-card__main">
              <div className="timeclock-card__avatar" style={{ background: emp.color }}>
                {getInitials(emp.name)}
              </div>
              <div className="timeclock-card__info">
                <div className="timeclock-card__name">{emp.name}</div>
                <div className="timeclock-card__role">{emp.role}</div>
                {emp.isClockedIn && (
                  <div className="timeclock-card__time">
                    Clocked in at {formatTime(emp.activeEntry.clockIn)}
                  </div>
                )}
              </div>
              <div className="timeclock-card__action">
                {emp.isClockedIn ? (
                  <button
                    className="clock-btn clock-btn--out"
                    onClick={() => handleClockOut(emp.activeEntry.id)}
                  >
                    <LogOut size={18} />
                    Clock Out
                  </button>
                ) : (
                  <button
                    className="clock-btn clock-btn--in"
                    onClick={() => handleClockIn(emp.id)}
                  >
                    <LogIn size={18} />
                    Clock In
                  </button>
                )}
              </div>
            </div>
            {emp.todayEntries.length > 0 && (
              <div className="timeclock-card__history">
                <span className="timeclock-card__history-label">Today's entries:</span>
                {emp.todayEntries.map((entry) => (
                  <span key={entry.id} className="timeclock-card__history-entry">
                    {formatTime(entry.clockIn)} - {formatTime(entry.clockOut)} ({formatDuration(entry.clockIn, entry.clockOut)})
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
