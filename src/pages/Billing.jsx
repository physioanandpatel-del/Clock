import { useState, useMemo } from 'react';
import { Plus, X, Search, FileText, DollarSign, Send, Eye, Trash2, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';
import './Billing.css';

export default function Billing() {
  const { state, dispatch } = useApp();
  const invoices = state.invoices || [];
  const customers = state.customers || [];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [form, setForm] = useState({ customerId: '', items: [{ description: '', quantity: 1, rate: 0 }], dueDate: '', notes: '', tax: 13 });

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const customer = customers.find((c) => c.id === inv.customerId);
      const matchSearch = !search || inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || (customer?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [invoices, customers, search, statusFilter]);

  const stats = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const outstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const overdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const draft = invoices.filter((i) => i.status === 'draft').length;
    return { paid, outstanding, overdue, draft };
  }, [invoices]);

  const calcSubtotal = (items) => items.reduce((s, item) => s + (item.quantity * item.rate), 0);
  const calcTotal = (items, tax) => { const sub = calcSubtotal(items); return sub + (sub * (tax || 0) / 100); };

  const nextInvoiceNumber = () => {
    const nums = invoices.map((i) => parseInt(i.invoiceNumber.replace('INV-', '')) || 0);
    return `INV-${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`;
  };

  const openAdd = () => {
    setForm({ customerId: customers[0]?.id || '', items: [{ description: '', quantity: 1, rate: 0 }], dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], notes: '', tax: 13 });
    setShowModal(true);
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, rate: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: field === 'quantity' || field === 'rate' ? Number(value) : value };
    setForm({ ...form, items });
  };

  const save = () => {
    if (!form.customerId || form.items.length === 0) return;
    const subtotal = calcSubtotal(form.items);
    const total = calcTotal(form.items, form.tax);
    dispatch({
      type: 'ADD_INVOICE', payload: {
        invoiceNumber: nextInvoiceNumber(), customerId: form.customerId, date: new Date().toISOString().split('T')[0],
        dueDate: form.dueDate, items: form.items, subtotal, tax: form.tax, total, notes: form.notes, status: 'draft',
      },
    });
    setShowModal(false);
  };

  const updateStatus = (id, status) => dispatch({ type: 'UPDATE_INVOICE', payload: { id, status, ...(status === 'paid' ? { paidDate: new Date().toISOString().split('T')[0] } : {}) } });
  const deleteInvoice = (id) => { if (window.confirm('Delete this invoice?')) dispatch({ type: 'DELETE_INVOICE', payload: id }); };

  const getCustomerName = (id) => customers.find((c) => c.id === id)?.name || 'Unknown';

  const statusIcons = { draft: FileText, sent: Send, paid: CheckCircle, overdue: AlertCircle, cancelled: X };

  return (
    <div className="billing-page">
      <div className="page-header">
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> New Invoice</button>
      </div>

      <div className="billing-stats">
        <div className="stat-card stat-card--success">
          <DollarSign size={20} />
          <div>
            <div className="stat-card__value">${stats.paid.toLocaleString()}</div>
            <div className="stat-card__label">Paid</div>
          </div>
        </div>
        <div className="stat-card stat-card--warning">
          <Send size={20} />
          <div>
            <div className="stat-card__value">${stats.outstanding.toLocaleString()}</div>
            <div className="stat-card__label">Outstanding</div>
          </div>
        </div>
        <div className="stat-card stat-card--danger">
          <AlertCircle size={20} />
          <div>
            <div className="stat-card__value">${stats.overdue.toLocaleString()}</div>
            <div className="stat-card__label">Overdue</div>
          </div>
        </div>
        <div className="stat-card">
          <FileText size={20} />
          <div>
            <div className="stat-card__value">{stats.draft}</div>
            <div className="stat-card__label">Drafts</div>
          </div>
        </div>
      </div>

      <div className="billing-toolbar">
        <div className="customers-search">
          <Search size={16} />
          <input type="text" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="customers-filters">
          {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
            <button key={s} className={`filter-btn ${statusFilter === s ? 'filter-btn--active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><FileText size={48} /><p>No invoices found</p></div>
      ) : (
        <div className="invoices-table-wrap">
          <table className="table invoices-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const StatusIcon = statusIcons[inv.status] || FileText;
                return (
                  <tr key={inv.id}>
                    <td className="inv-number">{inv.invoiceNumber}</td>
                    <td>{getCustomerName(inv.customerId)}</td>
                    <td>{formatDate(inv.date)}</td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td className="inv-amount">${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td><span className={`status-badge status-badge--${inv.status}`}><StatusIcon size={12} /> {inv.status}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-icon" title="View" onClick={() => setViewInvoice(inv)}><Eye size={14} /></button>
                        {inv.status === 'draft' && <button className="btn-icon" title="Send" onClick={() => updateStatus(inv.id, 'sent')}><Send size={14} /></button>}
                        {(inv.status === 'sent' || inv.status === 'overdue') && <button className="btn-icon" title="Mark Paid" onClick={() => updateStatus(inv.id, 'paid')}><CheckCircle size={14} /></button>}
                        <button className="btn-icon btn-icon--danger" title="Delete" onClick={() => deleteInvoice(inv.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View Invoice */}
      {viewInvoice && (
        <div className="modal-overlay" onClick={() => setViewInvoice(null)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Invoice {viewInvoice.invoiceNumber}</h2>
              <button className="btn-icon" onClick={() => setViewInvoice(null)}><X size={20} /></button>
            </div>
            <div className="modal__body">
              <div className="invoice-detail">
                <div className="invoice-detail__top">
                  <div>
                    <h3>Bill To</h3>
                    <p className="text-bold">{getCustomerName(viewInvoice.customerId)}</p>
                  </div>
                  <div className="text-right">
                    <p>Date: {formatDate(viewInvoice.date)}</p>
                    <p>Due: {formatDate(viewInvoice.dueDate)}</p>
                    <span className={`status-badge status-badge--${viewInvoice.status}`}>{viewInvoice.status}</span>
                  </div>
                </div>
                <table className="table">
                  <thead>
                    <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    {viewInvoice.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>${item.rate.toFixed(2)}</td>
                        <td>${(item.quantity * item.rate).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={3} className="text-right">Subtotal</td><td>${viewInvoice.subtotal.toFixed(2)}</td></tr>
                    <tr><td colSpan={3} className="text-right">Tax ({viewInvoice.tax}%)</td><td>${(viewInvoice.subtotal * viewInvoice.tax / 100).toFixed(2)}</td></tr>
                    <tr className="total-row"><td colSpan={3} className="text-right">Total</td><td>${viewInvoice.total.toFixed(2)}</td></tr>
                  </tfoot>
                </table>
                {viewInvoice.notes && <div className="invoice-notes"><strong>Notes:</strong> {viewInvoice.notes}</div>}
              </div>
            </div>
            <div className="modal__footer">
              {viewInvoice.status === 'draft' && <button className="btn btn-primary" onClick={() => { updateStatus(viewInvoice.id, 'sent'); setViewInvoice(null); }}><Send size={14} /> Send Invoice</button>}
              {(viewInvoice.status === 'sent' || viewInvoice.status === 'overdue') && <button className="btn btn-primary" onClick={() => { updateStatus(viewInvoice.id, 'paid'); setViewInvoice(null); }}><CheckCircle size={14} /> Mark as Paid</button>}
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>New Invoice</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer *</label>
                  <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                    <option value="">Select customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Tax %</label>
                  <input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} min={0} max={30} />
                </div>
              </div>

              <div className="invoice-items-section">
                <h4>Line Items</h4>
                {form.items.map((item, i) => (
                  <div key={i} className="invoice-item-row">
                    <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="item-desc" />
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} min={1} className="item-qty" />
                    <input type="number" placeholder="Rate" value={item.rate} onChange={(e) => updateItem(i, 'rate', e.target.value)} min={0} step={0.01} className="item-rate" />
                    <span className="item-amount">${(item.quantity * item.rate).toFixed(2)}</span>
                    {form.items.length > 1 && <button className="btn-icon btn-icon--danger" onClick={() => removeItem(i)}><X size={14} /></button>}
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={14} /> Add Line</button>
              </div>

              <div className="invoice-summary">
                <div>Subtotal: <strong>${calcSubtotal(form.items).toFixed(2)}</strong></div>
                <div>Tax ({form.tax}%): <strong>${(calcSubtotal(form.items) * form.tax / 100).toFixed(2)}</strong></div>
                <div className="invoice-total">Total: <strong>${calcTotal(form.items, form.tax).toFixed(2)}</strong></div>
              </div>

              <div className="form-group form-group--full" style={{ marginTop: 16 }}>
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Payment terms, notes..." />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}><FileText size={14} /> Create Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
