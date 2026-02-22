import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, MessageSquare, FileText, X } from 'lucide-react';
import { useApp, hasAccess } from '../context/AppContext';
import { formatTime, formatDuration, getInitials } from '../utils/helpers';
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, parseISO } from 'date-fns';
import './Timesheets.css';

export default function Timesheets() {
  const { state, dispatch } = useApp();
  const { employees, timeEntries, currentUserId, currentLocationId, timesheets } = state;
  const allTimesheets = timesheets || [];
  const currentUser = employees.find((e) => e.id === currentUserId);
  const isManager = hasAccess(currentUser?.accessLevel || 'employee', 'manager');
  const [statusFilter, setStatusFilter] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(null);
  const [managerNotes, setManagerNotes] = useState('');
  const [expandedTimesheet, setExpandedTimesheet] = useState(null);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  const locationEmployees = employees.filter((e) => e.locationIds?.includes(currentLocationId));

  const weekEntries = useMemo(() => {
    return timeEntries.filter((te) => {
      try {
        const clockIn = new Date(te.clockIn);
        return isWithinInterval(clockIn, { start: weekStart, end: weekEnd });
      } catch { return false; }
    });
  }, [timeEntries, weekStart, weekEnd]);

  const employeeTimesheets = useMemo(() => {
    const displayEmployees = isManager ? locationEmployees : employees.filter((e) => e.id === currentUserId);
    return displayEmployees.map((emp) => {
      const empEntries = weekEntries.filter((te) => te.employeeId === emp.id && te.status === 'completed');
      let totalMinutes = 0;
      empEntries.forEach((te) => {
        if (te.clockIn && te.clockOut) {
          totalMinutes += (new Date(te.clockOut) - new Date(te.clockIn)) / 60000;
        }
      });
      const existing = allTimesheets.find((ts) => ts.employeeId === emp.id && ts.weekStart === format(weekStart, 'yyyy-MM-dd'));
      return {
        employee: emp,
        entries: empEntries,
        totalHours: (totalMinutes / 60).toFixed(1),
        totalMinutes,
        status: existing?.status || 'pending',
        timesheetId: existing?.id || null,
        submittedDate: existing?.submittedDate || null,
        approvedBy: existing?.approvedBy || null,
        approvedDate: existing?.approvedDate || null,
        notes: existing?.notes || '',
        managerNotes: existing?.managerNotes || '',
      };
    });
  }, [locationEmployees, weekEntries, allTimesheets, weekStart, isManager, currentUserId]);

  const filteredSheets = statusFilter === 'all' ? employeeTimesheets : employeeTimesheets.filter((ts) => ts.status === statusFilter);

  const submitTimesheet = (employeeId) => {
    dispatch({ type: 'SUBMIT_TIMESHEET', payload: { employeeId, weekStart: format(weekStart, 'yyyy-MM-dd'), weekEnd: format(weekEnd, 'yyyy-MM-dd') } });
  };

  const approveTimesheet = (timesheetId) => {
    dispatch({ type: 'APPROVE_TIMESHEET', payload: { id: timesheetId, approvedBy: currentUserId } });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { action: 'timesheet_approve', entityType: 'timesheet', entityId: timesheetId, details: 'Timesheet approved', userId: currentUserId } });
  };

  const rejectTimesheet = (timesheetId, notes) => {
    dispatch({ type: 'REJECT_TIMESHEET', payload: { id: timesheetId, notes: notes || 'Please review and resubmit' } });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { action: 'timesheet_reject', entityType: 'timesheet', entityId: timesheetId, details: `Timesheet rejected: ${notes}`, userId: currentUserId } });
    setShowRejectModal(null);
    setRejectNotes('');
  };

  const saveManagerNotes = (timesheetId) => {
    dispatch({ type: 'UPDATE_TIMESHEET_NOTES', payload: { id: timesheetId, managerNotes } });
    setShowNotesModal(null);
    setManagerNotes('');
  };

  const statusConfig = {
    pending: { icon: Clock, color: 'var(--text-light)', label: 'Not Submitted' },
    submitted: { icon: AlertTriangle, color: 'var(--warning)', label: 'Submitted' },
    approved: { icon: CheckCircle, color: 'var(--success)', label: 'Approved' },
    rejected: { icon: XCircle, color: 'var(--danger)', label: 'Rejected' },
  };

  const counts = { pending: employeeTimesheets.filter((t) => t.status === 'pending').length, submitted: employeeTimesheets.filter((t) => t.status === 'submitted').length, approved: employeeTimesheets.filter((t) => t.status === 'approved').length, rejected: employeeTimesheets.filter((t) => t.status === 'rejected').length };

  const approverName = (approverId) => {
    const emp = employees.find((e) => e.id === approverId);
    return emp?.preferredName || emp?.name || 'Manager';
  };

  return (
    <div className="timesheets-page">
      <div className="timesheets-header">
        <div className="timesheets-week-nav">
          <button className="btn btn-secondary" onClick={() => setWeekOffset(weekOffset - 1)}>&larr;</button>
          <span className="timesheets-week-label">{weekLabel}</span>
          <button className="btn btn-secondary" onClick={() => setWeekOffset(weekOffset + 1)}>&rarr;</button>
          {weekOffset !== 0 && <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(0)}>This Week</button>}
        </div>
      </div>

      <div className="timesheets-stats">
        {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className={`ts-stat ${statusFilter === key ? 'ts-stat--active' : ''}`} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)} style={{ cursor: 'pointer' }}>
              <Icon size={18} style={{ color: config.color }} />
              <div>
                <div className="ts-stat__value">{counts[key]}</div>
                <div className="ts-stat__label">{config.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Approval workflow banner for managers */}
      {isManager && counts.submitted > 0 && (
        <div className="ts-approval-banner">
          <AlertTriangle size={16} />
          <span><strong>{counts.submitted}</strong> timesheet{counts.submitted !== 1 ? 's' : ''} awaiting your approval. Review and approve before payroll export.</span>
        </div>
      )}

      <div className="timesheets-table-wrap">
        <table className="table timesheets-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Entries</th>
              <th>Total Hours</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSheets.map((ts) => {
              const cfg = statusConfig[ts.status];
              const StatusIcon = cfg.icon;
              const isExpanded = expandedTimesheet === ts.employee.id;
              return (
                <>
                  <tr key={ts.employee.id} className={isExpanded ? 'ts-row--expanded' : ''}>
                    <td>
                      <div className="ts-employee">
                        <div className="ts-avatar" style={{ background: ts.employee.color }}>{getInitials(ts.employee.name)}</div>
                        <div>
                          <div className="ts-name">{ts.employee.name}</div>
                          <div className="ts-role">{ts.employee.roles?.join(', ')}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <button className="ts-entries-btn" onClick={() => setExpandedTimesheet(isExpanded ? null : ts.employee.id)}>
                        {ts.entries.length} clock-ins {isExpanded ? '▴' : '▾'}
                      </button>
                    </td>
                    <td className="ts-hours">{ts.totalHours}h</td>
                    <td>
                      <span className="ts-status" style={{ color: cfg.color }}>
                        <StatusIcon size={14} /> {cfg.label}
                      </span>
                      {ts.notes && <div className="ts-note">{ts.notes}</div>}
                      {ts.approvedBy && ts.status === 'approved' && (
                        <div className="ts-approved-info">by {approverName(ts.approvedBy)} {ts.approvedDate ? format(parseISO(ts.approvedDate), 'MMM d, h:mm a') : ''}</div>
                      )}
                    </td>
                    <td>
                      {ts.managerNotes ? (
                        <div className="ts-manager-note" title={ts.managerNotes}>
                          <MessageSquare size={12} /> {ts.managerNotes.length > 30 ? ts.managerNotes.slice(0, 30) + '...' : ts.managerNotes}
                        </div>
                      ) : (
                        isManager && ts.timesheetId && (
                          <button className="ts-add-note-btn" onClick={() => { setShowNotesModal(ts.timesheetId); setManagerNotes(ts.managerNotes); }}>
                            <MessageSquare size={12} /> Add note
                          </button>
                        )
                      )}
                      {ts.managerNotes && isManager && (
                        <button className="ts-add-note-btn" onClick={() => { setShowNotesModal(ts.timesheetId); setManagerNotes(ts.managerNotes); }} style={{ marginLeft: 4 }}>
                          Edit
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="ts-actions">
                        {ts.status === 'pending' && ts.employee.id === currentUserId && (
                          <button className="btn btn-primary btn-sm" onClick={() => submitTimesheet(ts.employee.id)}>Submit</button>
                        )}
                        {ts.status === 'rejected' && ts.employee.id === currentUserId && (
                          <button className="btn btn-primary btn-sm" onClick={() => submitTimesheet(ts.employee.id)}>Resubmit</button>
                        )}
                        {ts.status === 'submitted' && isManager && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => approveTimesheet(ts.timesheetId)}>
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setShowRejectModal(ts.timesheetId); setRejectNotes(''); }}>
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}
                        {ts.status === 'pending' && isManager && ts.employee.id !== currentUserId && (
                          <span className="text-secondary text-sm">Awaiting submission</span>
                        )}
                        {ts.status === 'approved' && (
                          <span className="text-secondary text-sm">
                            Approved
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Expanded entries detail */}
                  {isExpanded && (
                    <tr key={`${ts.employee.id}-detail`} className="ts-detail-row">
                      <td colSpan={6}>
                        <div className="ts-detail">
                          <div className="ts-detail__title"><FileText size={14} /> Time Entries for {ts.employee.name}</div>
                          {ts.entries.length === 0 ? (
                            <p className="text-secondary text-sm">No completed clock-ins this week.</p>
                          ) : (
                            <table className="ts-detail-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Clock In</th>
                                  <th>Clock Out</th>
                                  <th>Duration</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ts.entries.sort((a, b) => new Date(a.clockIn) - new Date(b.clockIn)).map((entry) => (
                                  <tr key={entry.id}>
                                    <td>{format(new Date(entry.clockIn), 'EEE, MMM d')}</td>
                                    <td>{formatTime(entry.clockIn)}</td>
                                    <td>{formatTime(entry.clockOut)}</td>
                                    <td>{formatDuration(entry.clockIn, entry.clockOut)}</td>
                                    <td>
                                      {entry.geofenceStatus === 'outside' && <span className="ts-flag ts-flag--geo">Outside geofence</span>}
                                      {entry.geofenceStatus === 'inside' && <span className="ts-flag ts-flag--ok">Verified</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {isManager && employeeTimesheets.filter((t) => t.status === 'submitted').length > 0 && (
        <div className="ts-bulk-actions">
          <button className="btn btn-primary" onClick={() => {
            employeeTimesheets.filter((t) => t.status === 'submitted' && t.timesheetId).forEach((t) => approveTimesheet(t.timesheetId));
          }}>
            <CheckCircle size={16} /> Approve All Submitted ({employeeTimesheets.filter((t) => t.status === 'submitted').length})
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Reject Timesheet</h2>
              <button className="btn btn--icon" onClick={() => setShowRejectModal(null)}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <p className="form-hint" style={{ margin: 0 }}>Provide a reason for rejecting this timesheet. The employee will see this message.</p>
              <div className="form-group">
                <label className="form-label">Rejection Reason</label>
                <textarea className="form-input form-textarea" value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="e.g., Missing clock-out on Wednesday, overtime not pre-approved..." rows={3} />
              </div>
            </div>
            <div className="modal__footer">
              <div className="modal__footer-right">
                <button className="btn btn--secondary" onClick={() => setShowRejectModal(null)}>Cancel</button>
                <button className="btn btn--danger" onClick={() => rejectTimesheet(showRejectModal, rejectNotes)}>
                  <XCircle size={14} /> Reject Timesheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Notes Modal */}
      {showNotesModal && (
        <div className="modal-overlay" onClick={() => setShowNotesModal(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title"><MessageSquare size={18} /> Internal Notes</h2>
              <button className="btn btn--icon" onClick={() => setShowNotesModal(null)}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <p className="form-hint" style={{ margin: 0 }}>Add internal notes to this timesheet. These are only visible to managers.</p>
              <div className="form-group">
                <label className="form-label">Manager Notes</label>
                <textarea className="form-input form-textarea" value={managerNotes} onChange={(e) => setManagerNotes(e.target.value)} placeholder="Internal notes about this timesheet..." rows={4} />
              </div>
            </div>
            <div className="modal__footer">
              <div className="modal__footer-right">
                <button className="btn btn--secondary" onClick={() => setShowNotesModal(null)}>Cancel</button>
                <button className="btn btn--primary" onClick={() => saveManagerNotes(showNotesModal)}>
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
