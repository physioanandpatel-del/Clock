import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Clock, Settings, Menu, X, MapPin, CalendarOff, DollarSign, TrendingUp, MessageSquare, ListTodo, BarChart3, Building2, FileText, CreditCard, Mail, ClipboardCheck, HandMetal, CalendarDays, Shield, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { useApp, hasAccess, ACCESS_LABELS } from '../context/AppContext';
import { getInitials } from '../utils/helpers';
import './Sidebar.css';

// minAccess: minimum access level to see this nav item
const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', minAccess: 'employee' },
  { to: '/schedule', icon: Calendar, label: 'Schedule', minAccess: 'employee' },
  { to: '/open-shifts', icon: HandMetal, label: 'Open Shifts', minAccess: 'employee' },
  { to: '/employees', icon: Users, label: 'Employees', minAccess: 'manager' },
  { to: '/time-clock', icon: Clock, label: 'Time Clock', minAccess: 'employee' },
  { to: '/timesheets', icon: ClipboardCheck, label: 'Timesheets', minAccess: 'employee' },
  { type: 'divider', minAccess: 'employee' },
  { to: '/absences', icon: CalendarOff, label: 'Absences', minAccess: 'employee' },
  { to: '/vacation-calendar', icon: CalendarDays, label: 'Vacation Calendar', minAccess: 'employee' },
  { to: '/locations', icon: MapPin, label: 'Locations', minAccess: 'location_admin' },
  { to: '/payroll', icon: DollarSign, label: 'Payroll', minAccess: 'location_admin' },
  { to: '/labour', icon: TrendingUp, label: 'Labour', minAccess: 'manager' },
  { type: 'divider', minAccess: 'employee' },
  { to: '/newsfeed', icon: MessageSquare, label: 'Newsfeed', minAccess: 'employee' },
  { to: '/messages', icon: Mail, label: 'Messages', minAccess: 'employee' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks', minAccess: 'employee' },
  { to: '/reports', icon: BarChart3, label: 'Reports', minAccess: 'manager' },
  { type: 'divider', minAccess: 'manager' },
  { to: '/customers', icon: Building2, label: 'Customers', minAccess: 'manager' },
  { to: '/billing', icon: FileText, label: 'Billing', minAccess: 'location_admin' },
  { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions', minAccess: 'location_admin' },
  { to: '/documents', icon: FolderOpen, label: 'Documents', minAccess: 'manager' },
  { type: 'divider', minAccess: 'master_admin' },
  { to: '/audit-log', icon: Shield, label: 'Audit Log', minAccess: 'master_admin' },
  { to: '/settings', icon: Settings, label: 'Settings', minAccess: 'master_admin' },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state, dispatch } = useApp();
  const { locations, currentLocationId, employees, currentUserId } = state;
  const currentLocation = locations.find((l) => l.id === currentLocationId);
  const currentUser = employees.find((e) => e.id === currentUserId);
  const userAccess = currentUser?.accessLevel || 'employee';

  const visibleNav = navItems.filter((item) => hasAccess(userAccess, item.minAccess));

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
          {visibleNav.map((item, i) =>
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
          <div className="sidebar__user-switch">
            <select
              className="sidebar__user-select"
              value={currentUserId || ''}
              onChange={(e) => dispatch({ type: 'SET_CURRENT_USER', payload: e.target.value })}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({ACCESS_LABELS[emp.accessLevel || 'employee']})
                </option>
              ))}
            </select>
          </div>
          {currentUser && (
            <div className="sidebar__user">
              <div className="sidebar__avatar" style={{ background: currentUser.color }}>
                {getInitials(currentUser.name)}
              </div>
              <div>
                <div className="sidebar__user-name">{currentUser.name}</div>
                <div className="sidebar__user-role">{ACCESS_LABELS[userAccess]}</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && <div className="sidebar__overlay" onClick={() => setMobileOpen(false)} />}
    </>
  );
}
