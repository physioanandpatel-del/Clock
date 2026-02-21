import { useState, useMemo } from 'react';
import { useApp, ACCESS_LABELS } from '../context/AppContext';
import { Plus, Search, X, Edit2, Trash2, Mail, Phone, MapPin, Shield, User, Briefcase, DollarSign, Clock, Calendar, Users, Hash, AlertCircle, ChevronRight } from 'lucide-react';
import { getInitials } from '../utils/helpers';
import { format } from 'date-fns';
import './Employees.css';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d'];
const ACCESS_OPTIONS = ['employee', 'manager', 'location_admin', 'master_admin'];
const TIMEZONES = [
  'America/Toronto', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg',
  'America/Halifax', 'America/St_Johns', 'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];
const COUNTRY_CODES = [
  { code: '+1', label: 'Canada / US (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+86', label: 'China (+86)' },
];

export default function Employees() {
  const { state, dispatch } = useApp();
  const { employees, positions, groups = [], currentLocationId, absences, locations } = state;
  const locationEmployees = employees.filter((e) => (e.locationIds || [e.locationId]).includes(currentLocationId));

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [detailEmp, setDetailEmp] = useState(null);
  const [detailTab, setDetailTab] = useState('personal');
  const [isNewEmployee, setIsNewEmployee] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [newWage, setNewWage] = useState({ position: '', rate: '', effectiveDate: '' });
  const [newGroupName, setNewGroupName] = useState('');

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
      const searchName = (emp.preferredName || emp.name || '').toLowerCase();
      const matchSearch = emp.name.toLowerCase().includes(search.toLowerCase()) ||
        searchName.includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase());
      const empRoles = emp.roles || [emp.role];
      const matchRole = !filterRole || empRoles.includes(filterRole);
      return matchSearch && matchRole;
    });
  }, [locationEmployees, search, filterRole]);

  function openDetail(emp) {
    setIsNewEmployee(false);
    setDetailEmp(emp);
    setFormData({ ...emp });
    setDetailTab('personal');
    setEditingField(null);
  }

  function openNew() {
    setIsNewEmployee(true);
    const newEmp = {
      name: '', preferredName: '', roles: [positions[0] || ''], email: '', phone: '',
      countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '',
      hourlyRate: '', color: COLORS[Math.floor(Math.random() * COLORS.length)],
      locationIds: [currentLocationId], accessLevel: 'employee',
      hireDate: new Date().toISOString().split('T')[0],
      emergencyContact: { name: '', phone: '', relationship: '' },
      clockPin: '', timeClockEnabled: true, groups: [], managerIds: [],
      payType: 'hourly', wages: [], bankInfo: null,
      ptoBalance: { sick: 10, vacation: 10, personal: 3 },
    };
    setDetailEmp(newEmp);
    setFormData(newEmp);
    setDetailTab('personal');
    setEditingField(null);
  }

  function closeDetail() {
    setDetailEmp(null);
    setIsNewEmployee(false);
    setEditingField(null);
  }

  function saveEmployee() {
    const payload = { ...formData };
    payload.hourlyRate = Number(payload.hourlyRate) || 0;
    if (isNewEmployee) {
      if (!payload.name) return;
      dispatch({ type: 'ADD_EMPLOYEE', payload });
    } else {
      dispatch({ type: 'UPDATE_EMPLOYEE', payload: { ...payload, id: detailEmp.id } });
    }
    closeDetail();
  }

  function handleDelete(id) {
    if (window.confirm('Are you sure you want to remove this employee?')) {
      dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
      closeDetail();
    }
  }

  function updateForm(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function toggleRole(role) {
    setFormData((prev) => {
      const roles = prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role];
      return { ...prev, roles: roles.length > 0 ? roles : prev.roles };
    });
  }

  function toggleLocation(locId) {
    setFormData((prev) => {
      const lids = prev.locationIds.includes(locId) ? prev.locationIds.filter((l) => l !== locId) : [...prev.locationIds, locId];
      return { ...prev, locationIds: lids.length > 0 ? lids : prev.locationIds };
    });
  }

  function toggleGroup(group) {
    setFormData((prev) => {
      const g = (prev.groups || []).includes(group) ? prev.groups.filter((x) => x !== group) : [...(prev.groups || []), group];
      return { ...prev, groups: g };
    });
  }

  function toggleManager(mgrId) {
    setFormData((prev) => {
      const m = (prev.managerIds || []).includes(mgrId) ? prev.managerIds.filter((x) => x !== mgrId) : [...(prev.managerIds || []), mgrId];
      return { ...prev, managerIds: m };
    });
  }

  function addWage() {
    if (!newWage.position || !newWage.rate) return;
    setFormData((prev) => ({
      ...prev,
      wages: [...(prev.wages || []), { position: newWage.position, rate: Number(newWage.rate), effectiveDate: newWage.effectiveDate || new Date().toISOString().split('T')[0] }],
    }));
    setNewWage({ position: '', rate: '', effectiveDate: '' });
  }

  function removeWage(index) {
    setFormData((prev) => ({
      ...prev,
      wages: prev.wages.filter((_, i) => i !== index),
    }));
  }

  function addGroup() {
    if (!newGroupName.trim()) return;
    dispatch({ type: 'ADD_GROUP', payload: newGroupName.trim() });
    setNewGroupName('');
  }

  // Get managers/supervisors for display
  const getManagerNames = (managerIds) => {
    if (!managerIds || managerIds.length === 0) return 'None assigned';
    return managerIds.map((id) => employees.find((e) => e.id === id)?.name).filter(Boolean).join(', ');
  };

  const formatHireDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    try { return format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy'); } catch { return dateStr; }
  };

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
          const empRoles = emp.roles || [emp.role];
          const empLocs = emp.locationIds || [emp.locationId];
          const locNames = empLocs.map((lid) => locations.find((l) => l.id === lid)?.name).filter(Boolean);
          return (
            <div key={emp.id} className="employee-card" onClick={() => openDetail(emp)}>
              <div className="employee-card__header">
                <div className="employee-card__avatar" style={{ background: emp.color }}>{getInitials(emp.name)}</div>
                <div className="employee-card__header-right">
                  <span className={`access-badge access-badge--${emp.accessLevel || 'employee'}`}>
                    <Shield size={10} /> {ACCESS_LABELS[emp.accessLevel || 'employee']}
                  </span>
                  <ChevronRight size={16} className="employee-card__chevron" />
                </div>
              </div>
              <div className="employee-card__body">
                <h3 className="employee-card__name">
                  {emp.preferredName || emp.name}
                  {emp.preferredName && emp.preferredName !== emp.name && (
                    <span className="employee-card__fullname"> ({emp.name.split(' ')[1] || ''})</span>
                  )}
                </h3>
                <span className="employee-card__role">{empRoles.join(', ')}</span>
                {emp.hireDate && (
                  <div className="employee-card__joined">
                    <Calendar size={11} /> Joined {formatHireDate(emp.hireDate)}
                  </div>
                )}
                {locNames.length > 0 && (
                  <div className="employee-card__locations">
                    <MapPin size={11} /> {locNames.join(', ')}
                  </div>
                )}
                {(emp.groups || []).length > 0 && (
                  <div className="employee-card__groups">
                    <Users size={11} /> {emp.groups.join(', ')}
                  </div>
                )}
                <div className="employee-card__details">
                  <div className="employee-card__detail"><Mail size={13} /><span>{emp.email}</span></div>
                  <div className="employee-card__detail"><Phone size={13} /><span>{emp.countryCode || ''} {emp.phone}</span></div>
                </div>
                <div className="employee-card__rate">${emp.hourlyRate}/hr</div>
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

      {/* Sling-style Employee Detail Panel */}
      {detailEmp && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="sling-panel" onClick={(e) => e.stopPropagation()}>
            {/* Panel Header */}
            <div className="sling-panel__header">
              <div className="sling-panel__header-left">
                <div className="sling-panel__avatar" style={{ background: formData.color }}>
                  {formData.name ? getInitials(formData.name) : '?'}
                </div>
                <div>
                  <h2 className="sling-panel__name">{formData.preferredName || formData.name || 'New Employee'}</h2>
                  {formData.roles?.length > 0 && <span className="sling-panel__role">{formData.roles.join(', ')}</span>}
                </div>
              </div>
              <div className="sling-panel__header-actions">
                {!isNewEmployee && (
                  <button className="btn btn--danger btn--sm" onClick={() => handleDelete(detailEmp.id)}>
                    <Trash2 size={14} /> Remove
                  </button>
                )}
                <button className="btn btn--icon" onClick={closeDetail}><X size={18} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="sling-tabs">
              <button className={`sling-tab ${detailTab === 'personal' ? 'sling-tab--active' : ''}`} onClick={() => setDetailTab('personal')}>
                <User size={14} /> Personal
              </button>
              <button className={`sling-tab ${detailTab === 'work' ? 'sling-tab--active' : ''}`} onClick={() => setDetailTab('work')}>
                <Briefcase size={14} /> Work
              </button>
              <button className={`sling-tab ${detailTab === 'wages' ? 'sling-tab--active' : ''}`} onClick={() => setDetailTab('wages')}>
                <DollarSign size={14} /> Wages
              </button>
            </div>

            {/* Tab Content */}
            <div className="sling-panel__content">

              {/* PERSONAL TAB */}
              {detailTab === 'personal' && (
                <div className="sling-fields">
                  <div className="sling-section">
                    <h3 className="sling-section__title">Basic Information</h3>
                    <div className="sling-field-grid">
                      <div className="sling-field">
                        <label className="sling-field__label">First & Last Name</label>
                        <input type="text" className="sling-field__input" value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} placeholder="Full name" />
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Preferred Name</label>
                        <input type="text" className="sling-field__input" value={formData.preferredName || ''} onChange={(e) => updateForm('preferredName', e.target.value)} placeholder="Display name" />
                      </div>
                    </div>

                    <div className="sling-field">
                      <label className="sling-field__label">Email</label>
                      <input type="email" className="sling-field__input" value={formData.email || ''} onChange={(e) => updateForm('email', e.target.value)} placeholder="email@example.com" />
                    </div>

                    <div className="sling-field-grid">
                      <div className="sling-field">
                        <label className="sling-field__label">Country Code</label>
                        <select className="sling-field__input" value={formData.countryCode || '+1'} onChange={(e) => updateForm('countryCode', e.target.value)}>
                          {COUNTRY_CODES.map((cc) => <option key={cc.code} value={cc.code}>{cc.label}</option>)}
                        </select>
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Phone</label>
                        <input type="tel" className="sling-field__input" value={formData.phone || ''} onChange={(e) => updateForm('phone', e.target.value)} placeholder="555-0100" />
                      </div>
                    </div>

                    <div className="sling-field-grid">
                      <div className="sling-field">
                        <label className="sling-field__label">Date of Birth</label>
                        <input type="date" className="sling-field__input" value={formData.dateOfBirth || ''} onChange={(e) => updateForm('dateOfBirth', e.target.value)} />
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Timezone</label>
                        <select className="sling-field__input" value={formData.timezone || 'America/Toronto'} onChange={(e) => updateForm('timezone', e.target.value)}>
                          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Emergency Contact</h3>
                    <div className="sling-field-grid">
                      <div className="sling-field">
                        <label className="sling-field__label">Contact Name</label>
                        <input type="text" className="sling-field__input" value={formData.emergencyContact?.name || ''} onChange={(e) => updateForm('emergencyContact', { ...(formData.emergencyContact || {}), name: e.target.value })} placeholder="Contact name" />
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Relationship</label>
                        <input type="text" className="sling-field__input" value={formData.emergencyContact?.relationship || ''} onChange={(e) => updateForm('emergencyContact', { ...(formData.emergencyContact || {}), relationship: e.target.value })} placeholder="e.g. Spouse, Parent" />
                      </div>
                    </div>
                    <div className="sling-field">
                      <label className="sling-field__label">Contact Phone</label>
                      <input type="tel" className="sling-field__input" value={formData.emergencyContact?.phone || ''} onChange={(e) => updateForm('emergencyContact', { ...(formData.emergencyContact || {}), phone: e.target.value })} placeholder="555-9900" />
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Avatar Color</h3>
                    <div className="color-picker">
                      {COLORS.map((c) => (
                        <button key={c} type="button" className={`color-swatch ${formData.color === c ? 'color-swatch--active' : ''}`} style={{ background: c }} onClick={() => updateForm('color', c)} />
                      ))}
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Direct Deposit</h3>
                    <div className="sling-field">
                      <label className="sling-field__label">Bank Name</label>
                      <input type="text" className="sling-field__input" value={formData.bankInfo?.bankName || ''} onChange={(e) => updateForm('bankInfo', { ...(formData.bankInfo || { transitNumber: '', accountNumber: '' }), bankName: e.target.value })} placeholder="e.g. TD Bank, RBC" />
                    </div>
                    <div className="sling-field-grid">
                      <div className="sling-field">
                        <label className="sling-field__label">Transit / Routing #</label>
                        <input type="text" className="sling-field__input" value={formData.bankInfo?.transitNumber || ''} onChange={(e) => updateForm('bankInfo', { ...(formData.bankInfo || { bankName: '', accountNumber: '' }), transitNumber: e.target.value })} placeholder="e.g. 00412" />
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Account #</label>
                        <input type="text" className="sling-field__input" value={formData.bankInfo?.accountNumber || ''} onChange={(e) => updateForm('bankInfo', { ...(formData.bankInfo || { bankName: '', transitNumber: '' }), accountNumber: e.target.value })} placeholder="e.g. 1234567" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* WORK TAB */}
              {detailTab === 'work' && (
                <div className="sling-fields">
                  <div className="sling-section">
                    <h3 className="sling-section__title">Status</h3>
                    <div className="sling-status-row">
                      <span className="sling-status-badge sling-status-badge--joined">Joined</span>
                      <div className="sling-field" style={{ flex: 1 }}>
                        <label className="sling-field__label">Hire Date</label>
                        <input type="date" className="sling-field__input" value={formData.hireDate || ''} onChange={(e) => updateForm('hireDate', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Role</h3>
                    <div className="sling-field">
                      <label className="sling-field__label">Access Level</label>
                      <select className="sling-field__input" value={formData.accessLevel || 'employee'} onChange={(e) => updateForm('accessLevel', e.target.value)}>
                        {ACCESS_OPTIONS.map((level) => <option key={level} value={level}>{ACCESS_LABELS[level]}</option>)}
                      </select>
                      <span className="sling-field__hint">
                        {formData.accessLevel === 'master_admin' && 'Full access to all locations and settings'}
                        {formData.accessLevel === 'location_admin' && 'Manage assigned locations, employees, schedules'}
                        {formData.accessLevel === 'manager' && 'Create schedules, manage time clock, view reports'}
                        {formData.accessLevel === 'employee' && 'View own schedule, clock in/out, request absences'}
                      </span>
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Managers</h3>
                    <div className="chip-select">
                      {employees.filter((e) => (e.id !== detailEmp?.id) && (e.accessLevel === 'manager' || e.accessLevel === 'location_admin' || e.accessLevel === 'master_admin')).map((mgr) => (
                        <button key={mgr.id} type="button" className={`chip ${(formData.managerIds || []).includes(mgr.id) ? 'chip--active' : ''}`} onClick={() => toggleManager(mgr.id)}>
                          {mgr.preferredName || mgr.name}
                        </button>
                      ))}
                      {employees.filter((e) => (e.id !== detailEmp?.id) && (e.accessLevel === 'manager' || e.accessLevel === 'location_admin' || e.accessLevel === 'master_admin')).length === 0 && (
                        <span className="sling-field__hint">No managers available</span>
                      )}
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Locations</h3>
                    <div className="chip-select">
                      {locations.map((loc) => (
                        <button key={loc.id} type="button" className={`chip ${formData.locationIds?.includes(loc.id) ? 'chip--active' : ''}`} onClick={() => toggleLocation(loc.id)}>
                          <MapPin size={12} /> {loc.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Positions</h3>
                    <div className="chip-select">
                      {positions.map((p) => (
                        <button key={p} type="button" className={`chip ${formData.roles?.includes(p) ? 'chip--active' : ''}`} onClick={() => toggleRole(p)}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Groups</h3>
                    <div className="chip-select">
                      {(groups || []).map((g) => (
                        <button key={g} type="button" className={`chip ${(formData.groups || []).includes(g) ? 'chip--active' : ''}`} onClick={() => toggleGroup(g)}>
                          {g}
                        </button>
                      ))}
                    </div>
                    <div className="sling-inline-add">
                      <input type="text" className="sling-field__input sling-inline-add__input" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="New group name" onKeyDown={(e) => e.key === 'Enter' && addGroup()} />
                      <button className="btn btn--secondary btn--sm" onClick={addGroup}>Add Group</button>
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Time Clock</h3>
                    <div className="sling-toggle-row">
                      <label className="sling-toggle">
                        <input type="checkbox" checked={formData.timeClockEnabled !== false} onChange={(e) => updateForm('timeClockEnabled', e.target.checked)} />
                        <span className="sling-toggle__slider" />
                      </label>
                      <span className="sling-toggle__label">Time clock enabled</span>
                    </div>
                    {formData.timeClockEnabled !== false && (
                      <div className="sling-field" style={{ marginTop: 12 }}>
                        <label className="sling-field__label">Clock PIN</label>
                        <input type="text" className="sling-field__input" value={formData.clockPin || ''} onChange={(e) => updateForm('clockPin', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="e.g. 4957" maxLength={6} />
                        <span className="sling-field__hint">PIN for time clock authentication</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* WAGES TAB */}
              {detailTab === 'wages' && (
                <div className="sling-fields">
                  <div className="sling-section">
                    <h3 className="sling-section__title">Pay Type</h3>
                    <div className="sling-pay-type">
                      <button className={`sling-pay-btn ${formData.payType === 'hourly' ? 'sling-pay-btn--active' : ''}`} onClick={() => updateForm('payType', 'hourly')}>
                        <Clock size={16} /> Hourly
                      </button>
                      <button className={`sling-pay-btn ${formData.payType === 'salary' ? 'sling-pay-btn--active' : ''}`} onClick={() => updateForm('payType', 'salary')}>
                        <DollarSign size={16} /> Salary
                      </button>
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Default Rate</h3>
                    <div className="sling-field">
                      <label className="sling-field__label">Hourly Rate ($)</label>
                      <input type="number" className="sling-field__input" value={formData.hourlyRate || ''} onChange={(e) => updateForm('hourlyRate', e.target.value)} placeholder="0.00" min="0" step="0.01" />
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Position Wages</h3>
                    <p className="sling-field__hint" style={{ marginBottom: 12 }}>Set different rates per position, just like Sling. When an employee works a specific position, this rate applies.</p>

                    {(formData.wages || []).length > 0 && (
                      <div className="sling-wages-list">
                        {formData.wages.map((w, i) => (
                          <div key={i} className="sling-wage-row">
                            <div className="sling-wage-row__position">
                              <Briefcase size={14} />
                              <span>{w.position}</span>
                            </div>
                            <div className="sling-wage-row__rate">${Number(w.rate).toFixed(2)}</div>
                            <div className="sling-wage-row__date">
                              <Calendar size={12} />
                              <span>Effective {formatHireDate(w.effectiveDate)}</span>
                            </div>
                            <button className="btn btn--icon btn--sm" onClick={() => removeWage(i)} title="Remove"><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="sling-wage-add">
                      <select className="sling-field__input" value={newWage.position} onChange={(e) => setNewWage({ ...newWage, position: e.target.value })}>
                        <option value="">Select Position</option>
                        {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input type="number" className="sling-field__input" value={newWage.rate} onChange={(e) => setNewWage({ ...newWage, rate: e.target.value })} placeholder="Rate" min="0" step="0.01" />
                      <input type="date" className="sling-field__input" value={newWage.effectiveDate} onChange={(e) => setNewWage({ ...newWage, effectiveDate: e.target.value })} />
                      <button className="btn btn--secondary btn--sm" onClick={addWage}>Add</button>
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">PTO Balances</h3>
                    <div className="sling-field-grid sling-field-grid--3">
                      <div className="sling-field">
                        <label className="sling-field__label">Sick Days</label>
                        <input type="number" className="sling-field__input" value={formData.ptoBalance?.sick ?? 10} onChange={(e) => updateForm('ptoBalance', { ...(formData.ptoBalance || {}), sick: Number(e.target.value) })} min="0" />
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Vacation Days</label>
                        <input type="number" className="sling-field__input" value={formData.ptoBalance?.vacation ?? 10} onChange={(e) => updateForm('ptoBalance', { ...(formData.ptoBalance || {}), vacation: Number(e.target.value) })} min="0" />
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Personal Days</label>
                        <input type="number" className="sling-field__input" value={formData.ptoBalance?.personal ?? 3} onChange={(e) => updateForm('ptoBalance', { ...(formData.ptoBalance || {}), personal: Number(e.target.value) })} min="0" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="sling-panel__footer">
              <button className="btn btn--secondary" onClick={closeDetail}>Cancel</button>
              <button className="btn btn--primary" onClick={saveEmployee}>
                {isNewEmployee ? 'Add Employee' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
