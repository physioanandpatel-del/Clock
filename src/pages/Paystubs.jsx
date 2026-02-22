import { useState, useMemo } from 'react';
import { useApp, hasAccess } from '../context/AppContext';
import { format, parseISO, startOfYear } from 'date-fns';
import {
  Upload, X, Check, AlertTriangle, DollarSign, Users, FileText,
  Search, Link2, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';
import { getInitials } from '../utils/helpers';
import './Paystubs.css';

export default function Paystubs() {
  const { state, dispatch } = useApp();
  const { paystubs = [], employees, currentLocationId, currentUserId } = state;
  const currentUser = employees.find((e) => e.id === currentUserId);
  const userAccess = currentUser?.accessLevel || 'employee';
  const isManager = hasAccess(userAccess, 'manager');
  const locationEmployees = employees.filter((e) => (e.locationIds || []).includes(currentLocationId));

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchingStub, setMatchingStub] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedStub, setExpandedStub] = useState(null);

  // Bulk upload form
  const [bulkEntries, setBulkEntries] = useState([
    { rawName: '', periodStart: '', periodEnd: '', grossPay: '', netPay: '', deductions: '' },
  ]);

  // Auto-match logic
  function autoMatch(rawName) {
    if (!rawName) return { employeeId: null, confidence: 0 };
    const lower = rawName.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    locationEmployees.forEach((emp) => {
      const names = [emp.name.toLowerCase(), (emp.preferredName || '').toLowerCase()];
      const parts = emp.name.toLowerCase().split(' ');
      // Full name match
      if (names.some((n) => n === lower)) { bestMatch = emp; bestScore = 100; return; }
      // Last name + first initial (e.g. "S. Tremblay" -> "Sophie Tremblay")
      const firstInitial = parts[0]?.[0];
      const lastName = parts[parts.length - 1];
      if (lower.includes(lastName)) {
        const score = lower.includes(firstInitial + '.') ? 90 : 75;
        if (score > bestScore) { bestMatch = emp; bestScore = score; }
      }
      // Partial match
      if (parts.some((p) => lower.includes(p) && p.length > 2)) {
        if (60 > bestScore) { bestMatch = emp; bestScore = 60; }
      }
    });

    return { employeeId: bestMatch?.id || null, confidence: bestScore };
  }

  function handleBulkUpload(e) {
    e.preventDefault();
    const stubs = bulkEntries.filter((entry) => entry.rawName && entry.grossPay).map((entry) => {
      const match = autoMatch(entry.rawName);
      return {
        employeeId: match.employeeId,
        periodStart: entry.periodStart,
        periodEnd: entry.periodEnd,
        grossPay: Number(entry.grossPay),
        netPay: Number(entry.netPay) || 0,
        deductions: Number(entry.deductions) || 0,
        uploadDate: format(new Date(), 'yyyy-MM-dd'),
        status: match.employeeId ? 'matched' : 'unmatched',
        matchConfidence: match.confidence,
        rawName: entry.rawName,
      };
    });
    if (stubs.length > 0) {
      dispatch({ type: 'BULK_ADD_PAYSTUBS', payload: stubs });
    }
    setShowUploadModal(false);
    setBulkEntries([{ rawName: '', periodStart: '', periodEnd: '', grossPay: '', netPay: '', deductions: '' }]);
  }

  function addBulkRow() {
    setBulkEntries([...bulkEntries, { rawName: '', periodStart: '', periodEnd: '', grossPay: '', netPay: '', deductions: '' }]);
  }

  function updateBulkRow(idx, field, value) {
    const updated = [...bulkEntries];
    updated[idx] = { ...updated[idx], [field]: value };
    setBulkEntries(updated);
  }

  function removeBulkRow(idx) {
    if (bulkEntries.length <= 1) return;
    setBulkEntries(bulkEntries.filter((_, i) => i !== idx));
  }

  function openMatchModal(stub) {
    setMatchingStub(stub);
    setShowMatchModal(true);
  }

  function handleManualMatch(employeeId) {
    if (!matchingStub) return;
    dispatch({ type: 'UPDATE_PAYSTUB', payload: { id: matchingStub.id, employeeId, status: 'matched', matchConfidence: 100 } });
    setShowMatchModal(false);
    setMatchingStub(null);
  }

  // YTD calculations per employee
  const ytdByEmployee = useMemo(() => {
    const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');
    const map = {};
    paystubs.filter((p) => p.status === 'matched' && p.employeeId && p.periodEnd >= yearStart).forEach((p) => {
      if (!map[p.employeeId]) map[p.employeeId] = { gross: 0, net: 0, deductions: 0, count: 0 };
      map[p.employeeId].gross += p.grossPay;
      map[p.employeeId].net += p.netPay;
      map[p.employeeId].deductions += p.deductions;
      map[p.employeeId].count += 1;
    });
    return map;
  }, [paystubs]);

  const filtered = filterStatus === 'all' ? paystubs : paystubs.filter((p) => p.status === filterStatus);
  const sorted = [...filtered].sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''));
  const unmatchedCount = paystubs.filter((p) => p.status === 'unmatched').length;

  return (
    <div className="paystubs-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Paystubs</h1>
          <p className="page-subtitle">{paystubs.length} paystub{paystubs.length !== 1 ? 's' : ''} uploaded</p>
        </div>
        {isManager && (
          <button className="btn btn--primary" onClick={() => setShowUploadModal(true)}>
            <Upload size={16} /> Upload Paystubs
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="paystub-summary">
        <div className="paystub-summary-card">
          <FileText size={20} />
          <div>
            <div className="paystub-summary-card__value">{paystubs.length}</div>
            <div className="paystub-summary-card__label">Total Stubs</div>
          </div>
        </div>
        <div className="paystub-summary-card">
          <Check size={20} />
          <div>
            <div className="paystub-summary-card__value">{paystubs.filter((p) => p.status === 'matched').length}</div>
            <div className="paystub-summary-card__label">Matched</div>
          </div>
        </div>
        {unmatchedCount > 0 && (
          <div className="paystub-summary-card paystub-summary-card--alert">
            <AlertTriangle size={20} />
            <div>
              <div className="paystub-summary-card__value">{unmatchedCount}</div>
              <div className="paystub-summary-card__label">Unmatched</div>
            </div>
          </div>
        )}
        <div className="paystub-summary-card">
          <DollarSign size={20} />
          <div>
            <div className="paystub-summary-card__value">
              ${paystubs.filter((p) => p.status === 'matched').reduce((s, p) => s + p.grossPay, 0).toLocaleString()}
            </div>
            <div className="paystub-summary-card__label">YTD Gross</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="paystub-filter-bar">
        <button className={`paystub-filter ${filterStatus === 'all' ? 'paystub-filter--active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
        <button className={`paystub-filter ${filterStatus === 'matched' ? 'paystub-filter--active' : ''}`} onClick={() => setFilterStatus('matched')}>Matched</button>
        <button className={`paystub-filter ${filterStatus === 'unmatched' ? 'paystub-filter--active' : ''}`} onClick={() => setFilterStatus('unmatched')}>
          Unmatched {unmatchedCount > 0 && <span className="paystub-filter__badge">{unmatchedCount}</span>}
        </button>
      </div>

      {/* Paystub List */}
      {sorted.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} className="empty-state__icon" />
          <h3>No Paystubs</h3>
          <p>Upload paystubs to automatically match them to team members and track YTD payments.</p>
        </div>
      ) : (
        <div className="paystub-list">
          {sorted.map((stub) => {
            const emp = stub.employeeId ? employees.find((e) => e.id === stub.employeeId) : null;
            const isExpanded = expandedStub === stub.id;
            const ytd = stub.employeeId ? ytdByEmployee[stub.employeeId] : null;

            return (
              <div key={stub.id} className={`paystub-card ${stub.status === 'unmatched' ? 'paystub-card--unmatched' : ''}`}>
                <div className="paystub-card__main" onClick={() => setExpandedStub(isExpanded ? null : stub.id)}>
                  <div className="paystub-card__avatar" style={{ background: emp?.color || '#94a3b8' }}>
                    {emp ? getInitials(emp.name) : '?'}
                  </div>
                  <div className="paystub-card__info">
                    <div className="paystub-card__name">
                      {emp ? emp.name : stub.rawName || 'Unmatched'}
                      {stub.status === 'unmatched' && <span className="badge badge--warning">Unmatched</span>}
                      {stub.status === 'matched' && stub.matchConfidence < 100 && (
                        <span className="paystub-card__confidence">{stub.matchConfidence}% match</span>
                      )}
                    </div>
                    <div className="paystub-card__period">
                      {stub.periodStart && stub.periodEnd
                        ? `${format(parseISO(stub.periodStart), 'MMM d')} - ${format(parseISO(stub.periodEnd), 'MMM d, yyyy')}`
                        : 'No period specified'}
                    </div>
                  </div>
                  <div className="paystub-card__amounts">
                    <div className="paystub-card__amount">
                      <span className="paystub-card__amount-value">${stub.grossPay.toLocaleString()}</span>
                      <span className="paystub-card__amount-label">Gross</span>
                    </div>
                    <div className="paystub-card__amount">
                      <span className="paystub-card__amount-value">${stub.netPay.toLocaleString()}</span>
                      <span className="paystub-card__amount-label">Net</span>
                    </div>
                    <div className="paystub-card__amount">
                      <span className="paystub-card__amount-value">${stub.deductions.toLocaleString()}</span>
                      <span className="paystub-card__amount-label">Deductions</span>
                    </div>
                  </div>
                  <div className="paystub-card__actions">
                    {stub.status === 'unmatched' && isManager && (
                      <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); openMatchModal(stub); }}>
                        <Link2 size={12} /> Match
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="paystub-card__expanded">
                    <div className="paystub-detail-row">
                      <span>Upload Date:</span>
                      <span>{stub.uploadDate ? format(parseISO(stub.uploadDate), 'MMM d, yyyy') : '-'}</span>
                    </div>
                    {stub.rawName && <div className="paystub-detail-row"><span>Name on Stub:</span><span>{stub.rawName}</span></div>}
                    {ytd && (
                      <div className="paystub-ytd">
                        <h4>YTD Totals for {emp?.name}</h4>
                        <div className="paystub-ytd__stats">
                          <div><strong>${ytd.gross.toLocaleString()}</strong><span>Gross</span></div>
                          <div><strong>${ytd.net.toLocaleString()}</strong><span>Net</span></div>
                          <div><strong>${ytd.deductions.toLocaleString()}</strong><span>Deductions</span></div>
                          <div><strong>{ytd.count}</strong><span>Pay Periods</span></div>
                        </div>
                      </div>
                    )}
                    {isManager && (
                      <div className="paystub-card__delete">
                        <button className="btn btn--danger btn--sm" onClick={() => dispatch({ type: 'DELETE_PAYSTUB', payload: stub.id })}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title"><Upload size={18} /> Bulk Upload Paystubs</h2>
              <button className="btn btn--icon" onClick={() => setShowUploadModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleBulkUpload}>
              <div className="modal__body">
                <p className="form-hint" style={{ margin: '0 0 16px' }}>
                  Enter paystub details below. The system will automatically match names to team members. Unmatched stubs can be manually linked after upload.
                </p>
                <div className="bulk-upload-table">
                  <div className="bulk-upload-header">
                    <span>Name on Stub</span>
                    <span>Period Start</span>
                    <span>Period End</span>
                    <span>Gross Pay</span>
                    <span>Net Pay</span>
                    <span>Deductions</span>
                    <span></span>
                  </div>
                  {bulkEntries.map((entry, idx) => (
                    <div key={idx} className="bulk-upload-row">
                      <input className="form-input" value={entry.rawName} onChange={(e) => updateBulkRow(idx, 'rawName', e.target.value)} placeholder="e.g. S. Tremblay" required />
                      <input type="date" className="form-input" value={entry.periodStart} onChange={(e) => updateBulkRow(idx, 'periodStart', e.target.value)} />
                      <input type="date" className="form-input" value={entry.periodEnd} onChange={(e) => updateBulkRow(idx, 'periodEnd', e.target.value)} />
                      <input type="number" className="form-input" value={entry.grossPay} onChange={(e) => updateBulkRow(idx, 'grossPay', e.target.value)} placeholder="$" required min="0" step="0.01" />
                      <input type="number" className="form-input" value={entry.netPay} onChange={(e) => updateBulkRow(idx, 'netPay', e.target.value)} placeholder="$" min="0" step="0.01" />
                      <input type="number" className="form-input" value={entry.deductions} onChange={(e) => updateBulkRow(idx, 'deductions', e.target.value)} placeholder="$" min="0" step="0.01" />
                      <button type="button" className="btn btn--icon btn--sm" onClick={() => removeBulkRow(idx)} disabled={bulkEntries.length <= 1}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn--secondary btn--sm" onClick={addBulkRow} style={{ marginTop: 8 }}>
                  + Add Row
                </button>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">
                    <Upload size={14} /> Upload & Match
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Match Modal */}
      {showMatchModal && matchingStub && (
        <div className="modal-overlay" onClick={() => setShowMatchModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title"><Link2 size={18} /> Match Paystub</h2>
              <button className="btn btn--icon" onClick={() => setShowMatchModal(false)}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <p className="form-hint" style={{ margin: '0 0 12px' }}>
                Name on stub: <strong>{matchingStub.rawName || 'Unknown'}</strong> -
                Gross: <strong>${matchingStub.grossPay.toLocaleString()}</strong>
              </p>
              <p className="form-hint" style={{ margin: '0 0 16px' }}>Select the employee this paystub belongs to:</p>
              <div className="match-employee-list">
                {locationEmployees.map((emp) => (
                  <button key={emp.id} className="match-employee-item" onClick={() => handleManualMatch(emp.id)}>
                    <div className="match-employee-avatar" style={{ background: emp.color }}>
                      {getInitials(emp.name)}
                    </div>
                    <div className="match-employee-info">
                      <span className="match-employee-name">{emp.name}</span>
                      <span className="match-employee-role">{(emp.roles || []).join(', ')}</span>
                    </div>
                    <Check size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
