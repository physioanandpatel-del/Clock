import { createContext, useContext, useReducer, useEffect } from 'react';
import { generateSampleData } from '../utils/sampleData';
import { generateId } from '../utils/helpers';

const AppContext = createContext(null);

const STORAGE_KEY = 'clock-app-data';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      // Migrate old data without new fields
      if (!data.locations) {
        const fresh = generateSampleData();
        return { ...fresh, employees: data.employees || fresh.employees, shifts: data.shifts || fresh.shifts, positions: data.positions || fresh.positions, timeEntries: data.timeEntries || fresh.timeEntries };
      }
      if (!data.absences) data.absences = [];
      if (!data.salesEntries) data.salesEntries = [];
      if (!data.payrollSettings) data.payrollSettings = { period: 'biweekly', startDay: 1 };
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
      const locEmpIds = state.employees.filter((e) => e.locationId === action.payload).map((e) => e.id);
      return {
        ...state,
        locations: newLocs,
        currentLocationId: newCurrentId,
        employees: state.employees.filter((e) => e.locationId !== action.payload),
        shifts: state.shifts.filter((s) => !locEmpIds.includes(s.employeeId)),
        timeEntries: state.timeEntries.filter((t) => !locEmpIds.includes(t.employeeId)),
        absences: state.absences.filter((a) => !locEmpIds.includes(a.employeeId)),
        salesEntries: state.salesEntries.filter((s) => s.locationId !== action.payload),
      };
    }

    // Employee
    case 'ADD_EMPLOYEE': {
      const employee = { ...action.payload, id: generateId(), locationId: action.payload.locationId || state.currentLocationId };
      return { ...state, employees: [...state.employees, employee] };
    }
    case 'UPDATE_EMPLOYEE':
      return { ...state, employees: state.employees.map((e) => e.id === action.payload.id ? { ...e, ...action.payload } : e) };
    case 'DELETE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.filter((e) => e.id !== action.payload),
        shifts: state.shifts.filter((s) => s.employeeId !== action.payload),
        timeEntries: state.timeEntries.filter((t) => t.employeeId !== action.payload),
        absences: state.absences.filter((a) => a.employeeId !== action.payload),
      };

    // Shift
    case 'ADD_SHIFT': {
      const shift = { ...action.payload, id: generateId(), status: 'scheduled' };
      return { ...state, shifts: [...state.shifts, shift] };
    }
    case 'UPDATE_SHIFT':
      return { ...state, shifts: state.shifts.map((s) => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
    case 'DELETE_SHIFT':
      return { ...state, shifts: state.shifts.filter((s) => s.id !== action.payload) };

    // Time Clock
    case 'CLOCK_IN': {
      const entry = { id: generateId(), employeeId: action.payload.employeeId, clockIn: new Date().toISOString(), clockOut: null, status: 'active' };
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

    // Payroll Settings
    case 'UPDATE_PAYROLL_SETTINGS':
      return { ...state, payrollSettings: { ...state.payrollSettings, ...action.payload } };

    // Positions
    case 'ADD_POSITION':
      if (state.positions.includes(action.payload)) return state;
      return { ...state, positions: [...state.positions, action.payload] };

    // Reset
    case 'RESET_DATA':
      return generateSampleData();

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
