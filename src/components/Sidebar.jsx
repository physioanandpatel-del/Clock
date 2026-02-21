import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Clock, Settings, Menu, X, MapPin, CalendarOff, DollarSign, TrendingUp, MessageSquare, ListTodo, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import './Sidebar.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/time-clock', icon: Clock, label: 'Time Clock' },
  { type: 'divider' },
  { to: '/locations', icon: MapPin, label: 'Locations' },
  { to: '/absences', icon: CalendarOff, label: 'Absences' },
  { to: '/payroll', icon: DollarSign, label: 'Payroll' },
  { to: '/labour', icon: TrendingUp, label: 'Labour' },
  { type: 'divider' },
  { to: '/newsfeed', icon: MessageSquare, label: 'Newsfeed' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { type: 'divider' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state, dispatch } = useApp();
  const { locations, currentLocationId } = state;
  const currentLocation = locations.find((l) => l.id === currentLocationId);

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <Clock size={28} className="sidebar__logo" />
          <span className="sidebar__title">Clock</span>
        </div>

        {locations.length > 1 && (
          <div className="sidebar__location-switch">
            <select
              className="sidebar__location-select"
              value={currentLocationId}
              onChange={(e) => dispatch({ type: 'SET_LOCATION', payload: e.target.value })}
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        )}

        {locations.length === 1 && currentLocation && (
          <div className="sidebar__location-label">
            <MapPin size={14} />
            <span>{currentLocation.name}</span>
          </div>
        )}

        <nav className="sidebar__nav">
          {navItems.map((item, i) =>
            item.type === 'divider' ? (
              <div key={`div-${i}`} className="sidebar__divider" />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">SJ</div>
            <div>
              <div className="sidebar__user-name">Sarah Johnson</div>
              <div className="sidebar__user-role">Manager</div>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && <div className="sidebar__overlay" onClick={() => setMobileOpen(false)} />}
    </>
  );
}
