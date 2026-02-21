import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopHeader from './components/TopHeader'
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
import './App.css'

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <TopHeader />
        <div className="main-content__body">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/time-clock" element={<TimeClock />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/absences" element={<Absences />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/labour" element={<Labour />} />
            <Route path="/newsfeed" element={<Newsfeed />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
