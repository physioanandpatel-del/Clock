import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, X, RotateCcw, Sliders, MapPin, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import './Settings.css';

export default function Settings() {
  const { state, dispatch } = useApp();
  const { positions, systemSettings } = state;
  const settings = systemSettings || { defaultMultiLocation: false, defaultMaxLocations: 1, defaultMaxEmployees: 10 };
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

  function updateSetting(key, value) {
    const updates = { [key]: value };
    // If disabling multi-location, reset max locations
    if (key === 'defaultMultiLocation' && !value) {
      updates.defaultMaxLocations = 1;
    }
    if (key === 'defaultMultiLocation' && value && settings.defaultMaxLocations <= 1) {
      updates.defaultMaxLocations = 3;
    }
    dispatch({ type: 'UPDATE_SYSTEM_SETTINGS', payload: updates });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { action: 'settings_change', entityType: 'settings', entityId: '', details: `System setting "${key}" changed to ${value}`, userId: state.currentUserId } });
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage app configuration</p>
        </div>
      </div>

      {/* Feature Defaults */}
      <div className="settings-section">
        <div className="card">
          <div className="card__header">
            <h2 className="card__title"><Sliders size={18} /> Feature Defaults for New Customers</h2>
          </div>
          <div className="card__body">
            <p className="settings-desc">
              Control the default feature settings applied when creating new customer subscriptions. You can override these per-customer in the Subscriptions page.
            </p>

            <div className="settings-feature-list">
              <div className="settings-feature-row">
                <div className="settings-feature-info">
                  <MapPin size={16} />
                  <div>
                    <div className="settings-feature-label">Multi-Location (Default)</div>
                    <div className="settings-feature-desc">Allow new customers to have multiple locations by default</div>
                  </div>
                </div>
                <button
                  className={`feature-toggle ${settings.defaultMultiLocation ? 'feature-toggle--on' : ''}`}
                  onClick={() => updateSetting('defaultMultiLocation', !settings.defaultMultiLocation)}
                >
                  {settings.defaultMultiLocation ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  <span>{settings.defaultMultiLocation ? 'On' : 'Off'}</span>
                </button>
              </div>

              <div className={`settings-feature-row ${!settings.defaultMultiLocation ? 'settings-feature-row--disabled' : ''}`}>
                <div className="settings-feature-info">
                  <MapPin size={16} />
                  <div>
                    <div className="settings-feature-label">Default Max Locations</div>
                    <div className="settings-feature-desc">Maximum locations for new customers when multi-location is enabled</div>
                  </div>
                </div>
                <input
                  type="number"
                  className="settings-feature-input"
                  min={1}
                  max={999}
                  value={settings.defaultMaxLocations}
                  disabled={!settings.defaultMultiLocation}
                  onChange={(e) => updateSetting('defaultMaxLocations', Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                />
              </div>

              <div className="settings-feature-row">
                <div className="settings-feature-info">
                  <Users size={16} />
                  <div>
                    <div className="settings-feature-label">Default Max Employees</div>
                    <div className="settings-feature-desc">Maximum employee count for new customers</div>
                  </div>
                </div>
                <input
                  type="number"
                  className="settings-feature-input"
                  min={1}
                  max={999}
                  value={settings.defaultMaxEmployees}
                  onChange={(e) => updateSetting('defaultMaxEmployees', Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Positions */}
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

      {/* Data Management */}
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

      {/* About */}
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
