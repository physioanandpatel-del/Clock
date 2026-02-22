import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Filter, ChevronDown } from 'lucide-react';
import { useApp, hasAccess } from '../context/AppContext';
import { formatTime, formatDuration, getInitials } from '../utils/helpers';
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, parseISO } from 'date-fns';
import TimeframeSelector from '../components/TimeframeSelector';
import './Timesheets.css';

export default function Timesheets() {
  const { state, dispatch } = useApp();
  const { employees, timeEntries, currentUserId, currentLocationId, timesheets } = state;
  const allTimesheets = timesheets || [];
  const currentUser = employees.find((e) => e.id === currentUserId);
  const isManager = hasAccess(currentUser?.accessLevel || 'employee', 'manager');
  const [statusFilter, setStatusFilter] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0);

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
      };
    });
  }, [locationEmployees, weekEntries, allTimesheets, weekStart, isManager, currentUserId]);

  const filteredSheets = statusFilter === 'all' ? employeeTimesheets : employeeTimesheets.filter((ts) => ts.status === statusFilter);

  const submitTimesheet = (employeeId) => {
    dispatch({ type: 'SUBMIT_TIMESHEET', payload: { employeeId, weekStart: format(weekStart, 'yyyy-MM-dd'), weekEnd: format(weekEnd, 'yyyy-MM-dd') } });
  };

  const approveTimesheet = (timesheetId) => {
    dispatch({ type: 'APPROVE_TIMESHEET', payload: { id: timesheetId, approvedBy: currentUserId } });
  };

  const rejectTimesheet = (timesheetId, notes) => {
    dispatch({ type: 'REJECT_TIMESHEET', payload: { id: timesheetId, notes: notes || 'Please review and resubmit' } });
  };

  const statusConfig = {
    pending: { icon: Clock, color: 'var(--text-light)', label: 'Not Submitted' },
    submitted: { icon: AlertTriangle, color: 'var(--warning)', label: 'Submitted' },
    approved: { icon: CheckCircle, color: 'var(--success)', label: 'Approved' },
    rejected: { icon: XCircle, color: 'var(--danger)', label: 'Rejected' },
  };

  const counts = { pending: employeeTimesheets.filter((t) => t.status === 'pending').length, submitted: employeeTimesheets.filter((t) => t.status === 'submitted').length, approved: employeeTimesheets.filter((t) => t.status === 'approved').length, rejected: employeeTimesheets.filter((t) => t.status === 'rejected').length };

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

      <div className="timesheets-table-wrap">
        <table className="table timesheets-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Entries</th>
              <th>Total Hours</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSheets.map((ts) => {
              const cfg = statusConfig[ts.status];
              const StatusIcon = cfg.icon;
              return (
                <tr key={ts.employee.id}>
                  <td>
                    <div className="ts-employee">
                      <div className="ts-avatar" style={{ background: ts.employee.color }}>{getInitials(ts.employee.name)}</div>
                      <div>
                        <div className="ts-name">{ts.employee.name}</div>
                        <div className="ts-role">{ts.employee.roles?.join(', ')}</div>
                      </div>
                    </div>
                  </td>
                  <td>{ts.entries.length} clock-ins</td>
                  <td className="ts-hours">{ts.totalHours}h</td>
                  <td>
                    <span className="ts-status" style={{ color: cfg.color }}>
                      <StatusIcon size={14} /> {cfg.label}
                    </span>
                    {ts.notes && <div className="ts-note">{ts.notes}</div>}
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
                          <button className="btn btn-secondary btn-sm" onClick={() => rejectTimesheet(ts.timesheetId)}>
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}
                      {ts.status === 'pending' && isManager && ts.employee.id !== currentUserId && (
                        <span className="text-secondary text-sm">Awaiting submission</span>
                      )}
                      {ts.status === 'approved' && (
                        <span className="text-secondary text-sm">
                          Approved {ts.approvedDate ? formatTime(ts.approvedDate) : ''}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
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
    </div>
  );
}
