import { useState, useMemo } from 'react';
import { useApp, ACCESS_LABELS } from '../context/AppContext';
import { Plus, Search, X, Trash2, Mail, Phone, MapPin, Shield, User, Briefcase, DollarSign, Clock, Calendar, Users, ChevronRight, Star, Award, FileText, Activity, AlertTriangle, CheckCircle, XCircle, Home, Globe, Heart, Hash, TrendingUp, Eye, Zap } from 'lucide-react';
import { getInitials } from '../utils/helpers';
import { format, differenceInMonths, differenceInDays, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import './Employees.css';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d', '#0d9488', '#b45309', '#6d28d9', '#e11d48'];
const ACCESS_OPTIONS = ['employee', 'manager', 'location_admin', 'master_admin'];
const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'seasonal', label: 'Seasonal' },
];
const EMPLOYMENT_LABELS = { full_time: 'Full-Time', part_time: 'Part-Time', contract: 'Contract', seasonal: 'Seasonal' };
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: '#059669' },
  { value: 'on_leave', label: 'On Leave', color: '#d97706' },
  { value: 'probation', label: 'Probation', color: '#2563eb' },
  { value: 'terminated', label: 'Terminated', color: '#dc2626' },
];
const STATUS_LABELS = { active: 'Active', on_leave: 'On Leave', probation: 'Probation', terminated: 'Terminated' };
const DEPARTMENTS = ['Management', 'Front of House', 'Kitchen', 'Bar'];
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
const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

export default function Employees() {
  const { state, dispatch } = useApp();
  const { employees, positions, groups = [], currentLocationId, absences, locations, shifts, timeEntries } = state;
  const locationEmployees = employees.filter((e) => (e.locationIds || [e.locationId]).includes(currentLocationId));

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [detailEmp, setDetailEmp] = useState(null);
  const [detailTab, setDetailTab] = useState('personal');
  const [isNewEmployee, setIsNewEmployee] = useState(false);
  const [formData, setFormData] = useState({});
  const [newWage, setNewWage] = useState({ position: '', rate: '', effectiveDate: '' });
  const [newGroupName, setNewGroupName] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState({ name: '', issueDate: '', expiryDate: '' });

  const today = new Date();
  const weekS = startOfWeek(today, { weekStartsOn: 1 });
  const weekE = endOfWeek(today, { weekStartsOn: 1 });

  // Compute hours this week per employee
  const weeklyHours = useMemo(() => {
    const hours = {};
    (shifts || []).forEach((s) => {
      try {
        const start = parseISO(s.start);
        const end = parseISO(s.end);
        if (isWithinInterval(start, { start: weekS, end: weekE })) {
          const h = (end - start) / (1000 * 60 * 60);
          hours[s.employeeId] = (hours[s.employeeId] || 0) + h;
        }
      } catch { /* skip */ }
    });
    return hours;
  }, [shifts, weekS, weekE]);

  // Clocked-in status
  const clockedIn = useMemo(() => {
    const active = {};
    (timeEntries || []).forEach((te) => {
      if (te.status === 'active' && !te.clockOut) {
        active[te.employeeId] = true;
      }
    });
    return active;
  }, [timeEntries]);

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
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        (emp.department || '').toLowerCase().includes(search.toLowerCase()) ||
        (emp.skills || []).some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const empRoles = emp.roles || [emp.role];
      const matchRole = !filterRole || empRoles.includes(filterRole);
      const matchDept = !filterDept || emp.department === filterDept;
      const matchStatus = !filterStatus || emp.status === filterStatus;
      const matchType = !filterType || emp.employmentType === filterType;
      return matchSearch && matchRole && matchDept && matchStatus && matchType;
    });
  }, [locationEmployees, search, filterRole, filterDept, filterStatus, filterType]);

  function getTenure(hireDate) {
    if (!hireDate) return null;
    const months = differenceInMonths(today, new Date(hireDate + 'T00:00:00'));
    if (months < 1) {
      const days = differenceInDays(today, new Date(hireDate + 'T00:00:00'));
      return `${days}d`;
    }
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y > 0) return m > 0 ? `${y}y ${m}mo` : `${y}y`;
    return `${m}mo`;
  }

  function getCertStatus(certs) {
    if (!certs || certs.length === 0) return null;
    const expired = certs.filter((c) => c.status === 'expired').length;
    const expiring = certs.filter((c) => c.status === 'expiring_soon').length;
    if (expired > 0) return 'expired';
    if (expiring > 0) return 'expiring';
    return 'valid';
  }

  function openDetail(emp) {
    setIsNewEmployee(false);
    setDetailEmp(emp);
    setFormData({ ...emp });
    setDetailTab('personal');
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
      employmentType: 'full_time', department: '', status: 'active',
      address: { street: '', city: '', province: '', postalCode: '' },
      skills: [], certifications: [], documents: [], notes: '',
      performanceRating: null, overtimeRate: 1.5, availability: {},
      photoUrl: '',
    };
    setDetailEmp(newEmp);
    setFormData(newEmp);
    setDetailTab('personal');
  }

  function closeDetail() { setDetailEmp(null); setIsNewEmployee(false); }

  function saveEmployee() {
    const payload = { ...formData };
    payload.hourlyRate = Number(payload.hourlyRate) || 0;
    payload.performanceRating = payload.performanceRating ? Number(payload.performanceRating) : null;
    payload.overtimeRate = Number(payload.overtimeRate) || 1.5;
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

  function updateForm(field, value) { setFormData((prev) => ({ ...prev, [field]: value })); }
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
    setFormData((prev) => ({ ...prev, wages: prev.wages.filter((_, i) => i !== index) }));
  }
  function addGroup() {
    if (!newGroupName.trim()) return;
    dispatch({ type: 'ADD_GROUP', payload: newGroupName.trim() });
    setNewGroupName('');
  }
  function addSkill() {
    if (!newSkill.trim()) return;
    setFormData((prev) => ({ ...prev, skills: [...(prev.skills || []), newSkill.trim()] }));
    setNewSkill('');
  }
  function removeSkill(index) {
    setFormData((prev) => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
  }
  function addCertification() {
    if (!newCert.name.trim()) return;
    const cert = { name: newCert.name.trim(), issueDate: newCert.issueDate || new Date().toISOString().split('T')[0], expiryDate: newCert.expiryDate || null, status: 'valid' };
    setFormData((prev) => ({ ...prev, certifications: [...(prev.certifications || []), cert] }));
    setNewCert({ name: '', issueDate: '', expiryDate: '' });
  }
  function removeCert(index) {
    setFormData((prev) => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== index) }));
  }
  function updateAvailability(day, field, value) {
    setFormData((prev) => {
      const avail = { ...(prev.availability || {}) };
      if (!value && field === 'start') { avail[day] = null; } else {
        avail[day] = { ...(avail[day] || { start: '09:00', end: '17:00' }), [field]: value };
      }
      return { ...prev, availability: avail };
    });
  }

  const getManagerNames = (managerIds) => {
    if (!managerIds || managerIds.length === 0) return null;
    return managerIds.map((id) => employees.find((e) => e.id === id)).filter(Boolean).map((e) => e.preferredName || e.name).join(', ');
  };

  const formatHireDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    try { return format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy'); } catch { return dateStr; }
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <span className="stars-display">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={12} className={`star-icon ${i < full ? 'star-icon--filled' : i === full && half ? 'star-icon--half' : ''}`} />
        ))}
        <span className="stars-value">{rating.toFixed(1)}</span>
      </span>
    );
  };

  // Count stats
  const activeCount = locationEmployees.filter((e) => e.status === 'active' || !e.status).length;
  const clockedCount = Object.keys(clockedIn).filter((eid) => locationEmployees.some((e) => e.id === eid)).length;

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{locationEmployees.length} team members &middot; {activeCount} active &middot; {clockedCount} clocked in</p>
        </div>
        <button className="btn btn--primary" onClick={openNew}><Plus size={16} /> Add Employee</button>
      </div>

      {/* Toolbar with filters */}
      <div className="employees-toolbar">
        <div className="search-box">
          <Search size={16} className="search-box__icon" />
          <input type="text" className="search-box__input" placeholder="Search name, email, skills..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input filter-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All Positions</option>
          {positions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-input filter-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="form-input filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="form-input filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Employee Grid */}
      <div className="employees-grid">
        {filtered.map((emp) => {
          const used = ptoUsed[emp.id] || { sick: 0, vacation: 0, personal: 0 };
          const pto = emp.ptoBalance || { sick: 10, vacation: 10, personal: 3 };
          const empRoles = emp.roles || [emp.role];
          const empLocs = emp.locationIds || [emp.locationId];
          const locNames = empLocs.map((lid) => locations.find((l) => l.id === lid)?.name).filter(Boolean);
          const managerNames = getManagerNames(emp.managerIds);
          const tenure = getTenure(emp.hireDate);
          const hrsWeek = weeklyHours[emp.id] || 0;
          const isClockedIn = clockedIn[emp.id];
          const empStatus = emp.status || 'active';
          const certStatus = getCertStatus(emp.certifications);
          const empType = emp.employmentType || 'full_time';

          return (
            <div key={emp.id} className={`employee-card employee-card--${empStatus}`} onClick={() => openDetail(emp)}>
              {/* Status bar at top */}
              <div className={`employee-card__status-bar employee-card__status-bar--${empStatus}`}>
                <span className={`status-dot status-dot--${isClockedIn ? 'clocked' : empStatus}`} />
                <span className="status-text">{isClockedIn ? 'Clocked In' : STATUS_LABELS[empStatus] || 'Active'}</span>
                {certStatus === 'expired' && <span className="cert-alert cert-alert--expired"><AlertTriangle size={11} /> Cert Expired</span>}
                {certStatus === 'expiring' && <span className="cert-alert cert-alert--expiring"><AlertTriangle size={11} /> Cert Expiring</span>}
              </div>

              <div className="employee-card__header">
                <div className="employee-card__avatar" style={{ background: emp.photoUrl ? 'transparent' : emp.color }}>
                  {emp.photoUrl ? (
                    <img src={emp.photoUrl} alt={emp.name} className="employee-card__photo" />
                  ) : (
                    getInitials(emp.name)
                  )}
                  {isClockedIn && <span className="avatar-clocked-indicator" />}
                </div>
                <div className="employee-card__header-right">
                  <span className={`emp-type-badge emp-type-badge--${empType}`}>{EMPLOYMENT_LABELS[empType]}</span>
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
                    <span className="employee-card__fullname"> ({emp.name})</span>
                  )}
                </h3>

                <div className="employee-card__role-dept">
                  <span className="employee-card__role">{empRoles.join(' / ')}</span>
                  {emp.department && <span className="employee-card__dept">{emp.department}</span>}
                </div>

                {/* Stats row */}
                <div className="employee-card__stats">
                  <div className="stat-chip">
                    <DollarSign size={12} />
                    <span>${emp.hourlyRate}/hr</span>
                  </div>
                  <div className="stat-chip">
                    <Clock size={12} />
                    <span>{hrsWeek.toFixed(0)}h/wk</span>
                  </div>
                  {emp.performanceRating && (
                    <div className="stat-chip stat-chip--rating">
                      <Star size={12} />
                      <span>{emp.performanceRating.toFixed(1)}</span>
                    </div>
                  )}
                  {tenure && (
                    <div className="stat-chip">
                      <Calendar size={12} />
                      <span>{tenure}</span>
                    </div>
                  )}
                </div>

                {/* Info rows */}
                <div className="employee-card__info-section">
                  {locNames.length > 0 && (
                    <div className="employee-card__info-row">
                      <MapPin size={13} /><span>{locNames.join(', ')}</span>
                    </div>
                  )}
                  <div className="employee-card__info-row">
                    <Mail size={13} /><span>{emp.email}</span>
                  </div>
                  <div className="employee-card__info-row">
                    <Phone size={13} /><span>{emp.countryCode || '+1'} {emp.phone}</span>
                  </div>
                  {managerNames && (
                    <div className="employee-card__info-row">
                      <User size={13} /><span>Reports to: {managerNames}</span>
                    </div>
                  )}
                  {emp.address?.city && (
                    <div className="employee-card__info-row">
                      <Home size={13} /><span>{emp.address.city}{emp.address.province ? `, ${emp.address.province}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {emp.skills && emp.skills.length > 0 && (
                  <div className="employee-card__skills">
                    {emp.skills.slice(0, 4).map((skill, i) => (
                      <span key={i} className="skill-tag">{skill}</span>
                    ))}
                    {emp.skills.length > 4 && <span className="skill-tag skill-tag--more">+{emp.skills.length - 4}</span>}
                  </div>
                )}

                {/* Groups */}
                {(emp.groups || []).length > 0 && (
                  <div className="employee-card__groups-row">
                    <Users size={11} />
                    {emp.groups.map((g, i) => (
                      <span key={i} className="group-chip">{g}</span>
                    ))}
                  </div>
                )}

                {/* PTO */}
                <div className="employee-card__pto">
                  <div className="pto-row"><span className="pto-label">Sick</span><div className="pto-bar-wrap"><div className="pto-bar pto-bar--sick" style={{ width: `${pto.sick > 0 ? Math.min(100, ((pto.sick - used.sick) / pto.sick) * 100) : 0}%` }} /></div><span className="pto-count">{Math.max(0, pto.sick - used.sick)}/{pto.sick}</span></div>
                  <div className="pto-row"><span className="pto-label">Vacation</span><div className="pto-bar-wrap"><div className="pto-bar pto-bar--vacation" style={{ width: `${pto.vacation > 0 ? Math.min(100, ((pto.vacation - used.vacation) / pto.vacation) * 100) : 0}%` }} /></div><span className="pto-count">{Math.max(0, pto.vacation - used.vacation)}/{pto.vacation}</span></div>
                  <div className="pto-row"><span className="pto-label">Personal</span><div className="pto-bar-wrap"><div className="pto-bar pto-bar--personal" style={{ width: `${pto.personal > 0 ? Math.min(100, ((pto.personal - used.personal) / pto.personal) * 100) : 0}%` }} /></div><span className="pto-count">{Math.max(0, pto.personal - used.personal)}/{pto.personal}</span></div>
                </div>

                {/* Notes preview */}
                {emp.notes && (
                  <div className="employee-card__notes">
                    <FileText size={11} />
                    <span>{emp.notes.length > 80 ? emp.notes.slice(0, 80) + '...' : emp.notes}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <div className="empty-state" style={{ padding: '60px 20px' }}><p>No employees found</p></div>}

      {/* ===== EMPLOYEE DETAIL PANEL ===== */}
      {detailEmp && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="sling-panel" onClick={(e) => e.stopPropagation()}>
            {/* Panel Header */}
            <div className="sling-panel__header">
              <div className="sling-panel__header-left">
                <div className="sling-panel__avatar" style={{ background: formData.photoUrl ? 'transparent' : formData.color }}>
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt={formData.name || ''} className="sling-panel__photo" />
                  ) : (
                    formData.name ? getInitials(formData.name) : '?'
                  )}
                </div>
                <div>
                  <h2 className="sling-panel__name">{formData.preferredName || formData.name || 'New Employee'}</h2>
                  <div className="sling-panel__meta">
                    {formData.roles?.length > 0 && <span className="sling-panel__role">{formData.roles.join(', ')}</span>}
                    {formData.department && <span className="sling-panel__dept-badge">{formData.department}</span>}
                    {formData.status && <span className={`sling-panel__status-badge sling-panel__status-badge--${formData.status}`}>{STATUS_LABELS[formData.status] || formData.status}</span>}
                  </div>
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
              <button className={`sling-tab ${detailTab === 'documents' ? 'sling-tab--active' : ''}`} onClick={() => setDetailTab('documents')}>
                <Award size={14} /> Certs & Docs
              </button>
              <button className={`sling-tab ${detailTab === 'schedule' ? 'sling-tab--active' : ''}`} onClick={() => setDetailTab('schedule')}>
                <Calendar size={14} /> Availability
              </button>
            </div>

            {/* Tab Content */}
            <div className="sling-panel__content">

              {/* ===== PERSONAL TAB ===== */}
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
                    <h3 className="sling-section__title">Address</h3>
                    <div className="sling-field">
                      <label className="sling-field__label">Street</label>
                      <input type="text" className="sling-field__input" value={formData.address?.street || ''} onChange={(e) => updateForm('address', { ...(formData.address || {}), street: e.target.value })} placeholder="123 Main St, Apt 4B" />
                    </div>
                    <div className="sling-field-grid sling-field-grid--3">
                      <div className="sling-field">
                        <label className="sling-field__label">City</label>
                        <input type="text" className="sling-field__input" value={formData.address?.city || ''} onChange={(e) => updateForm('address', { ...(formData.address || {}), city: e.target.value })} placeholder="Toronto" />
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Province / State</label>
                        <input type="text" className="sling-field__input" value={formData.address?.province || ''} onChange={(e) => updateForm('address', { ...(formData.address || {}), province: e.target.value })} placeholder="ON" />
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Postal Code</label>
                        <input type="text" className="sling-field__input" value={formData.address?.postalCode || ''} onChange={(e) => updateForm('address', { ...(formData.address || {}), postalCode: e.target.value })} placeholder="M5H 2N2" />
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
                    <h3 className="sling-section__title">Profile Photo</h3>
                    <div className="sling-field">
                      <label className="sling-field__label">Photo URL</label>
                      <input type="url" className="sling-field__input" value={formData.photoUrl || ''} onChange={(e) => updateForm('photoUrl', e.target.value)} placeholder="https://example.com/photo.jpg" />
                      <span className="sling-field__hint">Enter a URL to the employee's profile photo. Shows on cards and the schedule.</span>
                    </div>
                    {formData.photoUrl && (
                      <div className="photo-preview">
                        <img src={formData.photoUrl} alt="Preview" className="photo-preview__img" onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                    )}
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

                  <div className="sling-section">
                    <h3 className="sling-section__title">Notes</h3>
                    <textarea className="sling-field__input sling-field__textarea" value={formData.notes || ''} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Internal notes about this employee..." rows={3} />
                  </div>
                </div>
              )}

              {/* ===== WORK TAB ===== */}
              {detailTab === 'work' && (
                <div className="sling-fields">
                  <div className="sling-section">
                    <h3 className="sling-section__title">Employment</h3>
                    <div className="sling-field-grid sling-field-grid--3">
                      <div className="sling-field">
                        <label className="sling-field__label">Status</label>
                        <select className="sling-field__input" value={formData.status || 'active'} onChange={(e) => updateForm('status', e.target.value)}>
                          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Employment Type</label>
                        <select className="sling-field__input" value={formData.employmentType || 'full_time'} onChange={(e) => updateForm('employmentType', e.target.value)}>
                          {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Department</label>
                        <select className="sling-field__input" value={formData.department || ''} onChange={(e) => updateForm('department', e.target.value)}>
                          <option value="">Select...</option>
                          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="sling-status-row">
                      <span className="sling-status-badge sling-status-badge--joined">Joined</span>
                      <div className="sling-field" style={{ flex: 1 }}>
                        <label className="sling-field__label">Hire Date</label>
                        <input type="date" className="sling-field__input" value={formData.hireDate || ''} onChange={(e) => updateForm('hireDate', e.target.value)} />
                      </div>
                      {formData.hireDate && (
                        <div className="tenure-display">
                          <span className="tenure-value">{getTenure(formData.hireDate)}</span>
                          <span className="tenure-label">tenure</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Role & Access</h3>
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
                    <div className="sling-field">
                      <label className="sling-field__label">Performance Rating</label>
                      <input type="number" className="sling-field__input" value={formData.performanceRating || ''} onChange={(e) => updateForm('performanceRating', e.target.value)} placeholder="1.0 - 5.0" min="1" max="5" step="0.1" />
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
                    <h3 className="sling-section__title">Skills</h3>
                    <div className="chip-select">
                      {(formData.skills || []).map((skill, i) => (
                        <span key={i} className="chip chip--active chip--removable" onClick={() => removeSkill(i)}>
                          {skill} <X size={10} />
                        </span>
                      ))}
                    </div>
                    <div className="sling-inline-add" style={{ marginTop: 8 }}>
                      <input type="text" className="sling-field__input sling-inline-add__input" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add skill..." onKeyDown={(e) => e.key === 'Enter' && addSkill()} />
                      <button className="btn btn--secondary btn--sm" onClick={addSkill}>Add</button>
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
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== WAGES TAB ===== */}
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
                    <div className="sling-field-grid">
                      <div className="sling-field">
                        <label className="sling-field__label">Hourly Rate ($)</label>
                        <input type="number" className="sling-field__input" value={formData.hourlyRate || ''} onChange={(e) => updateForm('hourlyRate', e.target.value)} placeholder="0.00" min="0" step="0.01" />
                      </div>
                      <div className="sling-field">
                        <label className="sling-field__label">Overtime Multiplier</label>
                        <input type="number" className="sling-field__input" value={formData.overtimeRate || 1.5} onChange={(e) => updateForm('overtimeRate', e.target.value)} placeholder="1.5" min="1" step="0.1" />
                        <span className="sling-field__hint">OT rate: ${((Number(formData.hourlyRate) || 0) * (Number(formData.overtimeRate) || 1.5)).toFixed(2)}/hr</span>
                      </div>
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Position Wages</h3>
                    <p className="sling-field__hint" style={{ marginBottom: 12 }}>Set different rates per position. When an employee works a specific position, this rate applies.</p>

                    {(formData.wages || []).length > 0 && (
                      <div className="sling-wages-list">
                        {formData.wages.map((w, i) => (
                          <div key={i} className="sling-wage-row">
                            <div className="sling-wage-row__position"><Briefcase size={14} /><span>{w.position}</span></div>
                            <div className="sling-wage-row__rate">${Number(w.rate).toFixed(2)}</div>
                            <div className="sling-wage-row__date"><Calendar size={12} /><span>Effective {formatHireDate(w.effectiveDate)}</span></div>
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

              {/* ===== DOCUMENTS & CERTIFICATIONS TAB ===== */}
              {detailTab === 'documents' && (
                <div className="sling-fields">
                  <div className="sling-section">
                    <h3 className="sling-section__title">Certifications</h3>
                    {(formData.certifications || []).length > 0 ? (
                      <div className="cert-list">
                        {formData.certifications.map((cert, i) => (
                          <div key={i} className={`cert-card cert-card--${cert.status || 'valid'}`}>
                            <div className="cert-card__icon">
                              {cert.status === 'expired' ? <XCircle size={18} /> : cert.status === 'expiring_soon' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                            </div>
                            <div className="cert-card__info">
                              <span className="cert-card__name">{cert.name}</span>
                              <span className="cert-card__dates">
                                Issued: {formatHireDate(cert.issueDate)}
                                {cert.expiryDate ? ` · Expires: ${formatHireDate(cert.expiryDate)}` : ' · No Expiry'}
                              </span>
                            </div>
                            <span className={`cert-card__status cert-card__status--${cert.status || 'valid'}`}>
                              {cert.status === 'expired' ? 'EXPIRED' : cert.status === 'expiring_soon' ? 'EXPIRING' : 'VALID'}
                            </span>
                            <button className="btn btn--icon btn--sm" onClick={() => removeCert(i)} title="Remove"><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="sling-field__hint">No certifications on file</p>
                    )}

                    <div className="sling-cert-add">
                      <input type="text" className="sling-field__input" value={newCert.name} onChange={(e) => setNewCert({ ...newCert, name: e.target.value })} placeholder="Certification name" />
                      <input type="date" className="sling-field__input" value={newCert.issueDate} onChange={(e) => setNewCert({ ...newCert, issueDate: e.target.value })} title="Issue date" />
                      <input type="date" className="sling-field__input" value={newCert.expiryDate} onChange={(e) => setNewCert({ ...newCert, expiryDate: e.target.value })} title="Expiry date" />
                      <button className="btn btn--secondary btn--sm" onClick={addCertification}>Add</button>
                    </div>
                  </div>

                  <div className="sling-section">
                    <h3 className="sling-section__title">Documents on File</h3>
                    {(formData.documents || []).length > 0 ? (
                      <div className="doc-list">
                        {formData.documents.map((doc, i) => (
                          <div key={i} className="doc-item">
                            <FileText size={14} />
                            <span>{doc}</span>
                            <button className="btn btn--icon btn--sm" onClick={() => setFormData((prev) => ({ ...prev, documents: prev.documents.filter((_, j) => j !== i) }))} title="Remove"><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="sling-field__hint">No documents on file</p>
                    )}
                    <div className="sling-inline-add" style={{ marginTop: 8 }}>
                      <input type="text" className="sling-field__input sling-inline-add__input" placeholder="Add document name..." onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          setFormData((prev) => ({ ...prev, documents: [...(prev.documents || []), e.target.value.trim()] }));
                          e.target.value = '';
                        }
                      }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ===== AVAILABILITY TAB ===== */}
              {detailTab === 'schedule' && (
                <div className="sling-fields">
                  <div className="sling-section">
                    <h3 className="sling-section__title">Weekly Availability</h3>
                    <p className="sling-field__hint" style={{ marginBottom: 16 }}>Set the hours this employee is available to work each day.</p>
                    <div className="availability-grid">
                      {DAYS_OF_WEEK.map((day) => {
                        const avail = formData.availability?.[day];
                        const isAvailable = !!avail;
                        return (
                          <div key={day} className={`avail-row ${isAvailable ? 'avail-row--on' : 'avail-row--off'}`}>
                            <label className="avail-row__toggle">
                              <input type="checkbox" checked={isAvailable} onChange={(e) => {
                                if (e.target.checked) {
                                  updateAvailability(day, 'start', '09:00');
                                  updateAvailability(day, 'end', '17:00');
                                } else {
                                  updateAvailability(day, 'start', '');
                                }
                              }} />
                              <span className="avail-row__day">{DAY_LABELS[day]}</span>
                            </label>
                            {isAvailable ? (
                              <div className="avail-row__times">
                                <input type="time" className="sling-field__input avail-time-input" value={avail.start || '09:00'} onChange={(e) => updateAvailability(day, 'start', e.target.value)} />
                                <span className="avail-row__separator">to</span>
                                <input type="time" className="sling-field__input avail-time-input" value={avail.end || '17:00'} onChange={(e) => updateAvailability(day, 'end', e.target.value)} />
                              </div>
                            ) : (
                              <span className="avail-row__unavailable">Unavailable</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!isNewEmployee && (
                    <div className="sling-section">
                      <h3 className="sling-section__title">This Week&apos;s Stats</h3>
                      <div className="week-stats-grid">
                        <div className="week-stat">
                          <span className="week-stat__value">{(weeklyHours[detailEmp.id] || 0).toFixed(1)}h</span>
                          <span className="week-stat__label">Scheduled</span>
                        </div>
                        <div className="week-stat">
                          <span className="week-stat__value">{clockedIn[detailEmp.id] ? 'Yes' : 'No'}</span>
                          <span className="week-stat__label">Clocked In</span>
                        </div>
                        <div className="week-stat">
                          <span className="week-stat__value">{detailEmp.performanceRating ? detailEmp.performanceRating.toFixed(1) : '—'}</span>
                          <span className="week-stat__label">Rating</span>
                        </div>
                      </div>
                    </div>
                  )}
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
