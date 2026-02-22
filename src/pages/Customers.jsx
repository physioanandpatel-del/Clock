import { useState, useMemo } from 'react';
import { Search, Plus, X, Building2, Mail, Phone, MapPin, Edit2, Trash2, Eye, DollarSign } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';
import './Customers.css';

export default function Customers() {
  const { state, dispatch } = useApp();
  const customers = state.customers || [];
  const invoices = state.invoices || [];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '', city: '', province: '', postalCode: '', notes: '', status: 'active', plan: 'basic' });

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || (c.company || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [customers, search, statusFilter]);

  const openAdd = () => {
    setEditingCustomer(null);
    setForm({ name: '', email: '', phone: '', company: '', address: '', city: '', province: '', postalCode: '', notes: '', status: 'active', plan: 'basic' });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditingCustomer(c);
    setForm({ name: c.name, email: c.email, phone: c.phone || '', company: c.company || '', address: c.address || '', city: c.city || '', province: c.province || '', postalCode: c.postalCode || '', notes: c.notes || '', status: c.status, plan: c.plan || 'basic' });
    setShowModal(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    if (editingCustomer) {
      dispatch({ type: 'UPDATE_CUSTOMER', payload: { ...editingCustomer, ...form } });
    } else {
      dispatch({ type: 'ADD_CUSTOMER', payload: { ...form, createdDate: new Date().toISOString().split('T')[0] } });
    }
    setShowModal(false);
  };

  const deleteCustomer = (id) => {
    if (window.confirm('Delete this customer? This will also remove their invoices.')) {
      dispatch({ type: 'DELETE_CUSTOMER', payload: id });
    }
  };

  const getCustomerRevenue = (customerId) => {
    return invoices.filter((inv) => inv.customerId === customerId && inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
  };

  const getCustomerInvoiceCount = (customerId) => {
    return invoices.filter((inv) => inv.customerId === customerId).length;
  };

  const statusColors = { active: 'var(--success)', inactive: 'var(--text-light)', suspended: 'var(--danger)' };
  const planLabels = { basic: 'Basic', professional: 'Professional', enterprise: 'Enterprise' };

  return (
    <div className="customers-page">
      <div className="page-header">
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Customer</button>
      </div>

      <div className="customers-toolbar">
        <div className="customers-search">
          <Search size={16} />
          <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="customers-filters">
          {['all', 'active', 'inactive', 'suspended'].map((s) => (
            <button key={s} className={`filter-btn ${statusFilter === s ? 'filter-btn--active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} {s === 'all' ? `(${customers.length})` : `(${customers.filter((c) => c.status === s).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="customers-stats">
        <div className="stat-card">
          <div className="stat-card__value">{customers.length}</div>
          <div className="stat-card__label">Total Customers</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{customers.filter((c) => c.status === 'active').length}</div>
          <div className="stat-card__label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">${invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0).toLocaleString()}</div>
          <div className="stat-card__label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">${invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + i.total, 0).toLocaleString()}</div>
          <div className="stat-card__label">Outstanding</div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Building2 size={48} />
          <p>No customers found</p>
          <button className="btn btn-primary" onClick={openAdd}>Add First Customer</button>
        </div>
      ) : (
        <div className="customers-grid">
          {filtered.map((c) => (
            <div key={c.id} className="customer-card">
              <div className="customer-card__header">
                <div className="customer-card__avatar" style={{ background: c.status === 'active' ? 'var(--primary)' : 'var(--text-light)' }}>
                  {c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="customer-card__info">
                  <h3>{c.name}</h3>
                  {c.company && <span className="customer-card__company">{c.company}</span>}
                </div>
                <span className="status-badge" style={{ background: statusColors[c.status] + '20', color: statusColors[c.status] }}>
                  {c.status}
                </span>
              </div>
              <div className="customer-card__details">
                {c.email && <div className="customer-card__detail"><Mail size={14} /> {c.email}</div>}
                {c.phone && <div className="customer-card__detail"><Phone size={14} /> {c.phone}</div>}
                {c.city && <div className="customer-card__detail"><MapPin size={14} /> {c.city}{c.province ? `, ${c.province}` : ''}</div>}
              </div>
              <div className="customer-card__meta">
                <div className="customer-card__meta-item">
                  <span className="meta-label">Plan</span>
                  <span className="meta-value plan-badge">{planLabels[c.plan] || c.plan}</span>
                </div>
                <div className="customer-card__meta-item">
                  <span className="meta-label">Revenue</span>
                  <span className="meta-value">${getCustomerRevenue(c.id).toLocaleString()}</span>
                </div>
                <div className="customer-card__meta-item">
                  <span className="meta-label">Invoices</span>
                  <span className="meta-value">{getCustomerInvoiceCount(c.id)}</span>
                </div>
              </div>
              <div className="customer-card__actions">
                <button className="btn-icon" title="View" onClick={() => setViewCustomer(c)}><Eye size={16} /></button>
                <button className="btn-icon" title="Edit" onClick={() => openEdit(c)}><Edit2 size={16} /></button>
                <button className="btn-icon btn-icon--danger" title="Delete" onClick={() => deleteCustomer(c.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Customer Detail Modal */}
      {viewCustomer && (
        <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Customer Details</h2>
              <button className="btn-icon" onClick={() => setViewCustomer(null)}><X size={20} /></button>
            </div>
            <div className="modal__body">
              <div className="customer-detail">
                <div className="customer-detail__header">
                  <div className="customer-card__avatar customer-card__avatar--lg" style={{ background: 'var(--primary)' }}>
                    {viewCustomer.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h2>{viewCustomer.name}</h2>
                    {viewCustomer.company && <p className="text-secondary">{viewCustomer.company}</p>}
                    <span className="status-badge" style={{ background: statusColors[viewCustomer.status] + '20', color: statusColors[viewCustomer.status] }}>{viewCustomer.status}</span>
                  </div>
                </div>

                <div className="customer-detail__grid">
                  <div className="detail-section">
                    <h4>Contact Information</h4>
                    <div className="detail-row"><Mail size={14} /> {viewCustomer.email}</div>
                    {viewCustomer.phone && <div className="detail-row"><Phone size={14} /> {viewCustomer.phone}</div>}
                    {viewCustomer.address && <div className="detail-row"><MapPin size={14} /> {viewCustomer.address}, {viewCustomer.city}, {viewCustomer.province} {viewCustomer.postalCode}</div>}
                  </div>

                  <div className="detail-section">
                    <h4>Account</h4>
                    <div className="detail-row"><Building2 size={14} /> Plan: {planLabels[viewCustomer.plan] || viewCustomer.plan}</div>
                    <div className="detail-row"><DollarSign size={14} /> Total Revenue: ${getCustomerRevenue(viewCustomer.id).toLocaleString()}</div>
                    <div className="detail-row">Customer since: {formatDate(viewCustomer.createdDate)}</div>
                  </div>
                </div>

                {viewCustomer.notes && (
                  <div className="detail-section">
                    <h4>Notes</h4>
                    <p>{viewCustomer.notes}</p>
                  </div>
                )}

                <div className="detail-section">
                  <h4>Recent Invoices</h4>
                  {invoices.filter((i) => i.customerId === viewCustomer.id).length === 0 ? (
                    <p className="text-secondary">No invoices yet</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {invoices.filter((i) => i.customerId === viewCustomer.id).slice(0, 5).map((inv) => (
                          <tr key={inv.id}>
                            <td>{inv.invoiceNumber}</td>
                            <td>{formatDate(inv.date)}</td>
                            <td>${inv.total.toLocaleString()}</td>
                            <td><span className={`status-badge status-badge--${inv.status}`}>{inv.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="555-0000" />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
                </div>
                <div className="form-group">
                  <label>Province</label>
                  <input type="text" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Province" />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input type="text" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="M5V 1A1" />
                </div>
                <div className="form-group">
                  <label>Plan</label>
                  <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="form-group form-group--full">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Additional notes..." />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editingCustomer ? 'Update' : 'Add'} Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
