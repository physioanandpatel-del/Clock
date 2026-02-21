import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarOff, Plus, X, Check, XCircle, Clock } from 'lucide-react';
import { getInitials } from '../utils/helpers';
import { format } from 'date-fns';
import './Absences.css';

const TYPES = ['sick', 'vacation', 'personal', 'other'];
const TYPE_LABELS = { sick: 'Sick Day', vacation: 'Vacation', personal: 'Personal', other: 'Other' };
const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', denied: 'Denied' };

export default function Absences() {
  const { state, dispatch } = useApp();
  const { absences, employees, currentLocationId } = state;

  const locationEmployees = useMemo(() => employees.filter((e) => e.locationId === currentLocationId), [employees, currentLocationId]);
  const locationEmpIds = useMemo(() => new Set(locationEmployees.map((e) => e.id)), [locationEmployees]);

  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ employeeId: '', type: 'sick', startDate: '', endDate: '', notes: '' });

  const filtered = useMemo(() => {
    return absences
      .filter((a) => locationEmpIds.has(a.employeeId))
      .filter((a) => !filterStatus || a.status === filterStatus)
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [absences, locationEmpIds, filterStatus]);

  function openNew() {
    setFormData({ employeeId: locationEmployees[0]?.id || '', type: 'sick', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    dispatch({ type: 'ADD_ABSENCE', payload: { ...formData, status: 'pending' } });
    setShowModal(false);
  }

  function handleApprove(id) {
    dispatch({ type: 'UPDATE_ABSENCE', payload: { id, status: 'approved' } });
  }

  function handleDeny(id) {
    dispatch({ type: 'UPDATE_ABSENCE', payload: { id, status: 'denied' } });
  }

  function handleDelete(id) {
    if (window.confirm('Delete this absence request?')) {
      dispatch({ type: 'DELETE_ABSENCE', payload: id });
    }
  }

  return (
    <div className="absences-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Absences</h1>
          <p className="page-subtitle">Manage time-off requests</p>
        </div>
        <button className="btn btn--primary" onClick={openNew}>
          <Plus size={16} /> Request Absence
        </button>
      </div>

      <div className="absences-toolbar">
        <select className="form-input filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      <div className="absences-list">
        {filtered.length === 0 ? (
          <div className="card">
            <div className="card__body">
              <div className="empty-state">
                <CalendarOff size={40} className="empty-state__icon" />
                <p>No absence requests found</p>
              </div>
            </div>
          </div>
        ) : (
          filtered.map((absence) => {
            const emp = employees.find((e) => e.id === absence.employeeId);
            return (
              <div key={absence.id} className="absence-card">
                <div className="absence-card__left">
                  <div className="absence-card__avatar" style={{ background: emp?.color || '#94a3b8' }}>
                    {emp ? getInitials(emp.name) : '?'}
                  </div>
                  <div className="absence-card__info">
                    <div className="absence-card__name">{emp?.name || 'Unknown'}</div>
                    <div className="absence-card__meta">
                      <span className={`absence-type absence-type--${absence.type}`}>{TYPE_LABELS[absence.type]}</span>
                      <span>{absence.startDate} to {absence.endDate}</span>
                    </div>
                    {absence.notes && <div className="absence-card__notes">{absence.notes}</div>}
                  </div>
                </div>
                <div className="absence-card__right">
                  <span className={`badge badge--${absence.status}`}>{STATUS_LABELS[absence.status]}</span>
                  {absence.status === 'pending' && (
                    <div className="absence-card__actions">
                      <button className="btn btn--icon btn--sm btn--approve" onClick={() => handleApprove(absence.id)} title="Approve"><Check size={14} /></button>
                      <button className="btn btn--icon btn--sm btn--deny" onClick={() => handleDeny(absence.id)} title="Deny"><XCircle size={14} /></button>
                    </div>
                  )}
                  <button className="btn btn--icon btn--sm" onClick={() => handleDelete(absence.id)} title="Delete"><X size={14} /></button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Request Absence</h2>
              <button className="btn btn--icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Employee</label>
                  <select className="form-input" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} required>
                    {locationEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    {TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-input" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-input form-textarea" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Reason for absence..." rows={3} />
                </div>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">Submit Request</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
