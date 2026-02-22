import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopHeader from './components/TopHeader'
import { useApp, hasAccess } from './context/AppContext'
import { useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Employees from './pages/Employees'
import TimeClock from './pages/TimeClock'
import Locations from './pages/Locations'
import Absences from './pages/Absences'
import Payroll from './pages/Payroll'
import Labour from './pages/Labour'
import Newsfeed from './pages/Newsfeed'
import Tasks from './pages/Tasks'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'
import './App.css'

function ProtectedRoute({ minAccess, children }) {
  const { state } = useApp();
  const currentUser = state.employees.find((e) => e.id === state.currentUserId);
  const userAccess = currentUser?.accessLevel || 'employee';
  if (!hasAccess(userAccess, minAccess)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  const { user, loading } = useAuth();
  const { state, dispatch } = useApp();

  // Sync Firebase user to AppContext currentUserId
  useEffect(() => {
    if (user) {
      // Try to find employee by Firebase UID first, then by email
      const byUid = state.employees.find((e) => e.id === user.uid);
      const byEmail = !byUid && state.employees.find((e) => e.email === user.email);
      const match = byUid || byEmail;
      if (match && state.currentUserId !== match.id) {
        dispatch({ type: 'SET_CURRENT_USER', payload: match.id });
      }
    }
  }, [user, state.employees]);

  if (loading) {
    return <div className="auth-loading">Loading...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <TopHeader />
        <div className="main-content__body">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/employees" element={<ProtectedRoute minAccess="manager"><Employees /></ProtectedRoute>} />
            <Route path="/time-clock" element={<TimeClock />} />
            <Route path="/locations" element={<ProtectedRoute minAccess="location_admin"><Locations /></ProtectedRoute>} />
            <Route path="/absences" element={<Absences />} />
            <Route path="/payroll" element={<ProtectedRoute minAccess="location_admin"><Payroll /></ProtectedRoute>} />
            <Route path="/labour" element={<ProtectedRoute minAccess="manager"><Labour /></ProtectedRoute>} />
            <Route path="/newsfeed" element={<Newsfeed />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/reports" element={<ProtectedRoute minAccess="manager"><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute minAccess="master_admin"><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
