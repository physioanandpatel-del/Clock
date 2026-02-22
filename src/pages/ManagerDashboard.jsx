import { Link } from 'react-router-dom';
import {
  Users, Clock, DollarSign, CalendarDays, TrendingUp, AlertTriangle,
  Target, CalendarOff, ListTodo, MessageSquare, ArrowRight,
  CheckCircle2, BarChart3, Cake, Award, Repeat,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { formatTime, formatDuration, getInitials } from '../utils/helpers';

export default function ManagerDashboard({
  locationBar, stats, targetPercent, isOverTarget,
  todayShifts, activeEntries, pendingAbsencesList, recentTasks, recentPosts, celebrations,
}) {
  return (
    <div className="dashboard">
      {locationBar}

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

      {/* Alerts banner */}
      {(stats.pendingAbsences > 0 || stats.draftShifts > 0 || stats.openSwaps > 0 || (isOverTarget && stats.weekSales > 0)) && (
        <div className="dash-alerts">
          {stats.pendingAbsences > 0 && (
            <Link to="/absences" className="dash-alert dash-alert--warning">
              <CalendarOff size={16} />
              <span>{stats.pendingAbsences} pending absence request{stats.pendingAbsences > 1 ? 's' : ''}</span>
              <ArrowRight size={14} />
            </Link>
          )}
          {stats.openSwaps > 0 && (
            <Link to="/schedule" className="dash-alert dash-alert--info">
              <Repeat size={16} />
              <span>{stats.openSwaps} shift swap{stats.openSwaps > 1 ? 's' : ''} need attention</span>
              <ArrowRight size={14} />
            </Link>
          )}
          {stats.draftShifts > 0 && (
            <Link to="/schedule" className="dash-alert dash-alert--info">
              <CalendarDays size={16} />
              <span>{stats.draftShifts} unpublished draft shift{stats.draftShifts > 1 ? 's' : ''}</span>
              <ArrowRight size={14} />
            </Link>
          )}
          {isOverTarget && stats.weekSales > 0 && (
            <Link to="/labour" className="dash-alert dash-alert--danger">
              <AlertTriangle size={16} />
              <span>Labour at {stats.laborPercent.toFixed(1)}% — above {targetPercent}% target</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      <div className="dashboard__grid">
        {/* Today's Schedule */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><CalendarDays size={18} /> Today's Schedule</h2>
            <Link to="/schedule" className="card__header-link">
              <span className="badge badge--blue">{todayShifts.length} shifts</span>
            </Link>
          </div>
          <div className="card__body">
            {todayShifts.length === 0 ? (
              <div className="empty-state"><CalendarDays size={40} className="empty-state__icon" /><p>No shifts scheduled for today</p></div>
            ) : (
              <div className="shift-list">
                {todayShifts.slice(0, 6).map((shift) => (
                  <div key={shift.id} className="shift-item">
                    <div className="shift-item__avatar" style={{ background: shift.employee?.color || '#94a3b8' }}>
                      {shift.employee ? getInitials(shift.employee.name) : '?'}
                    </div>
                    <div className="shift-item__info">
                      <div className="shift-item__name">{shift.employee?.name || 'Unassigned'}</div>
                      <div className="shift-item__meta">{shift.position} &middot; {formatTime(shift.start)} - {formatTime(shift.end)}</div>
                    </div>
                    <div className="shift-item__right">
                      <span className="shift-item__duration">{formatDuration(shift.start, shift.end)}</span>
                      {shift.status === 'draft' && <span className="badge badge--draft">Draft</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Currently Clocked In */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><Clock size={18} /> Currently Clocked In</h2>
            <Link to="/time-clock" className="card__header-link">
              <span className="badge badge--green">{activeEntries.length} active</span>
            </Link>
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

        {/* Pending Absences */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><CalendarOff size={18} /> Pending Absences</h2>
            <Link to="/absences" className="card__header-link">
              {stats.pendingAbsences > 0 && <span className="badge badge--pending">{stats.pendingAbsences} pending</span>}
            </Link>
          </div>
          <div className="card__body">
            {pendingAbsencesList.length === 0 ? (
              <div className="empty-state"><CheckCircle2 size={40} className="empty-state__icon" /><p>No pending requests</p></div>
            ) : (
              <div className="shift-list">
                {pendingAbsencesList.map((absence) => (
                  <div key={absence.id} className="shift-item">
                    <div className="shift-item__avatar" style={{ background: absence.employee?.color || '#94a3b8' }}>
                      {absence.employee ? getInitials(absence.employee.name) : '?'}
                    </div>
                    <div className="shift-item__info">
                      <div className="shift-item__name">{absence.employee?.name || 'Unknown'}</div>
                      <div className="shift-item__meta">
                        {absence.type} &middot; {format(parseISO(absence.startDate), 'MMM d')}
                        {absence.endDate && absence.endDate !== absence.startDate && ` - ${format(parseISO(absence.endDate), 'MMM d')}`}
                      </div>
                    </div>
                    <span className="badge badge--pending">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Tasks */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><ListTodo size={18} /> Active Tasks</h2>
            <Link to="/tasks" className="card__header-link">
              <span className="badge badge--blue">{recentTasks.length} open</span>
            </Link>
          </div>
          <div className="card__body">
            {recentTasks.length === 0 ? (
              <div className="empty-state"><CheckCircle2 size={40} className="empty-state__icon" /><p>All tasks complete!</p></div>
            ) : (
              <div className="task-list">
                {recentTasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <div className={`task-item__status task-item__status--${task.status}`} />
                    <div className="task-item__info">
                      <div className="task-item__title">{task.title}</div>
                      {task.subtasks && (
                        <div className="task-item__meta">{task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} subtasks done</div>
                      )}
                    </div>
                    <span className={`badge badge--${task.status === 'in_progress' ? 'blue' : 'pending'}`}>
                      {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Overview */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><TrendingUp size={18} /> Weekly Overview</h2>
            <Link to="/reports" className="card__header-link"><BarChart3 size={16} style={{ color: 'var(--text-light)' }} /></Link>
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
            {stats.weekSales > 0 && (
              <div className="labor-target-bar">
                <div className="labor-target-bar__header">
                  <span>Labour vs Target</span>
                  <span className={isOverTarget ? 'text-danger' : 'text-success'}>
                    {stats.laborPercent.toFixed(1)}% / {targetPercent}%
                  </span>
                </div>
                <div className="labor-target-bar__track">
                  <div
                    className={`labor-target-bar__fill ${isOverTarget ? 'labor-target-bar__fill--danger' : 'labor-target-bar__fill--success'}`}
                    style={{ width: `${Math.min((stats.laborPercent / (targetPercent * 1.5)) * 100, 100)}%` }}
                  />
                  <div className="labor-target-bar__marker" style={{ left: `${(targetPercent / (targetPercent * 1.5)) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Newsfeed */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><MessageSquare size={18} /> Recent Posts</h2>
            <Link to="/newsfeed" className="card__header-link">View All</Link>
          </div>
          <div className="card__body">
            {recentPosts.length === 0 ? (
              <div className="empty-state"><MessageSquare size={40} className="empty-state__icon" /><p>No posts yet</p></div>
            ) : (
              <div className="post-list">
                {recentPosts.map((post) => (
                  <div key={post.id} className="post-item">
                    <div className="post-item__avatar" style={{ background: post.author?.color || '#94a3b8' }}>
                      {post.author ? getInitials(post.author.name) : '?'}
                    </div>
                    <div className="post-item__info">
                      <div className="post-item__header">
                        <span className="post-item__author">{post.author?.name || 'Unknown'}</span>
                        {post.createdAt && <span className="post-item__time">{formatDistanceToNow(parseISO(post.createdAt), { addSuffix: true })}</span>}
                      </div>
                      <div className="post-item__text">{post.content?.substring(0, 80)}{post.content?.length > 80 ? '...' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Celebrations */}
      {celebrations.length > 0 && (
        <div className="celebrations-bar">
          <div className="celebrations-bar__header"><Cake size={18} /><h3 className="celebrations-bar__title">Celebrations</h3></div>
          <div className="celebrations-bar__list">
            {celebrations.map((item, i) => (
              <div key={i} className={`celebration-item ${item.daysAway === 0 ? 'celebration-item--today' : ''}`}>
                <div className="celebration-item__icon" style={{ background: item.employee.color }}>
                  {item.employee.photoUrl ? <img src={item.employee.photoUrl} alt="" className="celebration-item__photo" /> : getInitials(item.employee.name)}
                </div>
                <div className="celebration-item__info">
                  <span className="celebration-item__name">{item.employee.preferredName || item.employee.name}</span>
                  <span className="celebration-item__detail">{item.detail}</span>
                </div>
                <span className={`celebration-item__badge celebration-item__badge--${item.type}`}>
                  {item.type === 'birthday' ? <Cake size={12} /> : <Award size={12} />}
                  {item.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions bar */}
      <div className="quick-actions-bar">
        <Link to="/schedule" className="quick-action-btn"><CalendarDays size={18} /> Create Schedule</Link>
        <Link to="/employees" className="quick-action-btn"><Users size={18} /> Manage Employees</Link>
        <Link to="/time-clock" className="quick-action-btn"><Clock size={18} /> Time Clock</Link>
        <Link to="/labour" className="quick-action-btn"><TrendingUp size={18} /> Labour & Forecasting</Link>
        <Link to="/payroll" className="quick-action-btn"><DollarSign size={18} /> Payroll</Link>
        <Link to="/reports" className="quick-action-btn"><BarChart3 size={18} /> Reports</Link>
      </div>
    </div>
  );
}
