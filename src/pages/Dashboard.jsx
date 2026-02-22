import { useMemo } from 'react';
import { useApp, hasAccess, ACCESS_LABELS } from '../context/AppContext';
import { MapPin } from 'lucide-react';
import { format, isToday, parseISO, startOfWeek, endOfWeek, isWithinInterval, differenceInYears, addDays, isAfter } from 'date-fns';
import { calculateLaborCost } from '../utils/helpers';
import EmployeeDashboard from './EmployeeDashboard';
import ManagerDashboard from './ManagerDashboard';
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
      totalEmployees: locationEmployees.length, todayShifts: todayShifts.length, activeClockIns: activeClockIns.length,
      weeklyLabor: weekLabor, weekShiftsCount: weekShifts.length, weekSales, laborPercent,
      pendingAbsences: pendingAbsences.length, draftShifts: draftShifts.length, openSwaps: openSwaps.length,
    };
  }, [locationEmployees, locationEmpIds, shifts, timeEntries, salesEntries, absences, shiftSwaps, currentLocationId, weekStart, weekEnd]);

  // ===== EMPLOYEE PERSONAL DATA =====
  const myShiftsToday = useMemo(() => shifts.filter((s) => s.employeeId === currentUserId && isToday(parseISO(s.start))).sort((a, b) => new Date(a.start) - new Date(b.start)), [shifts, currentUserId]);
  const myUpcomingShifts = useMemo(() => shifts.filter((s) => s.employeeId === currentUserId && isAfter(parseISO(s.start), today) && !isToday(parseISO(s.start))).sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 5), [shifts, currentUserId, today]);
  const myTasks = useMemo(() => tasks.filter((t) => t.assigneeId === currentUserId && t.status !== 'completed').slice(0, 5), [tasks, currentUserId]);
  const myTraining = useMemo(() => trainingAssignments.filter((a) => a.employeeId === currentUserId && a.status !== 'completed').map((a) => ({ ...a, program: trainingPrograms.find((p) => p.id === a.programId) })).filter((a) => a.program), [trainingAssignments, trainingPrograms, currentUserId]);
  const mySurveys = useMemo(() => surveyResponses.filter((r) => r.employeeId === currentUserId && r.status === 'pending').map((r) => ({ ...r, template: surveyTemplates.find((s) => s.id === r.surveyId) })).filter((r) => r.template), [surveyResponses, surveyTemplates, currentUserId]);
  const myAbsences = useMemo(() => absences.filter((a) => a.employeeId === currentUserId && a.status === 'pending'), [absences, currentUserId]);
  const myActiveClockIn = useMemo(() => timeEntries.find((t) => t.employeeId === currentUserId && t.status === 'active'), [timeEntries, currentUserId]);

  // ===== SHARED DATA =====
  const todayShifts = useMemo(() => shifts.filter((s) => locationEmpIds.has(s.employeeId) && isToday(parseISO(s.start))).map((s) => ({ ...s, employee: locationEmployees.find((e) => e.id === s.employeeId) })).sort((a, b) => new Date(a.start) - new Date(b.start)), [shifts, locationEmployees, locationEmpIds]);
  const activeEntries = useMemo(() => timeEntries.filter((t) => t.status === 'active' && locationEmpIds.has(t.employeeId)).map((t) => ({ ...t, employee: locationEmployees.find((e) => e.id === t.employeeId) })), [timeEntries, locationEmployees, locationEmpIds]);
  const pendingAbsencesList = useMemo(() => absences.filter((a) => a.status === 'pending' && locationEmpIds.has(a.employeeId)).map((a) => ({ ...a, employee: employees.find((e) => e.id === a.employeeId) })).slice(0, 5), [absences, employees, locationEmpIds]);
  const recentTasks = useMemo(() => tasks.filter((t) => t.locationId === currentLocationId && t.status !== 'completed').slice(0, 5), [tasks, currentLocationId]);
  const recentPosts = useMemo(() => posts.map((p) => ({ ...p, author: employees.find((e) => e.id === p.authorId) })).slice(0, 3), [posts, employees]);
  const celebrations = useMemo(() => {
    const items = [];
    const now = new Date();
    locationEmployees.forEach((emp) => {
      if (emp.dateOfBirth) { try { const dob = new Date(emp.dateOfBirth + 'T00:00:00'); for (let d = 0; d <= 14; d++) { const checkDate = addDays(now, d); if (checkDate.getMonth() === dob.getMonth() && checkDate.getDate() === dob.getDate()) { const age = differenceInYears(checkDate, dob); items.push({ type: 'birthday', employee: emp, date: checkDate, daysAway: d, detail: d === 0 ? `Turns ${age} today!` : `Turns ${age} in ${d} day${d > 1 ? 's' : ''}` }); } } } catch { /* skip */ } }
      if (emp.hireDate) { try { const hire = new Date(emp.hireDate + 'T00:00:00'); for (let d = 0; d <= 14; d++) { const checkDate = addDays(now, d); if (checkDate.getMonth() === hire.getMonth() && checkDate.getDate() === hire.getDate() && checkDate.getFullYear() !== hire.getFullYear()) { const years = differenceInYears(checkDate, hire); items.push({ type: 'anniversary', employee: emp, date: checkDate, daysAway: d, detail: d === 0 ? `${years} year${years > 1 ? 's' : ''} today!` : `${years} year${years > 1 ? 's' : ''} in ${d} day${d > 1 ? 's' : ''}` }); } } } catch { /* skip */ } }
    });
    return items.sort((a, b) => a.daysAway - b.daysAway);
  }, [locationEmployees]);

  const targetPercent = currentLocation?.targetLaborPercent || 30;
  const isOverTarget = stats.laborPercent > targetPercent + 2;

  const locationBar = (
    <div className="dash-location-bar">
      <MapPin size={14} />
      <span>{currentLocation?.name}</span>
      <span className="dash-location-bar__sep">&middot;</span>
      <span>{format(today, 'EEEE, MMMM d, yyyy')}</span>
      <span className="dash-location-bar__sep">&middot;</span>
      <span style={{ fontWeight: 500 }}>{currentUser?.name} ({ACCESS_LABELS[userAccess]})</span>
    </div>
  );

  if (isManager) {
    return <ManagerDashboard locationBar={locationBar} stats={stats} targetPercent={targetPercent} isOverTarget={isOverTarget} todayShifts={todayShifts} activeEntries={activeEntries} pendingAbsencesList={pendingAbsencesList} recentTasks={recentTasks} recentPosts={recentPosts} celebrations={celebrations} />;
  }

  return <EmployeeDashboard locationBar={locationBar} currentUser={currentUser} userAccess={userAccess} myShiftsToday={myShiftsToday} myUpcomingShifts={myUpcomingShifts} myTasks={myTasks} myTraining={myTraining} mySurveys={mySurveys} myAbsences={myAbsences} myActiveClockIn={myActiveClockIn} />;
}
