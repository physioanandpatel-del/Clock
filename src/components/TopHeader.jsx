import { useLocation, Link } from 'react-router-dom';
import { Bell, Search, ChevronRight, CalendarOff, ListTodo, Mail, ClipboardCheck, FileText, HandMetal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getInitials } from '../utils/helpers';
import './TopHeader.css';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/schedule': 'Schedule',
  '/open-shifts': 'Open Shifts',
  '/employees': 'Employees',
  '/time-clock': 'Time Clock',
  '/timesheets': 'Timesheets',
  '/locations': 'Locations',
  '/absences': 'Absences',
  '/vacation-calendar': 'Vacation Calendar',
  '/payroll': 'Payroll',
  '/labour': 'Labour & Forecasting',
  '/newsfeed': 'Newsfeed',
  '/messages': 'Messages',
  '/tasks': 'Tasks',
  '/reports': 'Reports',
  '/customers': 'Customers',
  '/billing': 'Billing & Invoicing',
  '/subscriptions': 'Subscriptions',
  '/documents': 'Documents',
  '/subcontractors': 'Subcontractors',
  '/paystubs': 'Paystubs',
  '/sales-reports': 'EMR Sales Reports',
  '/provider-tags': 'Provider-Assistant Tags',
  '/audit-log': 'Audit Log',
  '/settings': 'Settings',
};

export default function TopHeader() {
  const location = useLocation();
  const { state } = useApp();
  const { employees, currentUserId, absences, tasks, conversations, timesheets, openShiftBids, invoices } = state;
  const currentUser = employees.find((e) => e.id === currentUserId);
  const [showNotifs, setShowNotifs] = useState(false);

  const pageTitle = PAGE_TITLES[location.pathname] || 'Page';

  const notifications = useMemo(() => {
    const notifs = [];
    const pending = absences.filter((a) => a.status === 'pending');
    if (pending.length > 0) {
      notifs.push({ id: 'absences', icon: CalendarOff, text: `${pending.length} pending absence request${pending.length > 1 ? 's' : ''}`, link: '/absences', color: 'var(--warning)' });
    }
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    if (pendingTasks.length > 0) {
      notifs.push({ id: 'tasks', icon: ListTodo, text: `${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}`, link: '/tasks', color: 'var(--primary)' });
    }
    // Unread messages
    const unreadMsgCount = (conversations || []).reduce((sum, c) => {
      if (!c.participantIds?.includes(currentUserId)) return sum;
      return sum + (c.messages || []).filter((m) => m.senderId !== currentUserId && !m.readBy?.includes(currentUserId)).length;
    }, 0);
    if (unreadMsgCount > 0) {
      notifs.push({ id: 'messages', icon: Mail, text: `${unreadMsgCount} unread message${unreadMsgCount > 1 ? 's' : ''}`, link: '/messages', color: '#7c3aed' });
    }
    // Submitted timesheets awaiting approval
    const submittedTs = (timesheets || []).filter((t) => t.status === 'submitted');
    if (submittedTs.length > 0) {
      notifs.push({ id: 'timesheets', icon: ClipboardCheck, text: `${submittedTs.length} timesheet${submittedTs.length > 1 ? 's' : ''} awaiting approval`, link: '/timesheets', color: 'var(--warning)' });
    }
    // Pending open shift bids
    const pendingBids = (openShiftBids || []).filter((b) => b.status === 'pending');
    if (pendingBids.length > 0) {
      notifs.push({ id: 'bids', icon: HandMetal, text: `${pendingBids.length} open shift bid${pendingBids.length > 1 ? 's' : ''} to review`, link: '/open-shifts', color: '#059669' });
    }
    // Overdue invoices
    const overdueInv = (invoices || []).filter((i) => i.status === 'overdue');
    if (overdueInv.length > 0) {
      notifs.push({ id: 'invoices', icon: FileText, text: `${overdueInv.length} overdue invoice${overdueInv.length > 1 ? 's' : ''}`, link: '/billing', color: 'var(--danger)' });
    }
    return notifs;
  }, [absences, tasks, conversations, currentUserId, timesheets, openShiftBids, invoices]);

  const totalNotifs = notifications.length;

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
