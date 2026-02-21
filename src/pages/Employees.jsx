import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, X, Edit2, Trash2, Mail, Phone, CreditCard } from 'lucide-react';
import { getInitials } from '../utils/helpers';
import './Employees.css';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d'];

export default function Employees() {
  const { state, dispatch } = useApp();
  const { employees, positions, currentLocationId, absences } = state;
  const locationEmployees = employees.filter((e) => e.locationId === currentLocationId);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '', email: '', phone: '', hourlyRate: '', color: COLORS[0] });
  const [bankData, setBankData] = useState({ bankName: '', transitNumber: '', accountNumber: '' });

  const ptoUsed = useMemo(() => {
    const used = {};
    absences.filter((a) => a.status === 'approved').forEach((a) => {
      if (!used[a.employeeId]) used[a.employeeId] = { sick: 0, vacation: 0, personal: 0 };
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      if (a.type === 'sick' || a.type === 'vacation' || a.type === 'personal') {
        used[a.employeeId][a.type] += days;
      }
    });
    return used;
  }, [absences]);

  const filtered = useMemo(() => {
    return locationEmployees.filter((emp) => {
      const matchSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || emp.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = !filterRole || emp.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [locationEmployees, search, filterRole]);

  function openNew() {
    setEditing(null);
    setFormData({ name: '', role: positions[0] || '', email: '', phone: '', hourlyRate: '', color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    setShowModal(true);
  }

  function openEdit(emp) {
    setEditing(emp);
    setFormData({ name: emp.name, role: emp.role, email: emp.email, phone: emp.phone, hourlyRate: String(emp.hourlyRate), color: emp.color });
    setShowModal(true);
  }

  function openBankInfo(emp) {
    setSelectedEmp(emp);
    setBankData(emp.bankInfo || { bankName: '', transitNumber: '', accountNumber: '' });
    setShowBankModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...formData, hourlyRate: Number(formData.hourlyRate) || 0 };
    if (editing) {
      dispatch({ type: 'UPDATE_EMPLOYEE', payload: { ...payload, id: editing.id } });
    } else {
      dispatch({ type: 'ADD_EMPLOYEE', payload });
    }
    setShowModal(false);
  }

  function handleBankSubmit(e) {
    e.preventDefault();
    const hasData = bankData.bankName || bankData.transitNumber || bankData.accountNumber;
    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: selectedEmp.id, bankInfo: hasData ? bankData : null } });
    setShowBankModal(false);
  }

  function handleDelete(id) {
    if (window.confirm('Are you sure you want to remove this employee?')) {
      dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
    }
  }

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{locationEmployees.length} team members</p>
        </div>
        <button className="btn btn--primary" onClick={openNew}><Plus size={16} /> Add Employee</button>
      </div>

      <div className="employees-toolbar">
        <div className="search-box">
          <Search size={16} className="search-box__icon" />
          <input type="text" className="search-box__input" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input filter-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All Positions</option>
          {positions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="employees-grid">
        {filtered.map((emp) => {
          const used = ptoUsed[emp.id] || { sick: 0, vacation: 0, personal: 0 };
          const pto = emp.ptoBalance || { sick: 10, vacation: 10, personal: 3 };
          return (
            <div key={emp.id} className="employee-card">
              <div className="employee-card__header">
                <div className="employee-card__avatar" style={{ background: emp.color }}>{getInitials(emp.name)}</div>
                <div className="employee-card__actions">
                  <button className="btn btn--icon btn--sm" onClick={() => openBankInfo(emp)} title="Direct Deposit"><CreditCard size={14} /></button>
                  <button className="btn btn--icon btn--sm" onClick={() => openEdit(emp)}><Edit2 size={14} /></button>
                  <button className="btn btn--icon btn--sm" onClick={() => handleDelete(emp.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="employee-card__body">
                <h3 className="employee-card__name">{emp.name}</h3>
                <span className="employee-card__role">{emp.role}</span>
                <div className="employee-card__details">
                  <div className="employee-card__detail"><Mail size={13} /><span>{emp.email}</span></div>
                  <div className="employee-card__detail"><Phone size={13} /><span>{emp.phone}</span></div>
                </div>
                <div className="employee-card__rate">${emp.hourlyRate}/hr</div>
                {emp.bankInfo && <div className="employee-card__bank"><CreditCard size={12} /> Direct Deposit</div>}
                <div className="employee-card__pto">
                  <div className="pto-row"><span className="pto-label">Sick</span><div className="pto-bar-wrap"><div className="pto-bar pto-bar--sick" style={{ width: `${pto.sick > 0 ? Math.min(100, ((pto.sick - used.sick) / pto.sick) * 100) : 0}%` }} /></div><span className="pto-count">{Math.max(0, pto.sick - used.sick)}/{pto.sick}</span></div>
                  <div className="pto-row"><span className="pto-label">Vacation</span><div className="pto-bar-wrap"><div className="pto-bar pto-bar--vacation" style={{ width: `${pto.vacation > 0 ? Math.min(100, ((pto.vacation - used.vacation) / pto.vacation) * 100) : 0}%` }} /></div><span className="pto-count">{Math.max(0, pto.vacation - used.vacation)}/{pto.vacation}</span></div>
                  <div className="pto-row"><span className="pto-label">Personal</span><div className="pto-bar-wrap"><div className="pto-bar pto-bar--personal" style={{ width: `${pto.personal > 0 ? Math.min(100, ((pto.personal - used.personal) / pto.personal) * 100) : 0}%` }} /></div><span className="pto-count">{Math.max(0, pto.personal - used.personal)}/{pto.personal}</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <div className="empty-state" style={{ padding: '60px 20px' }}><p>No employees found</p></div>}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h2 className="modal__title">{editing ? 'Edit Employee' : 'Add Employee'}</h2><button className="btn btn--icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal__body">
                <div className="form-group"><label className="form-label">Full Name</label><input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" required /></div>
                <div className="form-group"><label className="form-label">Position</label><select className="form-input" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} required>{positions.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" required /></div>
                  <div className="form-group"><label className="form-label">Phone</label><input type="tel" className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="555-0100" required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Hourly Rate ($)</label><input type="number" className="form-input" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })} placeholder="18" min="0" step="0.01" required /></div>
                  <div className="form-group"><label className="form-label">Color</label><div className="color-picker">{COLORS.map((c) => <button key={c} type="button" className={`color-swatch ${formData.color === c ? 'color-swatch--active' : ''}`} style={{ background: c }} onClick={() => setFormData({ ...formData, color: c })} />)}</div></div>
                </div>
              </div>
              <div className="modal__footer"><div className="modal__footer-right"><button type="button" className="btn btn--secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn--primary">{editing ? 'Save Changes' : 'Add Employee'}</button></div></div>
            </form>
          </div>
        </div>
      )}

      {showBankModal && selectedEmp && (
        <div className="modal-overlay" onClick={() => setShowBankModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h2 className="modal__title">Direct Deposit - {selectedEmp.name}</h2><button className="btn btn--icon" onClick={() => setShowBankModal(false)}><X size={18} /></button></div>
            <form onSubmit={handleBankSubmit}>
              <div className="modal__body">
                <p className="bank-desc">Enter banking information for direct deposit. This replaces the need for a void cheque.</p>
                <div className="form-group"><label className="form-label">Bank Name</label><input type="text" className="form-input" value={bankData.bankName} onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })} placeholder="e.g. TD Bank, RBC, BMO" /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Transit / Routing Number</label><input type="text" className="form-input" value={bankData.transitNumber} onChange={(e) => setBankData({ ...bankData, transitNumber: e.target.value })} placeholder="e.g. 00412" /></div>
                  <div className="form-group"><label className="form-label">Account Number</label><input type="text" className="form-input" value={bankData.accountNumber} onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })} placeholder="e.g. 1234567" /></div>
                </div>
                {selectedEmp.bankInfo && (
                  <div className="bank-current">
                    <h4>Current Banking Info</h4>
                    <div className="bank-current__row"><span>Bank:</span> <strong>{selectedEmp.bankInfo.bankName}</strong></div>
                    <div className="bank-current__row"><span>Transit:</span> <strong>{selectedEmp.bankInfo.transitNumber}</strong></div>
                    <div className="bank-current__row"><span>Account:</span> <strong>****{selectedEmp.bankInfo.accountNumber.slice(-4)}</strong></div>
                  </div>
                )}
              </div>
              <div className="modal__footer">
                {selectedEmp.bankInfo && <button type="button" className="btn btn--danger" onClick={() => { dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: selectedEmp.id, bankInfo: null } }); setShowBankModal(false); }}>Remove</button>}
                <div className="modal__footer-right"><button type="button" className="btn btn--secondary" onClick={() => setShowBankModal(false)}>Cancel</button><button type="submit" className="btn btn--primary">Save Banking Info</button></div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
