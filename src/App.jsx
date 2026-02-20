import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Employees from './pages/Employees'
import TimeClock from './pages/TimeClock'
import Settings from './pages/Settings'
import './App.css'

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/time-clock" element={<TimeClock />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
