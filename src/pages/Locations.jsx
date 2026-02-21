import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MapPin, Plus, Edit2, Trash2, X, CheckCircle } from 'lucide-react';
import './Locations.css';

export default function Locations() {
  const { state, dispatch } = useApp();
  const { locations, currentLocationId, employees } = state;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '', targetLaborPercent: '30', lat: '', lng: '', geofenceRadius: '200' });

  function openNew() {
    setEditing(null);
    setFormData({ name: '', address: '', phone: '', targetLaborPercent: '30', lat: '', lng: '', geofenceRadius: '200' });
    setShowModal(true);
  }

  function openEdit(loc) {
    setEditing(loc);
    setFormData({ name: loc.name, address: loc.address, phone: loc.phone, targetLaborPercent: String(loc.targetLaborPercent), lat: loc.lat ? String(loc.lat) : '', lng: loc.lng ? String(loc.lng) : '', geofenceRadius: String(loc.geofenceRadius || 200) });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...formData, targetLaborPercent: Number(formData.targetLaborPercent) || 30, lat: formData.lat ? Number(formData.lat) : null, lng: formData.lng ? Number(formData.lng) : null, geofenceRadius: Number(formData.geofenceRadius) || 200 };
    if (editing) {
      dispatch({ type: 'UPDATE_LOCATION', payload: { ...payload, id: editing.id } });
    } else {
      dispatch({ type: 'ADD_LOCATION', payload });
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    if (locations.length <= 1) return alert('You must have at least one location.');
    if (window.confirm('Delete this location? All associated employees, shifts, and data will be removed.')) {
      dispatch({ type: 'DELETE_LOCATION', payload: id });
    }
  }

  function switchLocation(id) {
    dispatch({ type: 'SET_LOCATION', payload: id });
  }

  return (
    <div className="locations-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">{locations.length} locations</p>
        </div>
        <button className="btn btn--primary" onClick={openNew}>
          <Plus size={16} /> Add Location
        </button>
      </div>

      <div className="locations-grid">
        {locations.map((loc) => {
          const empCount = employees.filter((e) => e.locationId === loc.id).length;
          const isActive = loc.id === currentLocationId;
          return (
            <div key={loc.id} className={`location-card ${isActive ? 'location-card--active' : ''}`}>
              <div className="location-card__header">
                <div className="location-card__icon">
                  <MapPin size={22} />
                </div>
                <div className="location-card__actions">
                  <button className="btn btn--icon btn--sm" onClick={() => openEdit(loc)}><Edit2 size={14} /></button>
                  <button className="btn btn--icon btn--sm" onClick={() => handleDelete(loc.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="location-card__body">
                <h3 className="location-card__name">{loc.name}</h3>
                {isActive && <span className="badge badge--green-dot">Active</span>}
                <p className="location-card__address">{loc.address}</p>
                <p className="location-card__phone">{loc.phone}</p>
                <div className="location-card__stats">
                  <span>{empCount} employees</span>
                  <span>Target: {loc.targetLaborPercent}% labor</span>
                  {loc.lat && loc.lng && <span>Geofence: {loc.geofenceRadius}m</span>}
                </div>
                {!isActive && (
                  <button className="btn btn--secondary location-card__switch" onClick={() => switchLocation(loc.id)}>
                    <CheckCircle size={14} /> Switch to this location
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{editing ? 'Edit Location' : 'Add Location'}</h2>
              <button className="btn btn--icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Location Name</label>
                  <input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Downtown" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input type="text" className="form-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main St" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="tel" className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="555-1000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Labor %</label>
                    <input type="number" className="form-input" value={formData.targetLaborPercent} onChange={(e) => setFormData({ ...formData, targetLaborPercent: e.target.value })} placeholder="30" min="1" max="100" required />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Geofencing</label>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Set coordinates and radius to restrict clock-ins to this location area.</p>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input type="number" step="any" className="form-input" value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} placeholder="43.6532" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input type="number" step="any" className="form-input" value={formData.lng} onChange={(e) => setFormData({ ...formData, lng: e.target.value })} placeholder="-79.3832" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Radius (m)</label>
                    <input type="number" className="form-input" value={formData.geofenceRadius} onChange={(e) => setFormData({ ...formData, geofenceRadius: e.target.value })} placeholder="200" min="10" />
                  </div>
                </div>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">{editing ? 'Save Changes' : 'Add Location'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
