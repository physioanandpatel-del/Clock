import { useState, useMemo } from 'react';
import { Search, Filter, Shield, UserCog, Calendar, Clock, FileText, DollarSign, MapPin, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getInitials } from '../utils/helpers';
import { format } from 'date-fns';
import './AuditLog.css';

const ACTION_CONFIG = {
  // Employee actions
  employee_add: { icon: Users, color: 'var(--success)', label: 'Employee Added' },
  employee_update: { icon: UserCog, color: 'var(--primary)', label: 'Employee Updated' },
  employee_delete: { icon: Users, color: 'var(--danger)', label: 'Employee Deleted' },
  // Shift actions
  shift_add: { icon: Calendar, color: 'var(--success)', label: 'Shift Created' },
  shift_update: { icon: Calendar, color: 'var(--primary)', label: 'Shift Updated' },
  shift_delete: { icon: Calendar, color: 'var(--danger)', label: 'Shift Deleted' },
  shift_publish: { icon: Calendar, color: 'var(--success)', label: 'Shifts Published' },
  // Time clock
  clock_in: { icon: Clock, color: 'var(--success)', label: 'Clock In' },
  clock_out: { icon: Clock, color: 'var(--text-secondary)', label: 'Clock Out' },
  // Absences
  absence_add: { icon: FileText, color: 'var(--warning)', label: 'Absence Requested' },
  absence_approve: { icon: FileText, color: 'var(--success)', label: 'Absence Approved' },
  absence_deny: { icon: FileText, color: 'var(--danger)', label: 'Absence Denied' },
  // Financial
  invoice_create: { icon: DollarSign, color: 'var(--success)', label: 'Invoice Created' },
  invoice_paid: { icon: DollarSign, color: 'var(--success)', label: 'Invoice Paid' },
  plan_change: { icon: DollarSign, color: 'var(--primary)', label: 'Plan Changed' },
  // Timesheet
  timesheet_submit: { icon: FileText, color: 'var(--warning)', label: 'Timesheet Submitted' },
  timesheet_approve: { icon: FileText, color: 'var(--success)', label: 'Timesheet Approved' },
  timesheet_reject: { icon: FileText, color: 'var(--danger)', label: 'Timesheet Rejected' },
  // Location
  location_add: { icon: MapPin, color: 'var(--success)', label: 'Location Added' },
  location_update: { icon: MapPin, color: 'var(--primary)', label: 'Location Updated' },
  // Settings
  settings_change: { icon: Shield, color: 'var(--warning)', label: 'Settings Changed' },
  data_reset: { icon: Shield, color: 'var(--danger)', label: 'Data Reset' },
  // Customer
  customer_add: { icon: Users, color: 'var(--success)', label: 'Customer Added' },
  customer_update: { icon: Users, color: 'var(--primary)', label: 'Customer Updated' },
  customer_delete: { icon: Users, color: 'var(--danger)', label: 'Customer Deleted' },
  // Default
  default: { icon: Shield, color: 'var(--text-light)', label: 'Action' },
};

export default function AuditLog() {
  const { state } = useApp();
  const auditLog = state.auditLog || [];
  const { employees } = state;
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const sortedLog = useMemo(() => {
    return [...auditLog]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .filter((entry) => {
        if (search) {
          const user = employees.find((e) => e.id === entry.userId);
          const searchLower = search.toLowerCase();
          const matchDetails = (entry.details || '').toLowerCase().includes(searchLower);
          const matchUser = (user?.name || '').toLowerCase().includes(searchLower);
          const matchAction = (entry.action || '').toLowerCase().includes(searchLower);
          if (!matchDetails && !matchUser && !matchAction) return false;
        }
        if (actionFilter !== 'all') {
          const category = entry.action.split('_')[0];
          if (category !== actionFilter) return false;
        }
        if (dateFilter) {
          const entryDate = format(new Date(entry.timestamp), 'yyyy-MM-dd');
          if (entryDate !== dateFilter) return false;
        }
        return true;
      });
  }, [auditLog, search, actionFilter, dateFilter, employees]);

  const categories = useMemo(() => {
    const cats = new Set();
    auditLog.forEach((e) => cats.add(e.action.split('_')[0]));
    return ['all', ...Array.from(cats)].sort();
  }, [auditLog]);

  const formatTimestamp = (ts) => {
    try { return format(new Date(ts), 'MMM d, yyyy h:mm:ss a'); } catch { return ts; }
  };

  return (
    <div className="audit-page">
      <div className="audit-toolbar">
        <div className="customers-search">
          <Search size={16} />
          <input type="text" placeholder="Search audit log..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="audit-filter-select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Actions' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <input type="date" className="audit-date-filter" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        {dateFilter && <button className="btn btn-secondary btn-sm" onClick={() => setDateFilter('')}>Clear Date</button>}
      </div>

      <div className="audit-summary">
        <span>{sortedLog.length} entries</span>
        {auditLog.length > 0 && <span className="text-secondary">Total: {auditLog.length} all time</span>}
      </div>

      {sortedLog.length === 0 ? (
        <div className="empty-state">
          <Shield size={48} />
          <p>No audit log entries {auditLog.length === 0 ? 'yet. Actions will be recorded as you use the app.' : 'matching your filters.'}</p>
        </div>
      ) : (
        <div className="audit-timeline">
          {sortedLog.map((entry) => {
            const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.default;
            const Icon = config.icon;
            const user = employees.find((e) => e.id === entry.userId);
            return (
              <div key={entry.id} className="audit-entry">
                <div className="audit-entry__icon" style={{ background: config.color + '15', color: config.color }}>
                  <Icon size={16} />
                </div>
                <div className="audit-entry__content">
                  <div className="audit-entry__header">
                    <span className="audit-entry__action" style={{ color: config.color }}>{config.label}</span>
                    <span className="audit-entry__time">{formatTimestamp(entry.timestamp)}</span>
                  </div>
                  <div className="audit-entry__details">{entry.details}</div>
                  {user && (
                    <div className="audit-entry__user">
                      <div className="audit-entry__avatar" style={{ background: user.color }}>{getInitials(user.name)}</div>
                      <span>{user.name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
