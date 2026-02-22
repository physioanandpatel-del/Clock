import { createContext, useContext, useReducer, useEffect } from 'react';
import { generateSampleData } from '../utils/sampleData';
import { generateId } from '../utils/helpers';

const AppContext = createContext(null);

const STORAGE_KEY = 'clock-app-data';
const DATA_VERSION = 4; // Increment when sample data changes significantly

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
      // Force refresh when data version changes (new features added)
      if (!data._version || data._version < DATA_VERSION) {
        const fresh = generateSampleData();
        return { ...fresh, _version: DATA_VERSION };
      }
      if (!data.locations) {
        const fresh = generateSampleData();
        return { ...fresh, _version: DATA_VERSION, employees: data.employees || fresh.employees, shifts: data.shifts || fresh.shifts, positions: data.positions || fresh.positions, timeEntries: data.timeEntries || fresh.timeEntries };
      }
      if (!data.absences) data.absences = [];
      if (!data.salesEntries) data.salesEntries = [];
      // Migrate sales entries: add type field (default 'actual')
      data.salesEntries = data.salesEntries.map((s) => ({ ...s, type: s.type || 'actual' }));
      if (!data.payrollSettings) data.payrollSettings = { period: 'biweekly', startDay: 1 };
      if (!data.posts) data.posts = [];
      if (!data.tasks) data.tasks = [];
      if (!data.taskTemplates) data.taskTemplates = [];
      if (!data.shiftSwaps) data.shiftSwaps = [];
      if (!data.trainingPrograms) data.trainingPrograms = [];
      if (!data.trainingAssignments) data.trainingAssignments = [];
      if (!data.surveyTemplates) data.surveyTemplates = [];
      if (!data.surveyResponses) data.surveyResponses = [];
      if (!data.currentUserId) data.currentUserId = data.employees?.[0]?.id || '1';
      if (!data.accessLevels) data.accessLevels = ACCESS_LEVELS;
      if (!data.groups) data.groups = ['Front of House', 'Back of House', 'Management', 'Training', 'Opening Crew', 'Closing Crew'];
      // Migrate employees: locationId -> locationIds, role -> roles, add accessLevel + Sling fields + enriched fields
      data.employees = data.employees.map((e) => ({
        ...e,
        locationIds: e.locationIds || (e.locationId ? [e.locationId] : [data.currentLocationId]),
        roles: e.roles || (e.role ? [e.role] : ['Server']),
        accessLevel: e.accessLevel || 'employee',
        bankInfo: e.bankInfo || null,
        ptoBalance: e.ptoBalance || { sick: 10, vacation: 10, personal: 3 },
        preferredName: e.preferredName || '',
        hireDate: e.hireDate || null,
        dateOfBirth: e.dateOfBirth || '',
        emergencyContact: e.emergencyContact || null,
        timezone: e.timezone || 'America/Toronto',
        countryCode: e.countryCode || '+1',
        photoUrl: e.photoUrl || '',
        clockPin: e.clockPin || '',
        timeClockEnabled: e.timeClockEnabled !== undefined ? e.timeClockEnabled : true,
        groups: e.groups || [],
        managerIds: e.managerIds || [],
        payType: e.payType || 'hourly',
        wages: e.wages || (e.hourlyRate ? (e.roles?.map((r) => ({ position: r, rate: e.hourlyRate, effectiveDate: e.hireDate || '2024-01-01' })) || [{ position: 'General', rate: e.hourlyRate, effectiveDate: '2024-01-01' }]) : []),
        // Enriched fields
        employmentType: e.employmentType || 'full_time',
        department: e.department || '',
        status: e.status || 'active',
        address: e.address || { street: '', city: '', province: '', postalCode: '' },
        skills: e.skills || [],
        certifications: e.certifications || [],
        documents: e.documents || [],
        notes: e.notes || '',
        performanceRating: e.performanceRating || null,
        overtimeRate: e.overtimeRate || 1.5,
        availability: e.availability || {},
      }));
      // Migrate shifts: normalize status to 'draft' or 'published'
      data.shifts = (data.shifts || []).map((s) => ({
        ...s,
        status: s.status === 'published' ? 'published' : 'draft',
        taskTemplateIds: s.taskTemplateIds || [],
      }));
      data.locations = data.locations.map((l) => ({
        ...l,
        lat: l.lat || null,
        lng: l.lng || null,
        geofenceRadius: l.geofenceRadius || 200,
        laborBudgetMax: l.laborBudgetMax ?? (l.targetLaborPercent ? l.targetLaborPercent + 5 : 35),
        laborBudgetWarning: l.laborBudgetWarning ?? (l.targetLaborPercent || 30),
      }));
      return { ...data, _version: DATA_VERSION };
    }
  } catch (e) {
    // ignore
  }
  return { ...generateSampleData(), _version: DATA_VERSION };
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
        preferredName: action.payload.preferredName || '',
        hireDate: action.payload.hireDate || new Date().toISOString().split('T')[0],
        dateOfBirth: action.payload.dateOfBirth || '',
        emergencyContact: action.payload.emergencyContact || null,
        timezone: action.payload.timezone || 'America/Toronto',
        countryCode: action.payload.countryCode || '+1',
        photoUrl: action.payload.photoUrl || '',
        clockPin: action.payload.clockPin || '',
        timeClockEnabled: action.payload.timeClockEnabled !== undefined ? action.payload.timeClockEnabled : true,
        groups: action.payload.groups || [],
        managerIds: action.payload.managerIds || [],
        payType: action.payload.payType || 'hourly',
        wages: action.payload.wages || [],
        employmentType: action.payload.employmentType || 'full_time',
        department: action.payload.department || '',
        status: action.payload.status || 'active',
        address: action.payload.address || { street: '', city: '', province: '', postalCode: '' },
        skills: action.payload.skills || [],
        certifications: action.payload.certifications || [],
        documents: action.payload.documents || [],
        notes: action.payload.notes || '',
        performanceRating: action.payload.performanceRating || null,
        overtimeRate: action.payload.overtimeRate || 1.5,
        availability: action.payload.availability || {},
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
      const shift = { ...action.payload, id: generateId(), status: action.payload.status || 'draft', taskTemplateIds: action.payload.taskTemplateIds || [] };
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
      const entry = { ...action.payload, id: generateId(), type: action.payload.type || 'actual' };
      return { ...state, salesEntries: [...state.salesEntries, entry] };
    }
    case 'UPDATE_SALES_ENTRY':
      return { ...state, salesEntries: state.salesEntries.map((s) => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
    case 'DELETE_SALES_ENTRY':
      return { ...state, salesEntries: state.salesEntries.filter((s) => s.id !== action.payload) };
    case 'BULK_ADD_SALES': {
      const entries = action.payload.map((e) => ({ ...e, id: generateId(), type: e.type || 'actual' }));
      return { ...state, salesEntries: [...state.salesEntries, ...entries] };
    }
    case 'BULK_UPDATE_SALES': {
      // Update existing entries or add new ones
      let updated = [...state.salesEntries];
      action.payload.forEach((entry) => {
        const idx = updated.findIndex((s) => s.locationId === entry.locationId && s.date === entry.date && s.type === entry.type);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], amount: entry.amount };
        } else {
          updated.push({ ...entry, id: generateId() });
        }
      });
      return { ...state, salesEntries: updated };
    }

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

    // Task Templates
    case 'ADD_TASK_TEMPLATE': {
      const template = { ...action.payload, id: generateId() };
      return { ...state, taskTemplates: [...(state.taskTemplates || []), template] };
    }
    case 'UPDATE_TASK_TEMPLATE':
      return { ...state, taskTemplates: (state.taskTemplates || []).map((t) => t.id === action.payload.id ? { ...t, ...action.payload } : t) };
    case 'DELETE_TASK_TEMPLATE': {
      // Also remove from any shifts that reference it
      return {
        ...state,
        taskTemplates: (state.taskTemplates || []).filter((t) => t.id !== action.payload),
        shifts: state.shifts.map((s) => ({
          ...s,
          taskTemplateIds: (s.taskTemplateIds || []).filter((tid) => tid !== action.payload),
        })),
      };
    }

    // Shift Swaps
    case 'ADD_SHIFT_SWAP': {
      const swap = { ...action.payload, id: generateId(), createdAt: new Date().toISOString(), status: 'open', claimedById: null, managerNote: '' };
      return { ...state, shiftSwaps: [...(state.shiftSwaps || []), swap] };
    }
    case 'CLAIM_SHIFT_SWAP':
      return { ...state, shiftSwaps: (state.shiftSwaps || []).map((sw) => sw.id === action.payload.swapId ? { ...sw, claimedById: action.payload.employeeId, status: 'claimed' } : sw) };
    case 'APPROVE_SHIFT_SWAP': {
      const swap = (state.shiftSwaps || []).find((sw) => sw.id === action.payload.swapId);
      if (!swap || !swap.claimedById) return state;
      return {
        ...state,
        shiftSwaps: state.shiftSwaps.map((sw) => sw.id === action.payload.swapId ? { ...sw, status: 'approved', managerNote: action.payload.note || '' } : sw),
        shifts: state.shifts.map((s) => s.id === swap.shiftId ? { ...s, employeeId: swap.claimedById } : s),
      };
    }
    case 'DENY_SHIFT_SWAP':
      return { ...state, shiftSwaps: (state.shiftSwaps || []).map((sw) => sw.id === action.payload.swapId ? { ...sw, status: 'denied', claimedById: null, managerNote: action.payload.note || '' } : sw) };
    case 'CANCEL_SHIFT_SWAP':
      return { ...state, shiftSwaps: (state.shiftSwaps || []).filter((sw) => sw.id !== action.payload) };

    // Training Programs
    case 'ADD_TRAINING_PROGRAM': {
      const prog = { ...action.payload, id: generateId() };
      return { ...state, trainingPrograms: [...(state.trainingPrograms || []), prog] };
    }
    case 'UPDATE_TRAINING_PROGRAM':
      return { ...state, trainingPrograms: (state.trainingPrograms || []).map((p) => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'DELETE_TRAINING_PROGRAM':
      return {
        ...state,
        trainingPrograms: (state.trainingPrograms || []).filter((p) => p.id !== action.payload),
        trainingAssignments: (state.trainingAssignments || []).filter((a) => a.programId !== action.payload),
      };

    // Training Assignments
    case 'ASSIGN_TRAINING': {
      const assignment = { ...action.payload, id: generateId(), completedModules: [], status: 'assigned', assignedDate: new Date().toISOString().split('T')[0] };
      return { ...state, trainingAssignments: [...(state.trainingAssignments || []), assignment] };
    }
    case 'COMPLETE_TRAINING_MODULE': {
      const { assignmentId, moduleId } = action.payload;
      return { ...state, trainingAssignments: (state.trainingAssignments || []).map((a) => {
        if (a.id !== assignmentId) return a;
        const completed = a.completedModules.includes(moduleId) ? a.completedModules.filter((m) => m !== moduleId) : [...a.completedModules, moduleId];
        return { ...a, completedModules: completed, status: completed.length > 0 ? 'in_progress' : 'assigned' };
      }) };
    }
    case 'COMPLETE_TRAINING':
      return { ...state, trainingAssignments: (state.trainingAssignments || []).map((a) => a.id === action.payload ? { ...a, status: 'completed', completedDate: new Date().toISOString().split('T')[0] } : a) };
    case 'DELETE_TRAINING_ASSIGNMENT':
      return { ...state, trainingAssignments: (state.trainingAssignments || []).filter((a) => a.id !== action.payload) };

    // Survey Templates
    case 'ADD_SURVEY_TEMPLATE': {
      const tmpl = { ...action.payload, id: generateId() };
      return { ...state, surveyTemplates: [...(state.surveyTemplates || []), tmpl] };
    }
    case 'UPDATE_SURVEY_TEMPLATE':
      return { ...state, surveyTemplates: (state.surveyTemplates || []).map((s) => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
    case 'DELETE_SURVEY_TEMPLATE':
      return { ...state, surveyTemplates: (state.surveyTemplates || []).filter((s) => s.id !== action.payload) };

    // Survey Responses
    case 'SEND_SURVEY': {
      const resp = { ...action.payload, id: generateId(), sentDate: new Date().toISOString().split('T')[0], completedDate: null, status: 'pending', answers: [] };
      return { ...state, surveyResponses: [...(state.surveyResponses || []), resp] };
    }
    case 'COMPLETE_SURVEY':
      return { ...state, surveyResponses: (state.surveyResponses || []).map((r) => r.id === action.payload.responseId ? { ...r, answers: action.payload.answers, status: 'completed', completedDate: new Date().toISOString().split('T')[0] } : r) };

    // Payroll Settings
    case 'UPDATE_PAYROLL_SETTINGS':
      return { ...state, payrollSettings: { ...state.payrollSettings, ...action.payload } };
    case 'ADD_POSITION':
      if (state.positions.includes(action.payload)) return state;
      return { ...state, positions: [...state.positions, action.payload] };
    case 'ADD_GROUP':
      if (state.groups.includes(action.payload)) return state;
      return { ...state, groups: [...state.groups, action.payload] };
    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter((g) => g !== action.payload),
        employees: state.employees.map((e) => ({ ...e, groups: (e.groups || []).filter((g) => g !== action.payload) })),
      };
    case 'RESET_DATA':
      return { ...generateSampleData(), _version: DATA_VERSION };
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
