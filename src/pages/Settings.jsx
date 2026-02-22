import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, X, RotateCcw } from 'lucide-react';
import './Settings.css';

export default function Settings() {
  const { state, dispatch } = useApp();
  const { positions } = state;
  const [newPosition, setNewPosition] = useState('');

  function handleAddPosition(e) {
    e.preventDefault();
    if (newPosition.trim()) {
      dispatch({ type: 'ADD_POSITION', payload: newPosition.trim() });
      setNewPosition('');
    }
  }

  function handleReset() {
    if (window.confirm('Reset all data to defaults? This cannot be undone.')) {
      dispatch({ type: 'RESET_DATA' });
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage app configuration</p>
        </div>
      </div>

      <div className="settings-section">
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Positions</h2>
          </div>
          <div className="card__body">
            <p className="settings-desc">
              Manage the positions available for scheduling shifts.
            </p>
            <div className="positions-list">
              {positions.map((p) => (
                <span key={p} className="position-tag">
                  {p}
                </span>
              ))}
            </div>
            <form className="add-position-form" onSubmit={handleAddPosition}>
              <input
                type="text"
                className="form-input"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="New position name..."
              />
              <button type="submit" className="btn btn--primary">
                <Plus size={16} /> Add
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Data Management</h2>
          </div>
          <div className="card__body">
            <p className="settings-desc">
              All data is stored locally in your browser. Resetting will restore the sample data.
            </p>
            <button className="btn btn--danger" onClick={handleReset}>
              <RotateCcw size={16} /> Reset All Data
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">About</h2>
          </div>
          <div className="card__body">
            <p className="settings-desc">
              <strong>Clock</strong> is a shift scheduling and time tracking application
              inspired by Sling. Built with React.
            </p>
            <div className="about-info">
              <div className="about-row">
                <span className="about-label">Version</span>
                <span className="about-value">1.0.0</span>
              </div>
              <div className="about-row">
                <span className="about-label">Storage</span>
                <span className="about-value">Local (Browser)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
