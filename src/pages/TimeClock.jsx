import { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, LogIn, LogOut, Search, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getInitials, formatTime, formatDuration } from '../utils/helpers';
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
  const { employees, timeEntries, currentLocationId, locations } = state;
  const locationEmployees = employees.filter((e) => e.locationId === currentLocationId);
  const currentLocation = locations.find((l) => l.id === currentLocationId);

  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userPosition, setUserPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

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

  const employeesWithStatus = useMemo(() => {
    return locationEmployees
      .map((emp) => {
        const activeEntry = timeEntries.find((t) => t.employeeId === emp.id && t.status === 'active');
        const todayEntries = timeEntries.filter((t) => t.employeeId === emp.id && t.status === 'completed' && new Date(t.clockIn).toDateString() === new Date().toDateString());
        return { ...emp, activeEntry, todayEntries, isClockedIn: !!activeEntry };
      })
      .filter((emp) => !search || emp.name.toLowerCase().includes(search.toLowerCase()));
  }, [locationEmployees, timeEntries, search]);

  function handleClockIn(employeeId) {
    let geofenceStatus = 'unknown';
    if (hasGeofence) {
      geofenceStatus = isInsideGeofence === true ? 'inside' : isInsideGeofence === false ? 'outside' : 'unknown';
    }
    dispatch({ type: 'CLOCK_IN', payload: { employeeId, geofenceStatus } });
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
        <div className="timeclock-display__time">{format(currentTime, 'h:mm:ss a')}</div>
        <div className="timeclock-display__status">
          <span className="badge badge--green">{activeCount} clocked in</span>
          <span className="badge badge--blue">{locationEmployees.length - activeCount} off</span>
        </div>
      </div>

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
                <div className="timeclock-card__role">{emp.role}</div>
                {emp.isClockedIn && (
                  <div className="timeclock-card__time">
                    Clocked in at {formatTime(emp.activeEntry.clockIn)}
                    {emp.activeEntry.geofenceStatus === 'outside' && <span className="geofence-flag"> (outside geofence)</span>}
                    {emp.activeEntry.geofenceStatus === 'inside' && <span className="geofence-ok"> (verified)</span>}
                  </div>
                )}
              </div>
              <div className="timeclock-card__action">
                {emp.isClockedIn ? (
                  <button className="clock-btn clock-btn--out" onClick={() => handleClockOut(emp.activeEntry.id)}><LogOut size={18} /> Clock Out</button>
                ) : (
                  <button className="clock-btn clock-btn--in" onClick={() => handleClockIn(emp.id)}><LogIn size={18} /> Clock In</button>
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
    </div>
  );
}
