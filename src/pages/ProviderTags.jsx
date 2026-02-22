import { useState, useMemo } from 'react';
import { useApp, hasAccess } from '../context/AppContext';
import { format, parseISO, isWithinInterval, startOfYear } from 'date-fns';
import {
  Plus, X, Trash2, Edit3, Users, Link2, Calendar, DollarSign,
  AlertTriangle, CheckCircle, Clock, ArrowRight, TrendingUp,
} from 'lucide-react';
import { getInitials, getEffectiveRate } from '../utils/helpers';
import './ProviderTags.css';

export default function ProviderTags() {
  const { state, dispatch } = useApp();
  const {
    subcontractors = [], providerAssistantTags = [], employees,
    currentLocationId, currentUserId, shifts = [], subcontractorRevenue = [],
  } = state;
  const currentUser = employees.find((e) => e.id === currentUserId);
  const userAccess = currentUser?.accessLevel || 'employee';
  const isManager = hasAccess(userAccess, 'manager');

  const locationSubs = subcontractors.filter((s) => (s.locationIds || []).includes(currentLocationId));
  const locationEmployees = employees.filter((e) => (e.locationIds || []).includes(currentLocationId));

  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [form, setForm] = useState({
    providerId: '', assistantId: '', startDate: '', endDate: '', notes: '',
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  // Enrich tags with provider/assistant data and cost info
  const enrichedTags = useMemo(() => {
    return providerAssistantTags
      .filter((t) => {
        const provider = subcontractors.find((s) => s.id === t.providerId);
        return provider && (provider.locationIds || []).includes(currentLocationId);
      })
      .map((tag) => {
        const provider = subcontractors.find((s) => s.id === tag.providerId);
        const assistant = employees.find((e) => e.id === tag.assistantId);
        const isActive = tag.startDate <= today && (!tag.endDate || tag.endDate >= today);

        // Calculate assistant cost during this tag period
        const tagStart = tag.startDate;
        const tagEnd = tag.endDate || today;
        const assistantShifts = shifts.filter((s) =>
          s.employeeId === tag.assistantId &&
          s.start >= tagStart &&
          s.start <= tagEnd
        );
        const totalHours = assistantShifts.reduce((sum, s) => {
          return sum + (new Date(s.end) - new Date(s.start)) / (1000 * 60 * 60);
        }, 0);
        const assistantCost = assistant ? totalHours * getEffectiveRate(assistant) : 0;

        // Provider revenue in the same period
        const providerRev = subcontractorRevenue
          .filter((r) => r.subcontractorId === tag.providerId && r.date >= tagStart && r.date <= tagEnd)
          .reduce((sum, r) => sum + r.amount, 0);

        return { ...tag, provider, assistant, isActive, totalHours, assistantCost, providerRev };
      })
      .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0) || b.startDate.localeCompare(a.startDate));
  }, [providerAssistantTags, subcontractors, employees, shifts, subcontractorRevenue, currentLocationId, today]);

  const activeCount = enrichedTags.filter((t) => t.isActive).length;

  function openNew() {
    setEditingTag(null);
    setForm({ providerId: locationSubs[0]?.id || '', assistantId: '', startDate: today, endDate: '', notes: '' });
    setShowModal(true);
  }

  function openEdit(tag) {
    setEditingTag(tag);
    setForm({
      providerId: tag.providerId, assistantId: tag.assistantId,
      startDate: tag.startDate, endDate: tag.endDate || '', notes: tag.notes || '',
    });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      providerId: form.providerId, assistantId: form.assistantId,
      startDate: form.startDate, endDate: form.endDate || null, notes: form.notes,
    };
    if (editingTag) {
      dispatch({ type: 'UPDATE_PROVIDER_TAG', payload: { ...payload, id: editingTag.id } });
    } else {
      dispatch({ type: 'ADD_PROVIDER_TAG', payload });
    }
    setShowModal(false);
  }

  // Group by provider
  const byProvider = useMemo(() => {
    const map = {};
    enrichedTags.forEach((tag) => {
      if (!map[tag.providerId]) map[tag.providerId] = { provider: tag.provider, tags: [] };
      map[tag.providerId].tags.push(tag);
    });
    return Object.values(map);
  }, [enrichedTags]);

  return (
    <div className="provider-tags-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Provider-Assistant Tags</h1>
          <p className="page-subtitle">{activeCount} active assignment{activeCount !== 1 ? 's' : ''}</p>
        </div>
        {isManager && (
          <button className="btn btn--primary" onClick={openNew}>
            <Plus size={16} /> Add Assignment
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="pt-summary">
        <div className="pt-summary-card">
          <Link2 size={20} />
          <div>
            <div className="pt-summary-card__value">{enrichedTags.length}</div>
            <div className="pt-summary-card__label">Total Assignments</div>
          </div>
        </div>
        <div className="pt-summary-card pt-summary-card--success">
          <CheckCircle size={20} />
          <div>
            <div className="pt-summary-card__value">{activeCount}</div>
            <div className="pt-summary-card__label">Active Now</div>
          </div>
        </div>
        <div className="pt-summary-card">
          <DollarSign size={20} />
          <div>
            <div className="pt-summary-card__value">
              ${enrichedTags.filter((t) => t.isActive).reduce((s, t) => s + t.assistantCost, 0).toLocaleString()}
            </div>
            <div className="pt-summary-card__label">Active Assistant Cost</div>
          </div>
        </div>
      </div>

      {/* Provider Groups */}
      {byProvider.length === 0 ? (
        <div className="empty-state">
          <Link2 size={48} className="empty-state__icon" />
          <h3>No Assignments</h3>
          <p>Tag assistants to providers for specific time periods to track cost allocation.</p>
        </div>
      ) : (
        <div className="pt-groups">
          {byProvider.map((group) => (
            <div key={group.provider?.id || 'unknown'} className="pt-group">
              <div className="pt-group__header">
                <div className="pt-group__provider-info">
                  <div className="pt-group__avatar" style={{ background: group.provider?.color || '#94a3b8' }}>
                    {getInitials(group.provider?.name || '?')}
                  </div>
                  <div>
                    <div className="pt-group__provider-name">{group.provider?.name || 'Unknown Provider'}</div>
                    <div className="pt-group__provider-meta">
                      {(group.provider?.specialties || []).join(' / ')}
                      {' - '}
                      {group.provider?.commissionType === 'percentage' ? `${group.provider?.commissionRate}% split` : `$${group.provider?.commissionRate}/visit`}
                    </div>
                  </div>
                </div>
                <div className="pt-group__summary">
                  <span>{group.tags.filter((t) => t.isActive).length} active</span>
                </div>
              </div>

              <div className="pt-tag-list">
                {group.tags.map((tag) => {
                  const assistant = tag.assistant;
                  return (
                    <div key={tag.id} className={`pt-tag-card ${tag.isActive ? 'pt-tag-card--active' : 'pt-tag-card--inactive'}`}>
                      <div className="pt-tag-card__link">
                        <div className="pt-tag-card__person">
                          <div className="pt-tag-card__small-avatar" style={{ background: assistant?.color || '#94a3b8' }}>
                            {getInitials(assistant?.name || '?')}
                          </div>
                          <div>
                            <div className="pt-tag-card__name">{assistant?.name || 'Unknown'}</div>
                            <div className="pt-tag-card__role">{(assistant?.roles || []).join(', ')}</div>
                          </div>
                        </div>
                        <div className="pt-tag-card__dates">
                          <Calendar size={12} />
                          {tag.startDate ? format(parseISO(tag.startDate), 'MMM d, yyyy') : '?'}
                          <ArrowRight size={12} />
                          {tag.endDate ? format(parseISO(tag.endDate), 'MMM d, yyyy') : 'Ongoing'}
                        </div>
                      </div>
                      <div className="pt-tag-card__stats">
                        <div className="pt-tag-stat">
                          <Clock size={12} />
                          <span>{tag.totalHours.toFixed(1)}h</span>
                        </div>
                        <div className="pt-tag-stat">
                          <DollarSign size={12} />
                          <span>${tag.assistantCost.toLocaleString()} cost</span>
                        </div>
                        {tag.providerRev > 0 && (
                          <div className="pt-tag-stat">
                            <TrendingUp size={12} />
                            <span>${tag.providerRev.toLocaleString()} rev</span>
                          </div>
                        )}
                        <span className={`pt-tag-badge ${tag.isActive ? 'pt-tag-badge--active' : 'pt-tag-badge--ended'}`}>
                          {tag.isActive ? 'Active' : 'Ended'}
                        </span>
                      </div>
                      {tag.notes && <div className="pt-tag-card__notes">{tag.notes}</div>}
                      {isManager && (
                        <div className="pt-tag-card__actions">
                          <button className="btn btn--secondary btn--sm" onClick={() => openEdit(tag)}>
                            <Edit3 size={12} /> Edit
                          </button>
                          <button className="btn btn--danger btn--sm" onClick={() => dispatch({ type: 'DELETE_PROVIDER_TAG', payload: tag.id })}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Assignment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{editingTag ? 'Edit Assignment' : 'New Provider-Assistant Assignment'}</h2>
              <button className="btn btn--icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Provider (Subcontractor)</label>
                  <select className="form-input" value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })} required>
                    <option value="">Select provider</option>
                    {locationSubs.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} - {(s.specialties || []).join(', ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assistant (Employee)</label>
                  <select className="form-input" value={form.assistantId} onChange={(e) => setForm({ ...form, assistantId: e.target.value })} required>
                    <option value="">Select assistant</option>
                    {locationEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} - {(emp.roles || []).join(', ')}</option>
                    ))}
                  </select>
                  <p className="form-hint">The employee who assists this provider. Their cost will be tracked against the provider's revenue.</p>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date (optional)</label>
                    <input type="date" className="form-input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                    <p className="form-hint">Leave blank for ongoing assignment</p>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-input form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="e.g. Morning physio sessions" />
                </div>
              </div>
              <div className="modal__footer">
                {editingTag && (
                  <button type="button" className="btn btn--danger" onClick={() => { dispatch({ type: 'DELETE_PROVIDER_TAG', payload: editingTag.id }); setShowModal(false); }}>
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">{editingTag ? 'Save Changes' : 'Create Assignment'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
