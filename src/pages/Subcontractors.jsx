import { useState, useMemo } from 'react';
import { useApp, hasAccess } from '../context/AppContext';
import { format, parseISO, subDays, startOfYear } from 'date-fns';
import {
  Plus, X, Trash2, Edit3, DollarSign, FileText, Clock, UserCheck,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Upload,
} from 'lucide-react';
import { getInitials, generateId } from '../utils/helpers';
import './Subcontractors.css';

const DOC_TYPES = ['contract', 'insurance', 'license', 'tax', 'other'];
const DOC_TYPE_LABELS = { contract: 'Contract', insurance: 'Insurance', license: 'License', tax: 'Tax Form', other: 'Other' };

export default function Subcontractors() {
  const { state, dispatch } = useApp();
  const { subcontractors = [], subcontractorRevenue = [], subcontractorPayments = [], currentLocationId, locations, employees, currentUserId, timeEntries = [] } = state;
  const currentUser = employees.find((e) => e.id === currentUserId);
  const userAccess = currentUser?.accessLevel || 'employee';
  const isManager = hasAccess(userAccess, 'manager');

  const locationSubs = subcontractors.filter((s) => (s.locationIds || []).includes(currentLocationId));

  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [expandedSub, setExpandedSub] = useState(null);
  const [activeTab, setActiveTab] = useState('revenue'); // revenue, documents, payments
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [revenueSubId, setRevenueSubId] = useState(null);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', commissionType: 'percentage', commissionRate: 60,
    specialties: '', timeTrackingEnabled: false, notes: '', status: 'active',
  });
  const [revForm, setRevForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', visits: '', description: '' });
  const [payForm, setPayForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', period: '', notes: '' });
  const [docForm, setDocForm] = useState({ name: '', type: 'contract', expiryDate: '' });

  const COLORS = ['#7c3aed', '#059669', '#dc2626', '#2563eb', '#ea580c', '#0891b2', '#be185d'];

  // YTD calculations
  const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');

  function getSubStats(subId) {
    const sub = subcontractors.find((s) => s.id === subId);
    if (!sub) return {};
    const allRev = subcontractorRevenue.filter((r) => r.subcontractorId === subId);
    const ytdRev = allRev.filter((r) => r.date >= yearStart);
    const totalRevenue = ytdRev.reduce((sum, r) => sum + r.amount, 0);
    const totalVisits = ytdRev.reduce((sum, r) => sum + (r.visits || 0), 0);
    const commission = sub.commissionType === 'percentage'
      ? totalRevenue * (sub.commissionRate / 100)
      : totalVisits * sub.commissionRate;
    const ytdPayments = subcontractorPayments.filter((p) => p.subcontractorId === subId && p.date >= yearStart);
    const totalPaid = ytdPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = commission - totalPaid;
    return { totalRevenue, totalVisits, commission, totalPaid, outstanding };
  }

  function openNew() {
    setEditingSub(null);
    setForm({ name: '', email: '', phone: '', commissionType: 'percentage', commissionRate: 60, specialties: '', timeTrackingEnabled: false, notes: '', status: 'active' });
    setShowModal(true);
  }

  function openEdit(sub) {
    setEditingSub(sub);
    setForm({
      name: sub.name, email: sub.email || '', phone: sub.phone || '',
      commissionType: sub.commissionType, commissionRate: sub.commissionRate,
      specialties: (sub.specialties || []).join(', '), timeTrackingEnabled: sub.timeTrackingEnabled || false,
      notes: sub.notes || '', status: sub.status || 'active',
    });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      name: form.name, email: form.email, phone: form.phone,
      commissionType: form.commissionType, commissionRate: Number(form.commissionRate),
      specialties: form.specialties.split(',').map((s) => s.trim()).filter(Boolean),
      timeTrackingEnabled: form.timeTrackingEnabled, notes: form.notes, status: form.status,
      locationIds: [currentLocationId],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      documents: editingSub?.documents || [],
    };
    if (editingSub) {
      dispatch({ type: 'UPDATE_SUBCONTRACTOR', payload: { ...payload, id: editingSub.id, locationIds: editingSub.locationIds, color: editingSub.color, documents: editingSub.documents } });
    } else {
      dispatch({ type: 'ADD_SUBCONTRACTOR', payload });
    }
    setShowModal(false);
  }

  function handleAddRevenue(e) {
    e.preventDefault();
    dispatch({
      type: 'ADD_SUBCONTRACTOR_REVENUE',
      payload: { subcontractorId: revenueSubId, date: revForm.date, amount: Number(revForm.amount), visits: Number(revForm.visits) || 0, description: revForm.description },
    });
    setShowRevenueModal(false);
    setRevForm({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', visits: '', description: '' });
  }

  function handleAddPayment(e) {
    e.preventDefault();
    dispatch({
      type: 'ADD_SUBCONTRACTOR_PAYMENT',
      payload: { subcontractorId: revenueSubId, date: payForm.date, amount: Number(payForm.amount), period: payForm.period, notes: payForm.notes },
    });
    setShowPaymentModal(false);
    setPayForm({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', period: '', notes: '' });
  }

  function handleAddDoc(e) {
    e.preventDefault();
    const sub = subcontractors.find((s) => s.id === revenueSubId);
    if (!sub) return;
    const newDoc = { id: generateId(), name: docForm.name, type: docForm.type, uploadDate: format(new Date(), 'yyyy-MM-dd'), expiryDate: docForm.expiryDate || null, status: 'valid' };
    dispatch({ type: 'UPDATE_SUBCONTRACTOR', payload: { id: sub.id, documents: [...(sub.documents || []), newDoc] } });
    setShowDocModal(false);
    setDocForm({ name: '', type: 'contract', expiryDate: '' });
  }

  function handleDeleteDoc(subId, docId) {
    const sub = subcontractors.find((s) => s.id === subId);
    if (!sub) return;
    dispatch({ type: 'UPDATE_SUBCONTRACTOR', payload: { id: sub.id, documents: (sub.documents || []).filter((d) => d.id !== docId) } });
  }

  return (
    <div className="subcontractors-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subcontractors</h1>
          <p className="page-subtitle">{locationSubs.length} subcontractor{locationSubs.length !== 1 ? 's' : ''} at this location</p>
        </div>
        {isManager && (
          <button className="btn btn--primary" onClick={openNew}>
            <Plus size={16} /> Add Subcontractor
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {locationSubs.length > 0 && (
        <div className="sub-summary-cards">
          <div className="sub-summary-card">
            <DollarSign size={20} />
            <div>
              <div className="sub-summary-card__value">
                ${locationSubs.reduce((sum, s) => sum + (getSubStats(s.id).totalRevenue || 0), 0).toLocaleString()}
              </div>
              <div className="sub-summary-card__label">YTD Revenue</div>
            </div>
          </div>
          <div className="sub-summary-card">
            <UserCheck size={20} />
            <div>
              <div className="sub-summary-card__value">
                ${locationSubs.reduce((sum, s) => sum + (getSubStats(s.id).commission || 0), 0).toLocaleString()}
              </div>
              <div className="sub-summary-card__label">YTD Commission</div>
            </div>
          </div>
          <div className="sub-summary-card sub-summary-card--alert">
            <AlertTriangle size={20} />
            <div>
              <div className="sub-summary-card__value">
                ${locationSubs.reduce((sum, s) => sum + Math.max(0, getSubStats(s.id).outstanding || 0), 0).toLocaleString()}
              </div>
              <div className="sub-summary-card__label">Outstanding</div>
            </div>
          </div>
        </div>
      )}

      {/* Subcontractor List */}
      {locationSubs.length === 0 ? (
        <div className="empty-state">
          <UserCheck size={48} className="empty-state__icon" />
          <h3>No Subcontractors</h3>
          <p>Add subcontractors to track revenue, commissions, and documents.</p>
        </div>
      ) : (
        <div className="sub-list">
          {locationSubs.map((sub) => {
            const stats = getSubStats(sub.id);
            const isExpanded = expandedSub === sub.id;
            const subRevEntries = subcontractorRevenue.filter((r) => r.subcontractorId === sub.id).sort((a, b) => b.date.localeCompare(a.date));
            const subPayEntries = subcontractorPayments.filter((p) => p.subcontractorId === sub.id).sort((a, b) => b.date.localeCompare(a.date));
            const expiringDocs = (sub.documents || []).filter((d) => d.expiryDate && d.expiryDate <= format(new Date(), 'yyyy-MM-dd'));

            return (
              <div key={sub.id} className={`sub-card ${sub.status === 'inactive' ? 'sub-card--inactive' : ''}`}>
                <div className="sub-card__main" onClick={() => setExpandedSub(isExpanded ? null : sub.id)}>
                  <div className="sub-card__avatar" style={{ background: sub.color }}>
                    {getInitials(sub.name)}
                  </div>
                  <div className="sub-card__info">
                    <div className="sub-card__name">
                      {sub.name}
                      {sub.status === 'inactive' && <span className="badge badge--inactive">Inactive</span>}
                      {sub.timeTrackingEnabled && <span className="badge badge--time"><Clock size={10} /> Time Tracked</span>}
                    </div>
                    <div className="sub-card__specialties">{(sub.specialties || []).join(' / ')}</div>
                    <div className="sub-card__commission">
                      {sub.commissionType === 'percentage' ? `${sub.commissionRate}% revenue split` : `$${sub.commissionRate} per visit`}
                    </div>
                  </div>
                  <div className="sub-card__stats">
                    <div className="sub-card__stat">
                      <span className="sub-card__stat-value">${(stats.totalRevenue || 0).toLocaleString()}</span>
                      <span className="sub-card__stat-label">YTD Revenue</span>
                    </div>
                    <div className="sub-card__stat">
                      <span className="sub-card__stat-value">${(stats.commission || 0).toLocaleString()}</span>
                      <span className="sub-card__stat-label">Commission</span>
                    </div>
                    <div className="sub-card__stat">
                      <span className={`sub-card__stat-value ${(stats.outstanding || 0) > 0 ? 'sub-card__stat-value--alert' : ''}`}>
                        ${(stats.outstanding || 0).toLocaleString()}
                      </span>
                      <span className="sub-card__stat-label">Outstanding</span>
                    </div>
                  </div>
                  <div className="sub-card__actions-right">
                    {expiringDocs.length > 0 && (
                      <span className="sub-card__doc-alert" title={`${expiringDocs.length} expired document(s)`}>
                        <AlertTriangle size={14} />
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="sub-card__expanded">
                    <div className="sub-tabs">
                      <button className={`sub-tab ${activeTab === 'revenue' ? 'sub-tab--active' : ''}`} onClick={() => setActiveTab('revenue')}>
                        <DollarSign size={14} /> Revenue
                      </button>
                      <button className={`sub-tab ${activeTab === 'documents' ? 'sub-tab--active' : ''}`} onClick={() => setActiveTab('documents')}>
                        <FileText size={14} /> Documents {expiringDocs.length > 0 && <span className="sub-tab__badge">{expiringDocs.length}</span>}
                      </button>
                      <button className={`sub-tab ${activeTab === 'payments' ? 'sub-tab--active' : ''}`} onClick={() => setActiveTab('payments')}>
                        <DollarSign size={14} /> Payments
                      </button>
                      {isManager && (
                        <div className="sub-tabs__actions">
                          <button className="btn btn--secondary btn--sm" onClick={() => openEdit(sub)}>
                            <Edit3 size={12} /> Edit
                          </button>
                          <button className="btn btn--danger btn--sm" onClick={() => dispatch({ type: 'DELETE_SUBCONTRACTOR', payload: sub.id })}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {activeTab === 'revenue' && (
                      <div className="sub-detail-section">
                        <div className="sub-detail-header">
                          <h4>Revenue Entries</h4>
                          {isManager && (
                            <button className="btn btn--primary btn--sm" onClick={() => { setRevenueSubId(sub.id); setShowRevenueModal(true); }}>
                              <Plus size={12} /> Add Revenue
                            </button>
                          )}
                        </div>
                        {subRevEntries.length === 0 ? (
                          <p className="sub-empty">No revenue entries yet.</p>
                        ) : (
                          <table className="sub-table">
                            <thead>
                              <tr><th>Date</th><th>Description</th><th>Visits</th><th>Amount</th><th>Commission</th></tr>
                            </thead>
                            <tbody>
                              {subRevEntries.slice(0, 20).map((r) => {
                                const comm = sub.commissionType === 'percentage' ? r.amount * (sub.commissionRate / 100) : (r.visits || 0) * sub.commissionRate;
                                return (
                                  <tr key={r.id}>
                                    <td>{format(parseISO(r.date), 'MMM d, yyyy')}</td>
                                    <td>{r.description}</td>
                                    <td>{r.visits || '-'}</td>
                                    <td>${r.amount.toLocaleString()}</td>
                                    <td>${comm.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {activeTab === 'documents' && (
                      <div className="sub-detail-section">
                        <div className="sub-detail-header">
                          <h4>Documents</h4>
                          {isManager && (
                            <button className="btn btn--primary btn--sm" onClick={() => { setRevenueSubId(sub.id); setShowDocModal(true); }}>
                              <Upload size={12} /> Add Document
                            </button>
                          )}
                        </div>
                        {(sub.documents || []).length === 0 ? (
                          <p className="sub-empty">No documents uploaded.</p>
                        ) : (
                          <div className="sub-doc-list">
                            {(sub.documents || []).map((doc) => {
                              const isExpired = doc.expiryDate && doc.expiryDate <= format(new Date(), 'yyyy-MM-dd');
                              return (
                                <div key={doc.id} className={`sub-doc ${isExpired ? 'sub-doc--expired' : ''}`}>
                                  <FileText size={16} />
                                  <div className="sub-doc__info">
                                    <span className="sub-doc__name">{doc.name}</span>
                                    <span className="sub-doc__meta">
                                      {DOC_TYPE_LABELS[doc.type] || doc.type}
                                      {doc.expiryDate && ` - Expires: ${format(parseISO(doc.expiryDate), 'MMM d, yyyy')}`}
                                    </span>
                                  </div>
                                  {isExpired ? (
                                    <span className="sub-doc__badge sub-doc__badge--expired"><AlertTriangle size={10} /> Expired</span>
                                  ) : (
                                    <span className="sub-doc__badge sub-doc__badge--valid"><CheckCircle size={10} /> Valid</span>
                                  )}
                                  {isManager && (
                                    <button className="btn btn--icon btn--sm" onClick={() => handleDeleteDoc(sub.id, doc.id)}>
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'payments' && (
                      <div className="sub-detail-section">
                        <div className="sub-detail-header">
                          <h4>Commission Payments</h4>
                          {isManager && (
                            <button className="btn btn--primary btn--sm" onClick={() => { setRevenueSubId(sub.id); setShowPaymentModal(true); }}>
                              <Plus size={12} /> Record Payment
                            </button>
                          )}
                        </div>
                        <div className="sub-payment-summary">
                          <span>YTD Paid: <strong>${(stats.totalPaid || 0).toLocaleString()}</strong></span>
                          <span>Outstanding: <strong className={(stats.outstanding || 0) > 0 ? 'text-danger' : ''}>${(stats.outstanding || 0).toLocaleString()}</strong></span>
                        </div>
                        {subPayEntries.length === 0 ? (
                          <p className="sub-empty">No payments recorded.</p>
                        ) : (
                          <table className="sub-table">
                            <thead>
                              <tr><th>Date</th><th>Period</th><th>Amount</th><th>Notes</th></tr>
                            </thead>
                            <tbody>
                              {subPayEntries.map((p) => (
                                <tr key={p.id}>
                                  <td>{format(parseISO(p.date), 'MMM d, yyyy')}</td>
                                  <td>{p.period}</td>
                                  <td>${p.amount.toLocaleString()}</td>
                                  <td>{p.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Subcontractor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{editingSub ? 'Edit Subcontractor' : 'Add Subcontractor'}</h2>
              <button className="btn btn--icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Commission Type</label>
                    <select className="form-input" value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })}>
                      <option value="percentage">Percentage Split</option>
                      <option value="fixed">Fixed Per Visit</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{form.commissionType === 'percentage' ? 'Commission %' : 'Amount Per Visit ($)'}</label>
                    <input type="number" className="form-input" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} min="0" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Specialties (comma separated)</label>
                  <input className="form-input" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="e.g. Physiotherapy, Sports Rehab" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={form.timeTrackingEnabled} onChange={(e) => setForm({ ...form, timeTrackingEnabled: e.target.checked })} />
                    Enable Time Tracking
                  </label>
                  <p className="form-hint">When enabled, subcontractor can clock in/out. Commission still calculates from revenue.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-input form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
              </div>
              <div className="modal__footer">
                {editingSub && (
                  <button type="button" className="btn btn--danger" onClick={() => { dispatch({ type: 'DELETE_SUBCONTRACTOR', payload: editingSub.id }); setShowModal(false); }}>
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">{editingSub ? 'Save Changes' : 'Add Subcontractor'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Revenue Modal */}
      {showRevenueModal && (
        <div className="modal-overlay" onClick={() => setShowRevenueModal(false)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Add Revenue Entry</h2>
              <button className="btn btn--icon" onClick={() => setShowRevenueModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddRevenue}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={revForm.date} onChange={(e) => setRevForm({ ...revForm, date: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount ($)</label>
                    <input type="number" className="form-input" value={revForm.amount} onChange={(e) => setRevForm({ ...revForm, amount: e.target.value })} min="0" step="0.01" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Visits</label>
                    <input type="number" className="form-input" value={revForm.visits} onChange={(e) => setRevForm({ ...revForm, visits: e.target.value })} min="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" value={revForm.description} onChange={(e) => setRevForm({ ...revForm, description: e.target.value })} placeholder="e.g. Physiotherapy sessions" />
                </div>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowRevenueModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">Add Revenue</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Record Payment</h2>
              <button className="btn btn--icon" onClick={() => setShowPaymentModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddPayment}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount ($)</label>
                  <input type="number" className="form-input" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} min="0" step="0.01" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Period</label>
                  <input className="form-input" value={payForm.period} onChange={(e) => setPayForm({ ...payForm, period: e.target.value })} placeholder="e.g. January 2025" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">Record Payment</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showDocModal && (
        <div className="modal-overlay" onClick={() => setShowDocModal(false)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Add Document</h2>
              <button className="btn btn--icon" onClick={() => setShowDocModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddDoc}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Document Name</label>
                  <input className="form-input" value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} required placeholder="e.g. Service Agreement 2025" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={docForm.type} onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}>
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date (optional)</label>
                  <input type="date" className="form-input" value={docForm.expiryDate} onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })} />
                </div>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowDocModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">Add Document</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
