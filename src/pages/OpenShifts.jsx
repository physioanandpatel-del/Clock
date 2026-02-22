import { useState, useMemo } from 'react';
import { HandMetal, Calendar, Clock, MapPin, Check, X, AlertCircle } from 'lucide-react';
import { useApp, hasAccess } from '../context/AppContext';
import { getInitials, formatTime } from '../utils/helpers';
import { format, isAfter, parseISO } from 'date-fns';
import './OpenShifts.css';

export default function OpenShifts() {
  const { state, dispatch } = useApp();
  const { employees, shifts, currentUserId, currentLocationId, openShiftBids } = state;
  const allBids = openShiftBids || [];
  const currentUser = employees.find((e) => e.id === currentUserId);
  const isManager = hasAccess(currentUser?.accessLevel || 'employee', 'manager');
  const [tab, setTab] = useState('available');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newShift, setNewShift] = useState({ date: '', startTime: '09:00', endTime: '17:00', position: '', notes: '' });

  const locationEmployees = employees.filter((e) => e.locationIds?.includes(currentLocationId));
  const positions = state.positions || [];

  // Open shifts are unassigned shifts (employeeId is null or 'open')
  const openShifts = useMemo(() => {
    return shifts.filter((s) => {
      const isOpen = !s.employeeId || s.employeeId === 'open';
      const isFuture = isAfter(new Date(s.start), new Date());
      return isOpen && isFuture;
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [shifts]);

  const myBids = allBids.filter((b) => b.employeeId === currentUserId);
  const pendingBids = allBids.filter((b) => b.status === 'pending');

  const getBidsForShift = (shiftId) => allBids.filter((b) => b.shiftId === shiftId);
  const hasUserBid = (shiftId) => myBids.some((b) => b.shiftId === shiftId);

  const bidOnShift = (shiftId) => {
    if (hasUserBid(shiftId)) return;
    dispatch({ type: 'ADD_OPEN_SHIFT_BID', payload: { shiftId, employeeId: currentUserId, notes: '' } });
  };

  const approveBid = (bidId, shiftId, employeeId) => {
    dispatch({ type: 'APPROVE_OPEN_SHIFT_BID', payload: { bidId, shiftId, employeeId } });
  };

  const denyBid = (bidId) => {
    dispatch({ type: 'DENY_OPEN_SHIFT_BID', payload: bidId });
  };

  const createOpenShift = () => {
    if (!newShift.date || !newShift.position) return;
    const start = new Date(`${newShift.date}T${newShift.startTime}`);
    const end = new Date(`${newShift.date}T${newShift.endTime}`);
    dispatch({ type: 'ADD_SHIFT', payload: { employeeId: 'open', start: start.toISOString(), end: end.toISOString(), position: newShift.position, notes: newShift.notes || 'Open shift', status: 'published', locationId: currentLocationId } });
    setShowCreateModal(false);
    setNewShift({ date: '', startTime: '09:00', endTime: '17:00', position: '', notes: '' });
  };

  return (
    <div className="open-shifts-page">
      <div className="page-header">
        {isManager && <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Post Open Shift</button>}
      </div>

      <div className="os-tabs">
        <button className={`os-tab ${tab === 'available' ? 'os-tab--active' : ''}`} onClick={() => setTab('available')}>
          Available Shifts ({openShifts.length})
        </button>
        {!isManager && (
          <button className={`os-tab ${tab === 'my-bids' ? 'os-tab--active' : ''}`} onClick={() => setTab('my-bids')}>
            My Bids ({myBids.length})
          </button>
        )}
        {isManager && (
          <button className={`os-tab ${tab === 'bids' ? 'os-tab--active' : ''}`} onClick={() => setTab('bids')}>
            Pending Bids ({pendingBids.length})
          </button>
        )}
      </div>

      {tab === 'available' && (
        <div className="os-list">
          {openShifts.length === 0 ? (
            <div className="empty-state"><HandMetal size={48} /><p>No open shifts available</p></div>
          ) : (
            openShifts.map((shift) => {
              const bids = getBidsForShift(shift.id);
              const userBid = hasUserBid(shift.id);
              return (
                <div key={shift.id} className="os-card">
                  <div className="os-card__main">
                    <div className="os-card__date">
                      <Calendar size={16} />
                      <span>{format(new Date(shift.start), 'EEE, MMM d')}</span>
                    </div>
                    <div className="os-card__time">
                      <Clock size={16} />
                      <span>{formatTime(shift.start)} - {formatTime(shift.end)}</span>
                    </div>
                    <div className="os-card__position">
                      <span className="os-position-badge">{shift.position}</span>
                    </div>
                    {shift.notes && shift.notes !== 'Open shift' && (
                      <div className="os-card__notes">{shift.notes}</div>
                    )}
                  </div>
                  <div className="os-card__footer">
                    <span className="os-bid-count">{bids.length} bid{bids.length !== 1 ? 's' : ''}</span>
                    {!isManager && (
                      userBid ? (
                        <span className="os-bid-status os-bid-status--submitted"><Check size={14} /> Bid Submitted</span>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => bidOnShift(shift.id)}>
                          <HandMetal size={14} /> Bid for Shift
                        </button>
                      )
                    )}
                    {isManager && bids.length > 0 && (
                      <div className="os-bid-avatars">
                        {bids.slice(0, 5).map((b) => {
                          const emp = employees.find((e) => e.id === b.employeeId);
                          return (
                            <div key={b.id} className="os-bid-avatar" style={{ background: emp?.color || '#ccc' }} title={emp?.name}>
                              {emp ? getInitials(emp.name) : '?'}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'my-bids' && (
        <div className="os-list">
          {myBids.length === 0 ? (
            <div className="empty-state"><HandMetal size={48} /><p>You haven't bid on any shifts</p></div>
          ) : (
            myBids.map((bid) => {
              const shift = shifts.find((s) => s.id === bid.shiftId);
              if (!shift) return null;
              return (
                <div key={bid.id} className="os-card">
                  <div className="os-card__main">
                    <div className="os-card__date"><Calendar size={16} /><span>{format(new Date(shift.start), 'EEE, MMM d')}</span></div>
                    <div className="os-card__time"><Clock size={16} /><span>{formatTime(shift.start)} - {formatTime(shift.end)}</span></div>
                    <span className="os-position-badge">{shift.position}</span>
                  </div>
                  <div className="os-card__footer">
                    <span className={`os-bid-status os-bid-status--${bid.status}`}>
                      {bid.status === 'pending' && <><AlertCircle size={14} /> Pending</>}
                      {bid.status === 'approved' && <><Check size={14} /> Approved</>}
                      {bid.status === 'denied' && <><X size={14} /> Denied</>}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'bids' && isManager && (
        <div className="os-list">
          {pendingBids.length === 0 ? (
            <div className="empty-state"><Check size={48} /><p>No pending bids to review</p></div>
          ) : (
            pendingBids.map((bid) => {
              const shift = shifts.find((s) => s.id === bid.shiftId);
              const emp = employees.find((e) => e.id === bid.employeeId);
              if (!shift || !emp) return null;
              return (
                <div key={bid.id} className="os-card os-card--bid">
                  <div className="os-card__bid-header">
                    <div className="os-bid-employee">
                      <div className="os-bid-avatar-lg" style={{ background: emp.color }}>{getInitials(emp.name)}</div>
                      <div>
                        <div className="os-bid-emp-name">{emp.name}</div>
                        <div className="os-bid-emp-role">{emp.roles?.join(', ')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="os-card__main">
                    <div className="os-card__date"><Calendar size={16} /><span>{format(new Date(shift.start), 'EEE, MMM d')}</span></div>
                    <div className="os-card__time"><Clock size={16} /><span>{formatTime(shift.start)} - {formatTime(shift.end)}</span></div>
                    <span className="os-position-badge">{shift.position}</span>
                  </div>
                  <div className="os-card__footer">
                    <button className="btn btn-primary btn-sm" onClick={() => approveBid(bid.id, bid.shiftId, bid.employeeId)}>
                      <Check size={14} /> Approve
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => denyBid(bid.id)}>
                      <X size={14} /> Deny
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Open Shift Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Post Open Shift</h2>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={newShift.date} onChange={(e) => setNewShift({ ...newShift, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Position *</label>
                  <select value={newShift.position} onChange={(e) => setNewShift({ ...newShift, position: e.target.value })}>
                    <option value="">Select position</option>
                    {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input type="time" value={newShift.startTime} onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input type="time" value={newShift.endTime} onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })} />
                </div>
                <div className="form-group form-group--full">
                  <label>Notes</label>
                  <textarea value={newShift.notes} onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })} rows={2} placeholder="Any additional details..." />
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createOpenShift}>Post Shift</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
