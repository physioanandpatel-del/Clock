import { useLocation, Link } from 'react-router-dom';
import { Bell, Search, ChevronRight, CalendarOff, ListTodo } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getInitials } from '../utils/helpers';
import './TopHeader.css';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/schedule': 'Schedule',
  '/employees': 'Employees',
  '/time-clock': 'Time Clock',
  '/locations': 'Locations',
  '/absences': 'Absences',
  '/payroll': 'Payroll',
  '/labour': 'Labour & Forecasting',
  '/newsfeed': 'Newsfeed',
  '/tasks': 'Tasks',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function TopHeader() {
  const location = useLocation();
  const { state } = useApp();
  const { employees, currentUserId, absences, tasks } = state;
  const currentUser = employees.find((e) => e.id === currentUserId);
  const [showNotifs, setShowNotifs] = useState(false);

  const pageTitle = PAGE_TITLES[location.pathname] || 'Page';

  const notifications = useMemo(() => {
    const notifs = [];
    const pending = absences.filter((a) => a.status === 'pending');
    if (pending.length > 0) {
      notifs.push({
        id: 'absences',
        icon: CalendarOff,
        text: `${pending.length} pending absence request${pending.length > 1 ? 's' : ''}`,
        link: '/absences',
        color: 'var(--warning)',
      });
    }
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    if (pendingTasks.length > 0) {
      notifs.push({
        id: 'tasks',
        icon: ListTodo,
        text: `${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}`,
        link: '/tasks',
        color: 'var(--primary)',
      });
    }
    return notifs;
  }, [absences, tasks]);

  const totalNotifs = notifications.reduce((sum, n) => {
    if (n.id === 'absences') return sum + absences.filter((a) => a.status === 'pending').length;
    if (n.id === 'tasks') return sum + tasks.filter((t) => t.status === 'pending').length;
    return sum;
  }, 0);

  return (
    <header className="top-header">
      <div className="top-header__left">
        <nav className="top-header__breadcrumb">
          <Link to="/" className="top-header__breadcrumb-link">Home</Link>
          {location.pathname !== '/' && (
            <>
              <ChevronRight size={14} className="top-header__breadcrumb-sep" />
              <span className="top-header__breadcrumb-current">{pageTitle}</span>
            </>
          )}
        </nav>
        <h1 className="top-header__title">{pageTitle}</h1>
      </div>

      <div className="top-header__right">
        <div className="top-header__notif-wrap">
          <button
            className="top-header__icon-btn"
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {totalNotifs > 0 && <span className="top-header__badge">{totalNotifs}</span>}
          </button>
          {showNotifs && (
            <>
              <div className="top-header__notif-overlay" onClick={() => setShowNotifs(false)} />
              <div className="top-header__notif-dropdown">
                <div className="top-header__notif-title">Notifications</div>
                {notifications.length === 0 ? (
                  <div className="top-header__notif-empty">All caught up!</div>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      to={n.link}
                      className="top-header__notif-item"
                      onClick={() => setShowNotifs(false)}
                    >
                      <n.icon size={16} style={{ color: n.color, flexShrink: 0 }} />
                      <span>{n.text}</span>
                    </Link>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        {currentUser && (
          <div className="top-header__user">
            <div className="top-header__avatar" style={{ background: currentUser.color }}>
              {getInitials(currentUser.name)}
            </div>
            <span className="top-header__user-name">{currentUser.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
