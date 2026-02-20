import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Clock, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';
import './Sidebar.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/time-clock', icon: Clock, label: 'Time Clock' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

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

        <nav className="sidebar__nav">
          {navItems.map((item) => (
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
          ))}
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
