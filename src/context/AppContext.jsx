import { createContext, useContext, useReducer, useEffect } from 'react';
import { generateSampleData } from '../utils/sampleData';
import { generateId } from '../utils/helpers';

const AppContext = createContext(null);

const STORAGE_KEY = 'clock-app-data';

// Access level hierarchy (higher index = more access)
export const ACCESS_LEVELS = ['employee', 'manager', 'location_admin', 'master_admin'];
export const ACCESS_LABELS = {
  master_admin: 'Master Admin',
  location_admin: 'Location Admin',
  manager: 'Manager',
  employee: 'Employee',
};

export function hasAccess(userLevel, requiredLevel) {
  return ACCESS_LEVELS.indexOf(userLevel) >= ACCESS_LEVELS.indexOf(requiredLevel);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (!data.locations) {
        const fresh = generateSampleData();
        return { ...fresh, employees: data.employees || fresh.employees, shifts: data.shifts || fresh.shifts, positions: data.positions || fresh.positions, timeEntries: data.timeEntries || fresh.timeEntries };
      }
      if (!data.absences) data.absences = [];
      if (!data.salesEntries) data.salesEntries = [];
      if (!data.payrollSettings) data.payrollSettings = { period: 'biweekly', startDay: 1 };
      if (!data.posts) data.posts = [];
      if (!data.tasks) data.tasks = [];
      if (!data.currentUserId) data.currentUserId = data.employees?.[0]?.id || '1';
      if (!data.accessLevels) data.accessLevels = ACCESS_LEVELS;
      // Migrate employees: locationId -> locationIds, role -> roles, add accessLevel
      data.employees = data.employees.map((e) => ({
        ...e,
        locationIds: e.locationIds || (e.locationId ? [e.locationId] : [data.currentLocationId]),
        roles: e.roles || (e.role ? [e.role] : ['Server']),
        accessLevel: e.accessLevel || 'employee',
        bankInfo: e.bankInfo || null,
        ptoBalance: e.ptoBalance || { sick: 10, vacation: 10, personal: 3 },
      }));
      // Migrate shifts: normalize status to 'draft' or 'published'
      data.shifts = (data.shifts || []).map((s) => ({
        ...s,
        status: s.status === 'published' ? 'published' : 'draft',
      }));
      data.locations = data.locations.map((l) => ({
        ...l,
        lat: l.lat || null,
        lng: l.lng || null,
        geofenceRadius: l.geofenceRadius || 200,
        laborBudgetMax: l.laborBudgetMax ?? (l.targetLaborPercent ? l.targetLaborPercent + 5 : 35),
        laborBudgetWarning: l.laborBudgetWarning ?? (l.targetLaborPercent || 30),
      }));
      return data;
    }
  } catch (e) {
    // ignore
  }
  return generateSampleData();
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore
  }
}

function reducer(state, action) {
  switch (action.type) {
    // Location
    case 'SET_LOCATION':
      return { ...state, currentLocationId: action.payload };
    case 'ADD_LOCATION': {
      const loc = { ...action.payload, id: generateId() };
      return { ...state, locations: [...state.locations, loc] };
    }
    case 'UPDATE_LOCATION':
      return { ...state, locations: state.locations.map((l) => l.id === action.payload.id ? { ...l, ...action.payload } : l) };
    case 'DELETE_LOCATION': {
      if (state.locations.length <= 1) return state;
      const newLocs = state.locations.filter((l) => l.id !== action.payload);
      const newCurrentId = state.currentLocationId === action.payload ? newLocs[0].id : state.currentLocationId;
      // Find employees who ONLY belong to this location
      const onlyHereEmpIds = state.employees
        .filter((e) => e.locationIds.length === 1 && e.locationIds[0] === action.payload)
        .map((e) => e.id);
      // Remove location from multi-location employees
      const updatedEmployees = state.employees
        .filter((e) => !onlyHereEmpIds.includes(e.id))
        .map((e) => ({
          ...e,
          locationIds: e.locationIds.filter((lid) => lid !== action.payload),
        }));
      return {
        ...state, locations: newLocs, currentLocationId: newCurrentId,
        employees: updatedEmployees,
        shifts: state.shifts.filter((s) => !onlyHereEmpIds.includes(s.employeeId)),
        timeEntries: state.timeEntries.filter((t) => !onlyHereEmpIds.includes(t.employeeId)),
        absences: state.absences.filter((a) => !onlyHereEmpIds.includes(a.employeeId)),
        salesEntries: state.salesEntries.filter((s) => s.locationId !== action.payload),
        tasks: state.tasks.filter((t) => t.locationId !== action.payload),
      };
    }

    // Employee
    case 'ADD_EMPLOYEE': {
      const employee = {
        ...action.payload,
        id: generateId(),
        locationIds: action.payload.locationIds || [state.currentLocationId],
        roles: action.payload.roles || ['Server'],
        accessLevel: action.payload.accessLevel || 'employee',
        bankInfo: action.payload.bankInfo || null,
        ptoBalance: action.payload.ptoBalance || { sick: 10, vacation: 10, personal: 3 },
      };
      return { ...state, employees: [...state.employees, employee] };
    }
    case 'UPDATE_EMPLOYEE':
      return { ...state, employees: state.employees.map((e) => e.id === action.payload.id ? { ...e, ...action.payload } : e) };
    case 'DELETE_EMPLOYEE':
      return { ...state, employees: state.employees.filter((e) => e.id !== action.payload), shifts: state.shifts.filter((s) => s.employeeId !== action.payload), timeEntries: state.timeEntries.filter((t) => t.employeeId !== action.payload), absences: state.absences.filter((a) => a.employeeId !== action.payload) };

    // User switching
    case 'SET_CURRENT_USER':
      return { ...state, currentUserId: action.payload };

    // Shift
    case 'ADD_SHIFT': {
      const shift = { ...action.payload, id: generateId(), status: action.payload.status || 'draft' };
      return { ...state, shifts: [...state.shifts, shift] };
    }
    case 'UPDATE_SHIFT':
      return { ...state, shifts: state.shifts.map((s) => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
    case 'DELETE_SHIFT':
      return { ...state, shifts: state.shifts.filter((s) => s.id !== action.payload) };
    case 'BULK_ADD_SHIFTS': {
      const newShifts = action.payload.map((s) => ({ ...s, id: generateId(), status: s.status || 'draft' }));
      return { ...state, shifts: [...state.shifts, ...newShifts] };
    }
    case 'PUBLISH_SHIFTS': {
      const ids = action.payload;
      return { ...state, shifts: state.shifts.map((s) => ids.includes(s.id) ? { ...s, status: 'published' } : s) };
    }
    case 'UNPUBLISH_SHIFTS': {
      const ids = action.payload;
      return { ...state, shifts: state.shifts.map((s) => ids.includes(s.id) ? { ...s, status: 'draft' } : s) };
    }

    // Time Clock
    case 'CLOCK_IN': {
      const entry = { id: generateId(), employeeId: action.payload.employeeId, clockIn: new Date().toISOString(), clockOut: null, status: 'active', geofenceStatus: action.payload.geofenceStatus || 'unknown' };
      return { ...state, timeEntries: [...state.timeEntries, entry] };
    }
    case 'CLOCK_OUT':
      return { ...state, timeEntries: state.timeEntries.map((t) => t.id === action.payload ? { ...t, clockOut: new Date().toISOString(), status: 'completed' } : t) };

    // Absences
    case 'ADD_ABSENCE': {
      const absence = { ...action.payload, id: generateId() };
      return { ...state, absences: [...state.absences, absence] };
    }
    case 'UPDATE_ABSENCE':
      return { ...state, absences: state.absences.map((a) => a.id === action.payload.id ? { ...a, ...action.payload } : a) };
    case 'DELETE_ABSENCE':
      return { ...state, absences: state.absences.filter((a) => a.id !== action.payload) };

    // Sales
    case 'ADD_SALES_ENTRY': {
      const entry = { ...action.payload, id: generateId() };
      return { ...state, salesEntries: [...state.salesEntries, entry] };
    }
    case 'UPDATE_SALES_ENTRY':
      return { ...state, salesEntries: state.salesEntries.map((s) => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
    case 'DELETE_SALES_ENTRY':
      return { ...state, salesEntries: state.salesEntries.filter((s) => s.id !== action.payload) };

    // Posts (Newsfeed)
    case 'ADD_POST': {
      const post = { ...action.payload, id: generateId(), createdAt: new Date().toISOString(), likes: [], comments: [] };
      return { ...state, posts: [post, ...state.posts] };
    }
    case 'DELETE_POST':
      return { ...state, posts: state.posts.filter((p) => p.id !== action.payload) };
    case 'TOGGLE_LIKE': {
      const { postId, userId } = action.payload;
      return { ...state, posts: state.posts.map((p) => {
        if (p.id !== postId) return p;
        const likes = p.likes.includes(userId) ? p.likes.filter((l) => l !== userId) : [...p.likes, userId];
        return { ...p, likes };
      }) };
    }
    case 'ADD_COMMENT': {
      const { postId, authorId, content } = action.payload;
      const comment = { id: generateId(), authorId, content, createdAt: new Date().toISOString() };
      return { ...state, posts: state.posts.map((p) => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p) };
    }

    // Tasks
    case 'ADD_TASK': {
      const task = { ...action.payload, id: generateId(), subtasks: action.payload.subtasks || [], status: 'pending' };
      return { ...state, tasks: [...state.tasks, task] };
    }
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map((t) => t.id === action.payload.id ? { ...t, ...action.payload } : t) };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) };
    case 'TOGGLE_SUBTASK': {
      const { taskId, subtaskId } = action.payload;
      return { ...state, tasks: state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = t.subtasks.map((st) => st.id === subtaskId ? { ...st, done: !st.done } : st);
        const allDone = subtasks.length > 0 && subtasks.every((st) => st.done);
        const anyDone = subtasks.some((st) => st.done);
        return { ...t, subtasks, status: allDone ? 'completed' : anyDone ? 'in_progress' : t.status };
      }) };
    }
    case 'ADD_SUBTASK': {
      const { taskId, text } = action.payload;
      const subtask = { id: generateId(), text, done: false };
      return { ...state, tasks: state.tasks.map((t) => t.id === taskId ? { ...t, subtasks: [...t.subtasks, subtask] } : t) };
    }

    // Payroll Settings
    case 'UPDATE_PAYROLL_SETTINGS':
      return { ...state, payrollSettings: { ...state.payrollSettings, ...action.payload } };
    case 'ADD_POSITION':
      if (state.positions.includes(action.payload)) return state;
      return { ...state, positions: [...state.positions, action.payload] };
    case 'RESET_DATA':
      return generateSampleData();
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);
  useEffect(() => { saveState(state); }, [state]);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
