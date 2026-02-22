import { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, LogIn, LogOut, Search, MapPin, AlertTriangle, CheckCircle, Settings, X } from 'lucide-react';
import { format, parseISO, differenceInMinutes, isSameDay } from 'date-fns';
import { getInitials, formatTime, formatDuration } from '../utils/helpers';
import { hasAccess } from '../context/AppContext';
import './TimeClock.css';

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TimeClock() {
  const { state, dispatch } = useApp();
  const { employees, timeEntries, shifts, currentLocationId, locations, currentUserId } = state;
  const locationEmployees = employees.filter((e) => (e.locationIds || [e.locationId]).includes(currentLocationId));
  const currentLocation = locations.find((l) => l.id === currentLocationId);
  const currentUser = employees.find((e) => e.id === currentUserId);
  const isManager = hasAccess(currentUser?.accessLevel || 'employee', 'manager');

  const clockRules = currentLocation?.clockRules || { earlyClockInBuffer: 15, lateClockOutBuffer: 15, restrictEarlyClockIn: false, autoClockOut: false, autoClockOutBuffer: 30 };

  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userPosition, setUserPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showClockRules, setShowClockRules] = useState(false);
  const [clockInError, setClockInError] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hasGeofence = currentLocation?.lat && currentLocation?.lng && currentLocation?.geofenceRadius;

  const refreshPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoError(null); setGeoLoading(false); },
      (err) => { setGeoError(err.message); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (hasGeofence) refreshPosition();
  }, [hasGeofence, refreshPosition]);

  const isInsideGeofence = useMemo(() => {
    if (!hasGeofence || !userPosition) return null;
    const dist = getDistance(userPosition.lat, userPosition.lng, currentLocation.lat, currentLocation.lng);
    return dist <= currentLocation.geofenceRadius;
  }, [hasGeofence, userPosition, currentLocation]);

  // Auto clock-out: check active entries for auto clock-out
  useEffect(() => {
    if (!clockRules.autoClockOut) return;
    const now = new Date();
    const empIds = locationEmployees.map((e) => e.id);
    const activeEntries = timeEntries.filter((t) => t.status === 'active' && empIds.includes(t.employeeId));

    activeEntries.forEach((entry) => {
      const emp = locationEmployees.find((e) => e.id === entry.employeeId);
      if (!emp) return;
      // Find the employee's scheduled shift for today
      const todayShifts = shifts.filter((s) => s.employeeId === entry.employeeId && isSameDay(parseISO(s.start), now));
      if (todayShifts.length === 0) return;
      // Use the last shift end time
      const lastShift = todayShifts.sort((a, b) => new Date(b.end) - new Date(a.end))[0];
      const shiftEnd = parseISO(lastShift.end);
      const minutesPastEnd = differenceInMinutes(now, shiftEnd);
      if (minutesPastEnd >= clockRules.autoClockOutBuffer) {
        dispatch({ type: 'CLOCK_OUT', payload: entry.id });
      }
    });
  }, [currentTime, clockRules, timeEntries, shifts, locationEmployees, dispatch]);

  // Check clock-in eligibility for an employee
  function getClockInStatus(empId) {
    if (!clockRules.restrictEarlyClockIn) return { allowed: true };
    const now = new Date();
    const todayShifts = shifts.filter((s) => s.employeeId === empId && isSameDay(parseISO(s.start), now));
    if (todayShifts.length === 0) return { allowed: true, note: 'No shift scheduled' };

    // Find the next upcoming shift
    const upcomingShifts = todayShifts.filter((s) => parseISO(s.start) > now).sort((a, b) => new Date(a.start) - new Date(b.start));
    // Or currently active shift
    const activeShift = todayShifts.find((s) => parseISO(s.start) <= now && parseISO(s.end) > now);

    if (activeShift) return { allowed: true, note: 'Shift in progress' };

    if (upcomingShifts.length > 0) {
      const nextShift = upcomingShifts[0];
      const minutesBefore = differenceInMinutes(parseISO(nextShift.start), now);
      if (minutesBefore > clockRules.earlyClockInBuffer) {
        return {
          allowed: false,
          note: `Too early. Shift starts at ${formatTime(nextShift.start)}. Can clock in ${clockRules.earlyClockInBuffer} min before.`,
        };
      }
      return { allowed: true, note: `Shift starts at ${formatTime(nextShift.start)}` };
    }

    // All shifts have ended
    return { allowed: true, note: 'All shifts ended' };
  }

  const employeesWithStatus = useMemo(() => {
    return locationEmployees
      .map((emp) => {
        const activeEntry = timeEntries.find((t) => t.employeeId === emp.id && t.status === 'active');
        const todayEntries = timeEntries.filter((t) => t.employeeId === emp.id && t.status === 'completed' && new Date(t.clockIn).toDateString() === new Date().toDateString());
        const clockInStatus = getClockInStatus(emp.id);
        return { ...emp, activeEntry, todayEntries, isClockedIn: !!activeEntry, clockInStatus };
      })
      .filter((emp) => !search || emp.name.toLowerCase().includes(search.toLowerCase()));
  }, [locationEmployees, timeEntries, search, shifts, clockRules]);

  function handleClockIn(employeeId) {
    const status = getClockInStatus(employeeId);
    if (!status.allowed) {
      setClockInError(status.note);
      setTimeout(() => setClockInError(null), 4000);
      return;
    }
    let geofenceStatus = 'unknown';
    if (hasGeofence) {
      geofenceStatus = isInsideGeofence === true ? 'inside' : isInsideGeofence === false ? 'outside' : 'unknown';
    }
    dispatch({ type: 'CLOCK_IN', payload: { employeeId, geofenceStatus } });
  }

  function handleClockOut(entryId) {
    dispatch({ type: 'CLOCK_OUT', payload: entryId });
  }

  function updateClockRules(updates) {
    dispatch({
      type: 'UPDATE_LOCATION',
      payload: { id: currentLocationId, clockRules: { ...clockRules, ...updates } },
    });
  }

  const activeCount = employeesWithStatus.filter((e) => e.isClockedIn).length;

  return (
    <div className="timeclock-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Time Clock</h1>
          <p className="page-subtitle">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        {isManager && (
          <button className="btn btn--secondary" onClick={() => setShowClockRules(true)}>
            <Settings size={16} /> Clock Rules
          </button>
        )}
      </div>

      <div className="timeclock-display">
        <Clock size={32} className="timeclock-display__icon" />
        <div className="timeclock-display__time">{format(currentTime, 'h:mm:ss a')}</div>
        <div className="timeclock-display__status">
          <span className="badge badge--green">{activeCount} clocked in</span>
          <span className="badge badge--blue">{locationEmployees.length - activeCount} off</span>
        </div>
      </div>

      {/* Clock-in error toast */}
      {clockInError && (
        <div className="clock-error-toast">
          <AlertTriangle size={14} /> {clockInError}
        </div>
      )}

      {/* Clock Rules Summary Bar */}
      {(clockRules.restrictEarlyClockIn || clockRules.autoClockOut) && (
        <div className="clock-rules-bar">
          {clockRules.restrictEarlyClockIn && (
            <span className="clock-rule-badge">Early clock-in: {clockRules.earlyClockInBuffer}min buffer</span>
          )}
          {clockRules.autoClockOut && (
            <span className="clock-rule-badge">Auto clock-out: {clockRules.autoClockOutBuffer}min after shift</span>
          )}
        </div>
      )}

      {/* Geofence Status */}
      {hasGeofence && (
        <div className={`geofence-status ${isInsideGeofence === true ? 'geofence-status--inside' : isInsideGeofence === false ? 'geofence-status--outside' : 'geofence-status--unknown'}`}>
          <div className="geofence-status__icon">
            {isInsideGeofence === true ? <CheckCircle size={20} /> : isInsideGeofence === false ? <AlertTriangle size={20} /> : <MapPin size={20} />}
          </div>
          <div className="geofence-status__info">
            <div className="geofence-status__title">
              {isInsideGeofence === true ? 'Inside Geofence' : isInsideGeofence === false ? 'Outside Geofence' : geoLoading ? 'Getting location...' : 'Location Unknown'}
            </div>
            <div className="geofence-status__detail">
              <MapPin size={12} /> {currentLocation.name} ({currentLocation.geofenceRadius}m radius)
              {isInsideGeofence === false && ' - Clock-ins will be flagged'}
            </div>
          </div>
          <button className="btn btn--secondary btn--sm" onClick={refreshPosition} disabled={geoLoading}>
            {geoLoading ? 'Locating...' : 'Refresh'}
          </button>
        </div>
      )}

      {geoError && hasGeofence && (
        <div className="geofence-error">
          <AlertTriangle size={14} /> {geoError}
        </div>
      )}

      <div className="employees-toolbar">
        <div className="search-box">
          <Search size={16} className="search-box__icon" />
          <input type="text" className="search-box__input" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="timeclock-list">
        {employeesWithStatus.map((emp) => (
          <div key={emp.id} className={`timeclock-card ${emp.isClockedIn ? 'timeclock-card--active' : ''}`}>
            <div className="timeclock-card__main">
              <div className="timeclock-card__avatar" style={{ background: emp.color }}>{getInitials(emp.name)}</div>
              <div className="timeclock-card__info">
                <div className="timeclock-card__name">{emp.name}</div>
                <div className="timeclock-card__role">{(emp.roles || [emp.role]).join(', ')}</div>
                {emp.isClockedIn && (
                  <div className="timeclock-card__time">
                    Clocked in at {formatTime(emp.activeEntry.clockIn)}
                    {emp.activeEntry.geofenceStatus === 'outside' && <span className="geofence-flag"> (outside geofence)</span>}
                    {emp.activeEntry.geofenceStatus === 'inside' && <span className="geofence-ok"> (verified)</span>}
                  </div>
                )}
                {!emp.isClockedIn && emp.clockInStatus.note && clockRules.restrictEarlyClockIn && (
                  <div className={`timeclock-card__clock-note ${!emp.clockInStatus.allowed ? 'timeclock-card__clock-note--blocked' : ''}`}>
                    {emp.clockInStatus.note}
                  </div>
                )}
              </div>
              <div className="timeclock-card__action">
                {emp.isClockedIn ? (
                  <button className="clock-btn clock-btn--out" onClick={() => handleClockOut(emp.activeEntry.id)}><LogOut size={18} /> Clock Out</button>
                ) : (
                  <button
                    className={`clock-btn clock-btn--in ${!emp.clockInStatus.allowed ? 'clock-btn--disabled' : ''}`}
                    onClick={() => handleClockIn(emp.id)}
                    disabled={!emp.clockInStatus.allowed}
                    title={!emp.clockInStatus.allowed ? emp.clockInStatus.note : 'Clock In'}
                  >
                    <LogIn size={18} /> Clock In
                  </button>
                )}
              </div>
            </div>
            {emp.todayEntries.length > 0 && (
              <div className="timeclock-card__history">
                <span className="timeclock-card__history-label">Today's entries:</span>
                {emp.todayEntries.map((entry) => (
                  <span key={entry.id} className={`timeclock-card__history-entry ${entry.geofenceStatus === 'outside' ? 'timeclock-card__history-entry--flagged' : ''}`}>
                    {formatTime(entry.clockIn)} - {formatTime(entry.clockOut)} ({formatDuration(entry.clockIn, entry.clockOut)})
                    {entry.geofenceStatus === 'outside' && ' !'}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Clock Rules Settings Modal */}
      {showClockRules && (
        <div className="modal-overlay" onClick={() => setShowClockRules(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title"><Settings size={18} /> Clock Rules</h2>
              <button className="btn btn--icon" onClick={() => setShowClockRules(false)}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <p className="form-hint" style={{ margin: 0 }}>
                Configure clock-in/out rules for <strong>{currentLocation?.name}</strong>.
              </p>

              <div className="clock-rule-setting">
                <label className="clock-rule-toggle">
                  <input type="checkbox" checked={clockRules.restrictEarlyClockIn} onChange={(e) => updateClockRules({ restrictEarlyClockIn: e.target.checked })} />
                  <span>Restrict early clock-in</span>
                </label>
                <p className="form-hint">Prevent employees from clocking in before their scheduled shift.</p>
                {clockRules.restrictEarlyClockIn && (
                  <div className="clock-rule-input">
                    <label>Allow clock-in</label>
                    <input type="number" className="form-input" min={0} max={120} value={clockRules.earlyClockInBuffer} onChange={(e) => updateClockRules({ earlyClockInBuffer: Math.max(0, parseInt(e.target.value) || 0) })} />
                    <span>minutes before shift</span>
                  </div>
                )}
              </div>

              <div className="clock-rule-setting">
                <label className="clock-rule-toggle">
                  <input type="checkbox" checked={clockRules.autoClockOut} onChange={(e) => updateClockRules({ autoClockOut: e.target.checked })} />
                  <span>Auto clock-out</span>
                </label>
                <p className="form-hint">Automatically clock out employees after their shift ends + buffer.</p>
                {clockRules.autoClockOut && (
                  <div className="clock-rule-input">
                    <label>Auto clock-out after</label>
                    <input type="number" className="form-input" min={5} max={240} value={clockRules.autoClockOutBuffer} onChange={(e) => updateClockRules({ autoClockOutBuffer: Math.max(5, parseInt(e.target.value) || 30) })} />
                    <span>minutes past shift end</span>
                  </div>
                )}
              </div>

              <div className="clock-rule-setting">
                <div className="clock-rule-input">
                  <label>Late clock-out buffer</label>
                  <input type="number" className="form-input" min={0} max={120} value={clockRules.lateClockOutBuffer} onChange={(e) => updateClockRules({ lateClockOutBuffer: Math.max(0, parseInt(e.target.value) || 0) })} />
                  <span>minutes (for timesheet flagging)</span>
                </div>
                <p className="form-hint">Clock-outs more than this buffer past shift end will be flagged in timesheets.</p>
              </div>
            </div>
            <div className="modal__footer">
              <div className="modal__footer-right">
                <button className="btn btn--secondary" onClick={() => setShowClockRules(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
