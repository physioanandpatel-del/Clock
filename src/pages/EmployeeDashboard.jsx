import { Link } from 'react-router-dom';
import {
  Clock, CalendarDays, CalendarOff, ListTodo, MessageSquare, ArrowRight,
  CheckCircle2, GraduationCap, ClipboardList, BookOpen, Calendar,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { formatTime, formatDuration, getInitials } from '../utils/helpers';
import { ACCESS_LABELS } from '../context/AppContext';

export default function EmployeeDashboard({
  locationBar, currentUser, userAccess,
  myShiftsToday, myUpcomingShifts, myTasks, myTraining, mySurveys, myAbsences, myActiveClockIn,
  recentPosts,
}) {
  return (
    <div className="dashboard">
      {locationBar}

      {/* Employee greeting */}
      <div className="dash-greeting">
        <div className="dash-greeting__avatar" style={{ background: currentUser?.color }}>
          {currentUser?.photoUrl ? (
            <img src={currentUser.photoUrl} alt="" className="dash-greeting__photo" />
          ) : (
            getInitials(currentUser?.name || '')
          )}
        </div>
        <div>
          <h1 className="dash-greeting__name">Hi, {currentUser?.preferredName || currentUser?.name?.split(' ')[0]}</h1>
          <p className="dash-greeting__role">{(currentUser?.roles || []).join(', ')} &middot; {ACCESS_LABELS[userAccess]}</p>
        </div>
        {myActiveClockIn && (
          <div className="dash-greeting__clock-badge">
            <Clock size={14} /> Clocked in since {formatTime(myActiveClockIn.clockIn)}
          </div>
        )}
      </div>

      {/* Employee stats row */}
      <div className="stats-grid stats-grid--3">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue"><CalendarDays size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">My Shifts Today</span>
            <span className="stat-card__value">{myShiftsToday.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green"><ListTodo size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">My Open Tasks</span>
            <span className="stat-card__value">{myTasks.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple"><GraduationCap size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__label">Training Active</span>
            <span className="stat-card__value">{myTraining.length}</span>
          </div>
        </div>
      </div>

      {/* Pending surveys alert */}
      {(mySurveys.length > 0 || myAbsences.length > 0) && (
        <div className="dash-alerts">
          {mySurveys.length > 0 && (
            <Link to="/tasks" className="dash-alert dash-alert--info">
              <ClipboardList size={16} />
              <span>You have {mySurveys.length} pending survey{mySurveys.length > 1 ? 's' : ''} to complete</span>
              <ArrowRight size={14} />
            </Link>
          )}
          {myAbsences.length > 0 && (
            <Link to="/absences" className="dash-alert dash-alert--warning">
              <CalendarOff size={16} />
              <span>{myAbsences.length} absence request{myAbsences.length > 1 ? 's' : ''} pending approval</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      <div className="dashboard__grid">
        {/* My Shifts Today */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><CalendarDays size={18} /> My Shifts Today</h2>
            <Link to="/schedule" className="card__header-link">Full Schedule</Link>
          </div>
          <div className="card__body">
            {myShiftsToday.length === 0 ? (
              <div className="empty-state"><CalendarDays size={40} className="empty-state__icon" /><p>No shifts today — enjoy your day off!</p></div>
            ) : (
              <div className="shift-list">
                {myShiftsToday.map((shift) => (
                  <div key={shift.id} className="shift-item shift-item--highlight">
                    <div className="shift-item__avatar" style={{ background: currentUser?.color }}>
                      <Calendar size={16} />
                    </div>
                    <div className="shift-item__info">
                      <div className="shift-item__name">{shift.position}</div>
                      <div className="shift-item__meta">{formatTime(shift.start)} - {formatTime(shift.end)}</div>
                    </div>
                    <div className="shift-item__right">
                      <span className="shift-item__duration">{formatDuration(shift.start, shift.end)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Upcoming Shifts */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><Calendar size={18} /> Upcoming Shifts</h2>
            <Link to="/schedule" className="card__header-link">View All</Link>
          </div>
          <div className="card__body">
            {myUpcomingShifts.length === 0 ? (
              <div className="empty-state"><Calendar size={40} className="empty-state__icon" /><p>No upcoming shifts scheduled</p></div>
            ) : (
              <div className="shift-list">
                {myUpcomingShifts.map((shift) => (
                  <div key={shift.id} className="shift-item">
                    <div className="shift-item__avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      <Calendar size={16} />
                    </div>
                    <div className="shift-item__info">
                      <div className="shift-item__name">{format(parseISO(shift.start), 'EEE, MMM d')}</div>
                      <div className="shift-item__meta">{shift.position} &middot; {formatTime(shift.start)} - {formatTime(shift.end)}</div>
                    </div>
                    <span className="shift-item__duration">{formatDuration(shift.start, shift.end)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Tasks */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><ListTodo size={18} /> My Tasks</h2>
            <Link to="/tasks" className="card__header-link">View All</Link>
          </div>
          <div className="card__body">
            {myTasks.length === 0 ? (
              <div className="empty-state"><CheckCircle2 size={40} className="empty-state__icon" /><p>All caught up!</p></div>
            ) : (
              <div className="task-list">
                {myTasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <div className={`task-item__status task-item__status--${task.status}`} />
                    <div className="task-item__info">
                      <div className="task-item__title">{task.title}</div>
                      {task.subtasks && (
                        <div className="task-item__meta">{task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} subtasks</div>
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

        {/* My Training */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><GraduationCap size={18} /> My Training</h2>
            <Link to="/tasks" className="card__header-link">View All</Link>
          </div>
          <div className="card__body">
            {myTraining.length === 0 ? (
              <div className="empty-state"><GraduationCap size={40} className="empty-state__icon" /><p>No active training</p></div>
            ) : (
              <div className="shift-list">
                {myTraining.map((assignment) => {
                  const progress = assignment.program.modules.length > 0
                    ? Math.round((assignment.completedModules.length / assignment.program.modules.length) * 100) : 0;
                  return (
                    <div key={assignment.id} className="shift-item">
                      <div className="shift-item__avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        <BookOpen size={16} />
                      </div>
                      <div className="shift-item__info">
                        <div className="shift-item__name">{assignment.program.name}</div>
                        <div className="shift-item__meta">
                          {assignment.completedModules.length}/{assignment.program.modules.length} modules &middot; {progress}%
                        </div>
                      </div>
                      <div className="emp-training-progress">
                        <div className="emp-training-progress__bar">
                          <div className="emp-training-progress__fill" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
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

      {/* Quick Actions for employees */}
      <div className="quick-actions-bar">
        <Link to="/schedule" className="quick-action-btn"><CalendarDays size={18} /> My Schedule</Link>
        <Link to="/time-clock" className="quick-action-btn"><Clock size={18} /> Time Clock</Link>
        <Link to="/absences" className="quick-action-btn"><CalendarOff size={18} /> Request Time Off</Link>
        <Link to="/tasks" className="quick-action-btn"><ListTodo size={18} /> My Tasks</Link>
        <Link to="/newsfeed" className="quick-action-btn"><MessageSquare size={18} /> Newsfeed</Link>
      </div>
    </div>
  );
}
