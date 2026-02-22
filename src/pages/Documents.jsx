import { useState, useMemo } from 'react';
import { FileText, Upload, Search, FolderOpen, Trash2, Download, Eye, Plus, X, User, Calendar, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getInitials, formatDate } from '../utils/helpers';
import './Documents.css';

const DOC_CATEGORIES = ['All', 'Employment', 'Identification', 'Certifications', 'Tax Forms', 'Training', 'Policies', 'Other'];
const DOC_TYPES = {
  'Employment Contract': { category: 'Employment', icon: '📋' },
  'Part-Time Agreement': { category: 'Employment', icon: '📋' },
  'Direct Deposit Form': { category: 'Employment', icon: '🏦' },
  'ID Verified': { category: 'Identification', icon: '🪪' },
  'Work Permit': { category: 'Identification', icon: '🪪' },
  'Tax Forms (TD1)': { category: 'Tax Forms', icon: '📄' },
  'Background Check': { category: 'Employment', icon: '🔍' },
  'Smart Serve Copy': { category: 'Certifications', icon: '🎓' },
  'First Aid Certificate': { category: 'Certifications', icon: '🎓' },
  'Red Seal Certificate': { category: 'Certifications', icon: '🎓' },
  'BarSmarts Certificate': { category: 'Certifications', icon: '🎓' },
  'Cicerone Certificate': { category: 'Certifications', icon: '🎓' },
  'WSET Certificate': { category: 'Certifications', icon: '🎓' },
};

export default function Documents() {
  const { state, dispatch } = useApp();
  const { employees, currentLocationId } = state;
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', category: 'Employment', employeeId: '', notes: '' });
  const [viewDoc, setViewDoc] = useState(null);

  const locationEmployees = employees.filter((e) => e.locationIds?.includes(currentLocationId));

  const allDocuments = useMemo(() => {
    const docs = [];
    locationEmployees.forEach((emp) => {
      (emp.documents || []).forEach((docName, idx) => {
        const docType = DOC_TYPES[docName] || { category: 'Other', icon: '📎' };
        docs.push({
          id: `${emp.id}-doc-${idx}`,
          name: docName,
          employeeId: emp.id,
          employeeName: emp.name,
          category: docType.category,
          icon: docType.icon,
          uploadDate: emp.hireDate || '2024-01-01',
          status: 'verified',
        });
      });
      // Add certifications as documents too
      (emp.certifications || []).forEach((cert, idx) => {
        docs.push({
          id: `${emp.id}-cert-${idx}`,
          name: cert.name,
          employeeId: emp.id,
          employeeName: emp.name,
          category: 'Certifications',
          icon: '🎓',
          uploadDate: cert.issueDate,
          expiryDate: cert.expiryDate,
          status: cert.status,
        });
      });
    });
    return docs;
  }, [locationEmployees]);

  const filtered = useMemo(() => {
    return allDocuments.filter((doc) => {
      if (search && !doc.name.toLowerCase().includes(search.toLowerCase()) && !doc.employeeName.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'All' && doc.category !== categoryFilter) return false;
      if (employeeFilter !== 'all' && doc.employeeId !== employeeFilter) return false;
      return true;
    });
  }, [allDocuments, search, categoryFilter, employeeFilter]);

  const stats = useMemo(() => ({
    total: allDocuments.length,
    verified: allDocuments.filter((d) => d.status === 'verified' || d.status === 'valid').length,
    expiring: allDocuments.filter((d) => d.status === 'expiring_soon').length,
    expired: allDocuments.filter((d) => d.status === 'expired').length,
  }), [allDocuments]);

  const addDocument = () => {
    if (!uploadForm.name.trim() || !uploadForm.employeeId) return;
    const emp = employees.find((e) => e.id === uploadForm.employeeId);
    if (!emp) return;
    const docs = [...(emp.documents || []), uploadForm.name.trim()];
    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: emp.id, documents: docs } });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { action: 'employee_update', entityType: 'employee', entityId: emp.id, details: `Document "${uploadForm.name}" added for ${emp.name}`, userId: state.currentUserId } });
    setShowUpload(false);
    setUploadForm({ name: '', category: 'Employment', employeeId: '', notes: '' });
  };

  const removeDocument = (doc) => {
    if (!window.confirm(`Remove "${doc.name}" from ${doc.employeeName}?`)) return;
    const emp = employees.find((e) => e.id === doc.employeeId);
    if (!emp) return;
    const docs = (emp.documents || []).filter((d) => d !== doc.name);
    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: emp.id, documents: docs } });
  };

  return (
    <div className="documents-page">
      <div className="page-header">
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}><Upload size={16} /> Upload Document</button>
      </div>

      <div className="doc-stats">
        <div className="doc-stat"><FileText size={18} /> <div><strong>{stats.total}</strong><span>Total Documents</span></div></div>
        <div className="doc-stat doc-stat--success"><FileText size={18} /> <div><strong>{stats.verified}</strong><span>Verified/Valid</span></div></div>
        <div className="doc-stat doc-stat--warning"><FileText size={18} /> <div><strong>{stats.expiring}</strong><span>Expiring Soon</span></div></div>
        <div className="doc-stat doc-stat--danger"><FileText size={18} /> <div><strong>{stats.expired}</strong><span>Expired</span></div></div>
      </div>

      <div className="doc-toolbar">
        <div className="customers-search">
          <Search size={16} />
          <input type="text" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="doc-filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="doc-filter-select" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
          <option value="all">All Employees</option>
          {locationEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><FolderOpen size={48} /><p>No documents found</p></div>
      ) : (
        <div className="doc-table-wrap">
          <table className="table doc-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Employee</th>
                <th>Category</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="doc-name">
                      <span className="doc-icon">{doc.icon}</span>
                      <span>{doc.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="doc-employee">
                      <div className="doc-emp-avatar" style={{ background: employees.find((e) => e.id === doc.employeeId)?.color || '#ccc' }}>
                        {getInitials(doc.employeeName)}
                      </div>
                      {doc.employeeName}
                    </div>
                  </td>
                  <td><span className="doc-category-badge">{doc.category}</span></td>
                  <td>{formatDate(doc.uploadDate)}</td>
                  <td>
                    <span className={`doc-status doc-status--${doc.status}`}>
                      {doc.status === 'verified' ? 'Verified' : doc.status === 'valid' ? 'Valid' : doc.status === 'expiring_soon' ? 'Expiring' : doc.status === 'expired' ? 'Expired' : doc.status}
                    </span>
                    {doc.expiryDate && <div className="doc-expiry">Exp: {formatDate(doc.expiryDate)}</div>}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-icon" title="View" onClick={() => setViewDoc(doc)}><Eye size={14} /></button>
                      <button className="btn-icon btn-icon--danger" title="Remove" onClick={() => removeDocument(doc)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Document */}
      {viewDoc && (
        <div className="modal-overlay" onClick={() => setViewDoc(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Document Details</h2>
              <button className="btn-icon" onClick={() => setViewDoc(null)}><X size={20} /></button>
            </div>
            <div className="modal__body">
              <div className="doc-detail-icon">{viewDoc.icon}</div>
              <h3 style={{ textAlign: 'center', marginBottom: 20 }}>{viewDoc.name}</h3>
              <div className="doc-detail-grid">
                <div className="doc-detail-row"><User size={14} /> <strong>Employee:</strong> {viewDoc.employeeName}</div>
                <div className="doc-detail-row"><Tag size={14} /> <strong>Category:</strong> {viewDoc.category}</div>
                <div className="doc-detail-row"><Calendar size={14} /> <strong>Upload Date:</strong> {formatDate(viewDoc.uploadDate)}</div>
                {viewDoc.expiryDate && <div className="doc-detail-row"><Calendar size={14} /> <strong>Expiry Date:</strong> {formatDate(viewDoc.expiryDate)}</div>}
                <div className="doc-detail-row"><FileText size={14} /> <strong>Status:</strong> <span className={`doc-status doc-status--${viewDoc.status}`}>{viewDoc.status}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Upload Document</h2>
              <button className="btn-icon" onClick={() => setShowUpload(false)}><X size={20} /></button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group form-group--full">
                  <label>Document Name *</label>
                  <input type="text" value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} placeholder="e.g. Employment Contract" />
                </div>
                <div className="form-group">
                  <label>Employee *</label>
                  <select value={uploadForm.employeeId} onChange={(e) => setUploadForm({ ...uploadForm, employeeId: e.target.value })}>
                    <option value="">Select employee</option>
                    {locationEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}>
                    {DOC_CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group form-group--full">
                  <label>Notes</label>
                  <textarea value={uploadForm.notes} onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })} rows={2} placeholder="Optional notes..." />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addDocument}><Upload size={14} /> Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
