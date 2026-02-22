import { useState, useMemo } from 'react';
import { useApp, hasAccess } from '../context/AppContext';
import { format, parseISO, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import {
  Upload, X, Plus, DollarSign, TrendingUp, Users, BarChart3,
  ChevronDown, ChevronUp, AlertTriangle, Trash2, FileText,
} from 'lucide-react';
import { getInitials, getEffectiveRate } from '../utils/helpers';
import './SalesReports.css';

export default function SalesReports() {
  const { state, dispatch } = useApp();
  const {
    subcontractors = [], subcontractorRevenue = [], employees, currentLocationId,
    locations, currentUserId, timeEntries = [], shifts = [],
  } = state;
  const currentUser = employees.find((e) => e.id === currentUserId);
  const userAccess = currentUser?.accessLevel || 'employee';
  const isManager = hasAccess(userAccess, 'manager');
  const locationSubs = subcontractors.filter((s) => (s.locationIds || []).includes(currentLocationId));
  const locationEmployees = employees.filter((e) => (e.locationIds || []).includes(currentLocationId));
  const currentLocation = locations.find((l) => l.id === currentLocationId);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState('providers'); // providers, timeline
  const [dateRange, setDateRange] = useState('month'); // month, quarter, year

  // Bulk upload form for EMR data
  const [emrEntries, setEmrEntries] = useState([
    { providerName: '', date: format(new Date(), 'yyyy-MM-dd'), amount: '', visits: '', description: '' },
  ]);

  // Date range calculation
  const rangeStart = useMemo(() => {
    const now = new Date();
    if (dateRange === 'month') return format(startOfMonth(now), 'yyyy-MM-dd');
    if (dateRange === 'quarter') return format(subDays(now, 90), 'yyyy-MM-dd');
    return format(startOfYear(now), 'yyyy-MM-dd');
  }, [dateRange]);

  // Match EMR provider name to subcontractor
  function matchProvider(name) {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    return locationSubs.find((s) => {
      const subLower = s.name.toLowerCase();
      if (subLower === lower) return true;
      const parts = s.name.toLowerCase().split(' ');
      const lastName = parts[parts.length - 1];
      if (lower.includes(lastName) && parts.some((p) => lower.includes(p))) return true;
      return false;
    });
  }

  function handleBulkUpload(e) {
    e.preventDefault();
    const entries = emrEntries.filter((entry) => entry.providerName && entry.amount).map((entry) => {
      const matched = matchProvider(entry.providerName);
      return {
        subcontractorId: matched?.id || null,
        date: entry.date,
        amount: Number(entry.amount),
        visits: Number(entry.visits) || 0,
        description: entry.description || `EMR Import - ${entry.providerName}`,
      };
    }).filter((e) => e.subcontractorId);

    if (entries.length > 0) {
      dispatch({ type: 'BULK_ADD_SUBCONTRACTOR_REVENUE', payload: entries });
    }
    setShowUploadModal(false);
    setEmrEntries([{ providerName: '', date: format(new Date(), 'yyyy-MM-dd'), amount: '', visits: '', description: '' }]);
  }

  function addEmrRow() {
    setEmrEntries([...emrEntries, { providerName: '', date: format(new Date(), 'yyyy-MM-dd'), amount: '', visits: '', description: '' }]);
  }

  function updateEmrRow(idx, field, value) {
    const updated = [...emrEntries];
    updated[idx] = { ...updated[idx], [field]: value };
    setEmrEntries(updated);
  }

  function removeEmrRow(idx) {
    if (emrEntries.length <= 1) return;
    setEmrEntries(emrEntries.filter((_, i) => i !== idx));
  }

  // Provider revenue vs cost analysis
  const providerAnalysis = useMemo(() => {
    return locationSubs.map((sub) => {
      const revEntries = subcontractorRevenue.filter((r) => r.subcontractorId === sub.id && r.date >= rangeStart);
      const totalRevenue = revEntries.reduce((s, r) => s + r.amount, 0);
      const totalVisits = revEntries.reduce((s, r) => s + (r.visits || 0), 0);

      // Commission cost
      const commission = sub.commissionType === 'percentage'
        ? totalRevenue * (sub.commissionRate / 100)
        : totalVisits * sub.commissionRate;

      // Assistant cost (from provider-assistant tags)
      const tags = (state.providerAssistantTags || []).filter((t) => t.providerId === sub.id);
      let assistantCost = 0;
      tags.forEach((tag) => {
        const assistant = employees.find((e) => e.id === tag.assistantId);
        if (!assistant) return;
        // Estimate hours from shifts in the date range
        const assistantShifts = shifts.filter((s) =>
          s.employeeId === tag.assistantId &&
          s.start >= rangeStart
        );
        const totalHours = assistantShifts.reduce((sum, s) => {
          const hrs = (new Date(s.end) - new Date(s.start)) / (1000 * 60 * 60);
          return sum + hrs;
        }, 0);
        assistantCost += totalHours * getEffectiveRate(assistant);
      });

      const netProfit = totalRevenue - commission - assistantCost;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        sub,
        totalRevenue,
        totalVisits,
        commission,
        assistantCost,
        netProfit,
        profitMargin,
        entryCount: revEntries.length,
        tags,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [locationSubs, subcontractorRevenue, rangeStart, state.providerAssistantTags, employees, shifts]);

  const totalRevenue = providerAnalysis.reduce((s, p) => s + p.totalRevenue, 0);
  const totalCommission = providerAnalysis.reduce((s, p) => s + p.commission, 0);
  const totalNetProfit = providerAnalysis.reduce((s, p) => s + p.netProfit, 0);

  return (
    <div className="sales-reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">EMR Sales Reports</h1>
          <p className="page-subtitle">Revenue allocation and provider cost analysis</p>
        </div>
        <div className="page-header__actions">
          <div className="sr-range-selector">
            <button className={`sr-range-btn ${dateRange === 'month' ? 'sr-range-btn--active' : ''}`} onClick={() => setDateRange('month')}>Month</button>
            <button className={`sr-range-btn ${dateRange === 'quarter' ? 'sr-range-btn--active' : ''}`} onClick={() => setDateRange('quarter')}>Quarter</button>
            <button className={`sr-range-btn ${dateRange === 'year' ? 'sr-range-btn--active' : ''}`} onClick={() => setDateRange('year')}>Year</button>
          </div>
          {isManager && (
            <button className="btn btn--primary" onClick={() => setShowUploadModal(true)}>
              <Upload size={16} /> Import EMR Data
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="sr-summary">
        <div className="sr-summary-card">
          <DollarSign size={20} />
          <div>
            <div className="sr-summary-card__value">${totalRevenue.toLocaleString()}</div>
            <div className="sr-summary-card__label">Total Revenue</div>
          </div>
        </div>
        <div className="sr-summary-card">
          <Users size={20} />
          <div>
            <div className="sr-summary-card__value">${totalCommission.toLocaleString()}</div>
            <div className="sr-summary-card__label">Commissions</div>
          </div>
        </div>
        <div className="sr-summary-card sr-summary-card--success">
          <TrendingUp size={20} />
          <div>
            <div className="sr-summary-card__value">${totalNetProfit.toLocaleString()}</div>
            <div className="sr-summary-card__label">Net Profit</div>
          </div>
        </div>
        <div className="sr-summary-card">
          <BarChart3 size={20} />
          <div>
            <div className="sr-summary-card__value">
              {totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : '0'}%
            </div>
            <div className="sr-summary-card__label">Profit Margin</div>
          </div>
        </div>
      </div>

      {/* Provider Analysis Table */}
      {providerAnalysis.length === 0 ? (
        <div className="empty-state">
          <BarChart3 size={48} className="empty-state__icon" />
          <h3>No Provider Data</h3>
          <p>Add subcontractors and import EMR sales data to see revenue analysis.</p>
        </div>
      ) : (
        <div className="sr-table-wrap">
          <table className="sr-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Revenue</th>
                <th>Visits</th>
                <th>Commission</th>
                <th>Assistant Cost</th>
                <th>Net Profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {providerAnalysis.map((pa) => (
                <tr key={pa.sub.id}>
                  <td>
                    <div className="sr-provider-cell">
                      <div className="sr-provider-avatar" style={{ background: pa.sub.color }}>
                        {getInitials(pa.sub.name)}
                      </div>
                      <div>
                        <div className="sr-provider-name">{pa.sub.name}</div>
                        <div className="sr-provider-type">
                          {pa.sub.commissionType === 'percentage' ? `${pa.sub.commissionRate}% split` : `$${pa.sub.commissionRate}/visit`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="sr-td-amount">${pa.totalRevenue.toLocaleString()}</td>
                  <td className="sr-td-center">{pa.totalVisits}</td>
                  <td className="sr-td-amount">${pa.commission.toLocaleString()}</td>
                  <td className="sr-td-amount">${pa.assistantCost.toLocaleString()}</td>
                  <td className={`sr-td-amount ${pa.netProfit < 0 ? 'sr-td--negative' : 'sr-td--positive'}`}>
                    ${pa.netProfit.toLocaleString()}
                  </td>
                  <td className={`sr-td-center ${pa.profitMargin < 20 ? 'sr-td--warning' : ''}`}>
                    {pa.profitMargin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td className="sr-td-amount"><strong>${totalRevenue.toLocaleString()}</strong></td>
                <td className="sr-td-center"><strong>{providerAnalysis.reduce((s, p) => s + p.totalVisits, 0)}</strong></td>
                <td className="sr-td-amount"><strong>${totalCommission.toLocaleString()}</strong></td>
                <td className="sr-td-amount"><strong>${providerAnalysis.reduce((s, p) => s + p.assistantCost, 0).toLocaleString()}</strong></td>
                <td className={`sr-td-amount ${totalNetProfit < 0 ? 'sr-td--negative' : 'sr-td--positive'}`}>
                  <strong>${totalNetProfit.toLocaleString()}</strong>
                </td>
                <td className="sr-td-center">
                  <strong>{totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : '0'}%</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Revenue Bar Visualization */}
      {providerAnalysis.length > 0 && (
        <div className="sr-bars-section">
          <h3 className="sr-bars-title">Revenue Distribution</h3>
          <div className="sr-bars">
            {providerAnalysis.map((pa) => {
              const pct = totalRevenue > 0 ? (pa.totalRevenue / totalRevenue) * 100 : 0;
              return (
                <div key={pa.sub.id} className="sr-bar-row">
                  <span className="sr-bar-label">{pa.sub.name}</span>
                  <div className="sr-bar-track">
                    <div className="sr-bar-fill" style={{ width: `${pct}%`, background: pa.sub.color }} />
                  </div>
                  <span className="sr-bar-value">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EMR Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title"><Upload size={18} /> Import EMR Sales Data</h2>
              <button className="btn btn--icon" onClick={() => setShowUploadModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleBulkUpload}>
              <div className="modal__body">
                <p className="form-hint" style={{ margin: '0 0 16px' }}>
                  Enter sales data from your EMR system. Provider names will be automatically matched to subcontractors. Unmatched entries will be skipped.
                </p>
                <div className="emr-upload-table">
                  <div className="emr-upload-header">
                    <span>Provider Name</span>
                    <span>Date</span>
                    <span>Revenue ($)</span>
                    <span>Visits</span>
                    <span>Description</span>
                    <span></span>
                  </div>
                  {emrEntries.map((entry, idx) => {
                    const matched = matchProvider(entry.providerName);
                    return (
                      <div key={idx} className="emr-upload-row">
                        <div className="emr-upload-cell">
                          <input className="form-input" value={entry.providerName} onChange={(e) => updateEmrRow(idx, 'providerName', e.target.value)} placeholder="e.g. Dr. Raj Patel" required />
                          {entry.providerName && (
                            <span className={`emr-match-badge ${matched ? 'emr-match-badge--ok' : 'emr-match-badge--no'}`}>
                              {matched ? `Matched: ${matched.name}` : 'No match'}
                            </span>
                          )}
                        </div>
                        <input type="date" className="form-input" value={entry.date} onChange={(e) => updateEmrRow(idx, 'date', e.target.value)} required />
                        <input type="number" className="form-input" value={entry.amount} onChange={(e) => updateEmrRow(idx, 'amount', e.target.value)} placeholder="$" required min="0" step="0.01" />
                        <input type="number" className="form-input" value={entry.visits} onChange={(e) => updateEmrRow(idx, 'visits', e.target.value)} placeholder="#" min="0" />
                        <input className="form-input" value={entry.description} onChange={(e) => updateEmrRow(idx, 'description', e.target.value)} placeholder="Optional" />
                        <button type="button" className="btn btn--icon btn--sm" onClick={() => removeEmrRow(idx)} disabled={emrEntries.length <= 1}>
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" className="btn btn--secondary btn--sm" onClick={addEmrRow} style={{ marginTop: 8 }}>
                  + Add Row
                </button>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">
                    <Upload size={14} /> Import Data
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
