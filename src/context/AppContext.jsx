import { createContext, useContext, useReducer, useEffect } from 'react';
import { generateSampleData } from '../utils/sampleData';
import { generateId } from '../utils/helpers';

const AppContext = createContext(null);

const STORAGE_KEY = 'clock-app-data';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
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
    case 'ADD_EMPLOYEE': {
      const employee = { ...action.payload, id: generateId() };
      return { ...state, employees: [...state.employees, employee] };
    }
    case 'UPDATE_EMPLOYEE': {
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      };
    }
    case 'DELETE_EMPLOYEE': {
      return {
        ...state,
        employees: state.employees.filter((e) => e.id !== action.payload),
        shifts: state.shifts.filter((s) => s.employeeId !== action.payload),
        timeEntries: state.timeEntries.filter((t) => t.employeeId !== action.payload),
      };
    }
    case 'ADD_SHIFT': {
      const shift = { ...action.payload, id: generateId(), status: 'scheduled' };
      return { ...state, shifts: [...state.shifts, shift] };
    }
    case 'UPDATE_SHIFT': {
      return {
        ...state,
        shifts: state.shifts.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload } : s
        ),
      };
    }
    case 'DELETE_SHIFT': {
      return { ...state, shifts: state.shifts.filter((s) => s.id !== action.payload) };
    }
    case 'CLOCK_IN': {
      const entry = {
        id: generateId(),
        employeeId: action.payload.employeeId,
        clockIn: new Date().toISOString(),
        clockOut: null,
        status: 'active',
      };
      return { ...state, timeEntries: [...state.timeEntries, entry] };
    }
    case 'CLOCK_OUT': {
      return {
        ...state,
        timeEntries: state.timeEntries.map((t) =>
          t.id === action.payload
            ? { ...t, clockOut: new Date().toISOString(), status: 'completed' }
            : t
        ),
      };
    }
    case 'ADD_POSITION': {
      if (state.positions.includes(action.payload)) return state;
      return { ...state, positions: [...state.positions, action.payload] };
    }
    case 'RESET_DATA': {
      return generateSampleData();
    }
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
