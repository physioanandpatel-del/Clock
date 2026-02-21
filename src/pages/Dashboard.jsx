import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp, hasAccess, ACCESS_LABELS } from '../context/AppContext';
import {
  Users, Clock, DollarSign, CalendarDays, TrendingUp, AlertCircle,
  Target, MapPin, CalendarOff, ListTodo, MessageSquare, ArrowRight,
  CheckCircle2, AlertTriangle, BarChart3, Cake, Award, GraduationCap,
  ClipboardList, Repeat, BookOpen, Star, Calendar,
} from 'lucide-react';
import { format, isToday, parseISO, startOfWeek, endOfWeek, isWithinInterval, formatDistanceToNow, differenceInYears, addDays, isBefore, isAfter } from 'date-fns';
import { formatTime, formatDuration, getInitials, calculateLaborCost } from '../utils/helpers';
import './Dashboard.css';

export default function Dashboard() {
  const { state } = useApp();
  const {
    employees, shifts, timeEntries, locations, currentLocationId, salesEntries,
    absences, tasks, posts, currentUserId,
    trainingPrograms = [], trainingAssignments = [], surveyTemplates = [], surveyResponses = [],
    shiftSwaps = [],
  } = state;

  const currentUser = employees.find((e) => e.id === currentUserId);
  const userAccess = currentUser?.accessLevel || 'employee';
  const isManager = hasAccess(userAccess, 'manager');

  const currentLocation = locations.find((l) => l.id === currentLocationId);
  const locationEmployees = useMemo(() => employees.filter((e) => (e.locationIds || [e.locationId]).includes(currentLocationId)), [employees, currentLocationId]);
  const locationEmpIds = useMemo(() => new Set(locationEmployees.map((e) => e.id)), [locationEmployees]);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // ===== MANAGER STATS =====
  const stats = useMemo(() => {
    const locShifts = shifts.filter((s) => locationEmpIds.has(s.employeeId));
    const todayShifts = locShifts.filter((s) => isToday(parseISO(s.start)));
    const weekShifts = locShifts.filter((s) => {
      const d = parseISO(s.start);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
    const activeClockIns = timeEntries.filter((t) => t.status === 'active' && locationEmpIds.has(t.employeeId));
    const weekLabor = calculateLaborCost(weekShifts, locationEmployees);
    const weekSales = salesEntries
      .filter((s) => s.locationId === currentLocationId)
      .filter((s) => { const d = parseISO(s.date); return isWithinInterval(d, { start: weekStart, end: weekEnd }); })
      .reduce((sum, s) => sum + s.amount, 0);
    const laborPercent = weekSales > 0 ? (weekLabor / weekSales) * 100 : 0;
    const pendingAbsences = absences.filter((a) => a.status === 'pending' && locationEmpIds.has(a.employeeId));
    const draftShifts = locShifts.filter((s) => s.status === 'draft');
    const openSwaps = (shiftSwaps || []).filter((sw) => sw.status === 'open' || sw.status === 'claimed');

    return {
      totalEmployees: locationEmployees.length,
      todayShifts: todayShifts.length,
      activeClockIns: activeClockIns.length,
      weeklyLabor: weekLabor,
      weekShiftsCount: weekShifts.length,
      weekSales,
      laborPercent,
      pendingAbsences: pendingAbsences.length,
      draftShifts: draftShifts.length,
      openSwaps: openSwaps.length,
    };
  }, [locationEmployees, locationEmpIds, shifts, timeEntries, salesEntries, absences, shiftSwaps, currentLocationId, weekStart, weekEnd]);

  // ===== EMPLOYEE PERSONAL DATA =====
  const myShiftsToday = useMemo(
    () => shifts
      .filter((s) => s.employeeId === currentUserId && isToday(parseISO(s.start)))
      .sort((a, b) => new Date(a.start) - new Date(b.start)),
    [shifts, currentUserId]
  );

  const myUpcomingShifts = useMemo(
    () => shifts
      .filter((s) => s.employeeId === currentUserId && isAfter(parseISO(s.start), today) && !isToday(parseISO(s.start)))
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 5),
    [shifts, currentUserId, today]
  );

  const myTasks = useMemo(
    () => tasks.filter((t) => t.assigneeId === currentUserId && t.status !== 'completed').slice(0, 5),
    [tasks, currentUserId]
  );

  const myTraining = useMemo(() => {
    return trainingAssignments
      .filter((a) => a.employeeId === currentUserId && a.status !== 'completed')
      .map((a) => {
        const program = trainingPrograms.find((p) => p.id === a.programId);
        return { ...a, program };
      })
      .filter((a) => a.program);
  }, [trainingAssignments, trainingPrograms, currentUserId]);

  const mySurveys = useMemo(() => {
    return surveyResponses
      .filter((r) => r.employeeId === currentUserId && r.status === 'pending')
      .map((r) => {
        const template = surveyTemplates.find((s) => s.id === r.surveyId);
        return { ...r, template };
      })
      .filter((r) => r.template);
  }, [surveyResponses, surveyTemplates, currentUserId]);

  const myAbsences = useMemo(
    () => absences.filter((a) => a.employeeId === currentUserId && a.status === 'pending'),
    [absences, currentUserId]
  );

  const myActiveClockIn = useMemo(
    () => timeEntries.find((t) => t.employeeId === currentUserId && t.status === 'active'),
    [timeEntries, currentUserId]
  );

  // ===== SHARED DATA =====
  const todayShifts = useMemo(
    () =>
      shifts
        .filter((s) => locationEmpIds.has(s.employeeId) && isToday(parseISO(s.start)))
        .map((s) => ({ ...s, employee: locationEmployees.find((e) => e.id === s.employeeId) }))
        .sort((a, b) => new Date(a.start) - new Date(b.start)),
    [shifts, locationEmployees, locationEmpIds]
  );

  const activeEntries = useMemo(
    () =>
      timeEntries
        .filter((t) => t.status === 'active' && locationEmpIds.has(t.employeeId))
        .map((t) => ({ ...t, employee: locationEmployees.find((e) => e.id === t.employeeId) })),
    [timeEntries, locationEmployees, locationEmpIds]
  );

  const pendingAbsencesList = useMemo(
    () =>
      absences
        .filter((a) => a.status === 'pending' && locationEmpIds.has(a.employeeId))
        .map((a) => ({ ...a, employee: employees.find((e) => e.id === a.employeeId) }))
        .slice(0, 5),
    [absences, employees, locationEmpIds]
  );

  const recentTasks = useMemo(
    () => tasks.filter((t) => t.locationId === currentLocationId && t.status !== 'completed').slice(0, 5),
    [tasks, currentLocationId]
  );

  const recentPosts = useMemo(
    () =>
      posts
        .map((p) => ({ ...p, author: employees.find((e) => e.id === p.authorId) }))
        .slice(0, 3),
    [posts, employees]
  );

  // Celebrations
  const celebrations = useMemo(() => {
    const items = [];
    const now = new Date();
    locationEmployees.forEach((emp) => {
      if (emp.dateOfBirth) {
        try {
          const dob = new Date(emp.dateOfBirth + 'T00:00:00');
          for (let d = 0; d <= 14; d++) {
            const checkDate = addDays(now, d);
            if (checkDate.getMonth() === dob.getMonth() && checkDate.getDate() === dob.getDate()) {
              const age = differenceInYears(checkDate, dob);
              items.push({ type: 'birthday', employee: emp, date: checkDate, daysAway: d, detail: d === 0 ? `Turns ${age} today!` : `Turns ${age} in ${d} day${d > 1 ? 's' : ''}` });
            }
          }
        } catch { /* skip */ }
      }
      if (emp.hireDate) {
        try {
          const hire = new Date(emp.hireDate + 'T00:00:00');
          for (let d = 0; d <= 14; d++) {
            const checkDate = addDays(now, d);
            if (checkDate.getMonth() === hire.getMonth() && checkDate.getDate() === hire.getDate() && checkDate.getFullYear() !== hire.getFullYear()) {
              const years = differenceInYears(checkDate, hire);
              items.push({ type: 'anniversary', employee: emp, date: checkDate, daysAway: d, detail: d === 0 ? `${years} year${years > 1 ? 's' : ''} today!` : `${years} year${years > 1 ? 's' : ''} in ${d} day${d > 1 ? 's' : ''}` });
            }
          }
        } catch { /* skip */ }
      }
    });
    return items.sort((a, b) => a.daysAway - b.daysAway);
  }, [locationEmployees]);

  const targetPercent = currentLocation?.targetLaborPercent || 30;
  const isOverTarget = stats.laborPercent > targetPercent + 2;

  // ===== EMPLOYEE DASHBOARD =====
  if (!isManager) {
    return (
      <div className="dashboard">
        <div className="dash-location-bar">
          <MapPin size={14} />
          <span>{currentLocation?.name}</span>
          <span className="dash-location-bar__sep">&middot;</span>
          <span>{format(today, 'EEEE, MMMM d, yyyy')}</span>
        </div>

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

  // ===== MANAGER/OWNER DASHBOARD =====
  return (
    <div className="dashboard">
      <div className="dash-location-bar">
        <MapPin size={14} />
        <span>{currentLocation?.name}</span>
        <span className="dash-location-bar__sep">&middot;</span>
        <span>{format(today, 'EEEE, MMMM d, yyyy')}</span>
      </div>

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
