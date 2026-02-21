import { useState, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  parseISO,
  isSameDay,
  setHours,
  setMinutes,
  addWeeks,
  subWeeks,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Copy,
  Clipboard,
  Send,
  GripVertical,
  Check,
} from 'lucide-react';
import { formatTime, getInitials } from '../utils/helpers';
import './Schedule.css';

export default function Schedule() {
  const { state, dispatch } = useApp();
  const { employees, shifts, positions, currentLocationId } = state;
  const locationEmployees = employees.filter((e) => e.locationId === currentLocationId);

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    position: '',
    notes: '',
  });

  // Drag and drop state
  const [draggedShift, setDraggedShift] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Copy/paste state
  const [copiedShift, setCopiedShift] = useState(null);
  const [showCopyToast, setShowCopyToast] = useState(false);

  // Publish state
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const scheduleData = useMemo(() => {
    return locationEmployees.map((emp) => ({
      employee: emp,
      shifts: weekDays.map((day) =>
        shifts.filter(
          (s) => s.employeeId === emp.id && isSameDay(parseISO(s.start), day)
        )
      ),
    }));
  }, [locationEmployees, shifts, weekDays]);

  // Get all shifts for the current week
  const weekShifts = useMemo(() => {
    const empIds = locationEmployees.map((e) => e.id);
    return shifts.filter((s) => {
      if (!empIds.includes(s.employeeId)) return false;
      const shiftDate = parseISO(s.start);
      return weekDays.some((d) => isSameDay(shiftDate, d));
    });
  }, [shifts, locationEmployees, weekDays]);

  const draftCount = weekShifts.filter((s) => s.status !== 'published').length;
  const publishedCount = weekShifts.filter((s) => s.status === 'published').length;

  // --- Shift CRUD ---

  function openNewShift(employeeId, dayIndex) {
    const day = weekDays[dayIndex];
    setEditingShift(null);
    setFormData({
      employeeId: employeeId || locationEmployees[0]?.id || '',
      date: format(day, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      position: locationEmployees.find((e) => e.id === employeeId)?.role || positions[0] || '',
      notes: '',
    });
    setShowModal(true);
  }

  function openEditShift(shift) {
    const start = parseISO(shift.start);
    const end = parseISO(shift.end);
    setEditingShift(shift);
    setFormData({
      employeeId: shift.employeeId,
      date: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      position: shift.position,
      notes: shift.notes || '',
    });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const [startH, startM] = formData.startTime.split(':').map(Number);
    const [endH, endM] = formData.endTime.split(':').map(Number);
    const date = parseISO(formData.date);
    const start = setMinutes(setHours(date, startH), startM);
    const end = setMinutes(setHours(date, endH), endM);

    const payload = {
      employeeId: formData.employeeId,
      start: start.toISOString(),
      end: end.toISOString(),
      position: formData.position,
      notes: formData.notes,
    };

    if (editingShift) {
      dispatch({ type: 'UPDATE_SHIFT', payload: { ...payload, id: editingShift.id } });
    } else {
      dispatch({ type: 'ADD_SHIFT', payload });
    }
    setShowModal(false);
  }

  function handleDelete() {
    if (editingShift) {
      dispatch({ type: 'DELETE_SHIFT', payload: editingShift.id });
      setShowModal(false);
    }
  }

  // --- Drag and Drop ---

  function handleDragStart(e, shift) {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', shift.id);
    // Make the drag image slightly transparent
    if (e.target) {
      e.target.style.opacity = '0.5';
    }
  }

  function handleDragEnd(e) {
    if (e.target) {
      e.target.style.opacity = '1';
    }
    setDraggedShift(null);
    setDragOverCell(null);
  }

  function handleDragOver(e, employeeId, dayIdx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cellKey = `${employeeId}-${dayIdx}`;
    if (dragOverCell !== cellKey) {
      setDragOverCell(cellKey);
    }
  }

  function handleDragLeave(e) {
    // Only clear if leaving the cell entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverCell(null);
    }
  }

  function handleDrop(e, targetEmployeeId, targetDayIdx) {
    e.preventDefault();
    setDragOverCell(null);

    if (!draggedShift) return;

    const targetDay = weekDays[targetDayIdx];
    const origStart = parseISO(draggedShift.start);
    const origEnd = parseISO(draggedShift.end);

    // Reconstruct times on the new date
    const newStart = setMinutes(setHours(targetDay, origStart.getHours()), origStart.getMinutes());
    const newEnd = setMinutes(setHours(targetDay, origEnd.getHours()), origEnd.getMinutes());

    dispatch({
      type: 'UPDATE_SHIFT',
      payload: {
        id: draggedShift.id,
        employeeId: targetEmployeeId,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      },
    });

    setDraggedShift(null);
  }

  // --- Copy / Paste ---

  function handleCopyShift(e, shift) {
    e.stopPropagation();
    setCopiedShift(shift);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  }

  function handlePasteShift(employeeId, dayIdx) {
    if (!copiedShift) return;

    const targetDay = weekDays[dayIdx];
    const origStart = parseISO(copiedShift.start);
    const origEnd = parseISO(copiedShift.end);

    const newStart = setMinutes(setHours(targetDay, origStart.getHours()), origStart.getMinutes());
    const newEnd = setMinutes(setHours(targetDay, origEnd.getHours()), origEnd.getMinutes());

    dispatch({
      type: 'ADD_SHIFT',
      payload: {
        employeeId,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
        position: copiedShift.position,
        notes: copiedShift.notes || '',
      },
    });
  }

  // --- Publish ---

  function handlePublishWeek() {
    const draftIds = weekShifts
      .filter((s) => s.status !== 'published')
      .map((s) => s.id);
    if (draftIds.length > 0) {
      dispatch({ type: 'PUBLISH_SHIFTS', payload: draftIds });
    }
    setShowPublishConfirm(false);
  }

  function handleUnpublishWeek() {
    const publishedIds = weekShifts
      .filter((s) => s.status === 'published')
      .map((s) => s.id);
    if (publishedIds.length > 0) {
      dispatch({ type: 'UNPUBLISH_SHIFTS', payload: publishedIds });
    }
  }

  return (
    <div className="schedule-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="page-subtitle">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="schedule-controls">
          <div className="week-nav">
            <button className="btn btn--icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
              <ChevronLeft size={18} />
            </button>
            <button className="btn btn--secondary" onClick={() => setCurrentWeek(new Date())}>
              Today
            </button>
            <button className="btn btn--icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            className="btn btn--primary"
            onClick={() => {
              setEditingShift(null);
              setFormData({
                employeeId: locationEmployees[0]?.id || '',
                date: format(new Date(), 'yyyy-MM-dd'),
                startTime: '09:00',
                endTime: '17:00',
                position: positions[0] || '',
                notes: '',
              });
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Add Shift
          </button>
        </div>
      </div>

      {/* Publish Bar */}
      <div className="publish-bar">
        <div className="publish-bar__info">
          <div className="publish-bar__stats">
            {draftCount > 0 && (
              <span className="publish-bar__badge publish-bar__badge--draft">
                {draftCount} draft{draftCount !== 1 ? 's' : ''}
              </span>
            )}
            {publishedCount > 0 && (
              <span className="publish-bar__badge publish-bar__badge--published">
                <Check size={12} /> {publishedCount} published
              </span>
            )}
          </div>
          {copiedShift && (
            <span className="publish-bar__copied">
              <Clipboard size={12} /> Shift copied — click empty cell to paste
            </span>
          )}
        </div>
        <div className="publish-bar__actions">
          {publishedCount > 0 && (
            <button className="btn btn--secondary btn--sm" onClick={handleUnpublishWeek}>
              Unpublish
            </button>
          )}
          {draftCount > 0 && (
            <button
              className="btn btn--publish btn--sm"
              onClick={() => setShowPublishConfirm(true)}
            >
              <Send size={14} /> Publish {draftCount} Shift{draftCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      <div className="schedule-grid-wrapper">
        <div className="schedule-grid">
          <div className="schedule-grid__header">
            <div className="schedule-grid__employee-col">Employee</div>
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={`schedule-grid__day-header ${isSameDay(day, new Date()) ? 'schedule-grid__day-header--today' : ''}`}
              >
                <span className="schedule-grid__day-name">{format(day, 'EEE')}</span>
                <span className="schedule-grid__day-num">{format(day, 'd')}</span>
              </div>
            ))}
          </div>

          <div className="schedule-grid__body">
            {scheduleData.map(({ employee, shifts: empShifts }) => (
              <div key={employee.id} className="schedule-grid__row">
                <div className="schedule-grid__employee">
                  <div className="schedule-grid__avatar" style={{ background: employee.color }}>
                    {getInitials(employee.name)}
                  </div>
                  <div>
                    <div className="schedule-grid__emp-name">{employee.name}</div>
                    <div className="schedule-grid__emp-role">{employee.role}</div>
                  </div>
                </div>
                {empShifts.map((dayShifts, dayIdx) => {
                  const cellKey = `${employee.id}-${dayIdx}`;
                  const isDragOver = dragOverCell === cellKey;
                  return (
                    <div
                      key={dayIdx}
                      className={`schedule-grid__cell ${isSameDay(weekDays[dayIdx], new Date()) ? 'schedule-grid__cell--today' : ''} ${isDragOver ? 'schedule-grid__cell--drag-over' : ''}`}
                      onClick={() => {
                        if (copiedShift && dayShifts.length === 0) {
                          handlePasteShift(employee.id, dayIdx);
                        } else if (dayShifts.length === 0) {
                          openNewShift(employee.id, dayIdx);
                        }
                      }}
                      onDragOver={(e) => handleDragOver(e, employee.id, dayIdx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, employee.id, dayIdx)}
                    >
                      {dayShifts.map((s) => (
                        <div
                          key={s.id}
                          className={`schedule-shift ${s.status === 'published' ? 'schedule-shift--published' : 'schedule-shift--draft'} ${draggedShift?.id === s.id ? 'schedule-shift--dragging' : ''}`}
                          style={{ borderLeftColor: employee.color }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, s)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditShift(s);
                          }}
                        >
                          <div className="schedule-shift__header">
                            <GripVertical size={12} className="schedule-shift__grip" />
                            <button
                              className="schedule-shift__copy-btn"
                              title="Copy shift"
                              onClick={(e) => handleCopyShift(e, s)}
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                          <span className="schedule-shift__time">
                            {formatTime(s.start)} - {formatTime(s.end)}
                          </span>
                          <span className="schedule-shift__pos">{s.position}</span>
                          {s.status === 'published' && (
                            <span className="schedule-shift__status">
                              <Check size={10} /> Published
                            </span>
                          )}
                        </div>
                      ))}
                      {dayShifts.length === 0 && (
                        <div className="schedule-grid__empty">
                          {copiedShift ? (
                            <Clipboard size={14} />
                          ) : (
                            <Plus size={14} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copy Toast */}
      {showCopyToast && (
        <div className="copy-toast">
          <Check size={14} /> Shift copied! Click an empty cell to paste.
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishConfirm && (
        <div className="modal-overlay" onClick={() => setShowPublishConfirm(false)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Publish Shifts</h2>
              <button className="btn btn--icon" onClick={() => setShowPublishConfirm(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal__body">
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                You are about to publish <strong>{draftCount}</strong> draft shift{draftCount !== 1 ? 's' : ''} for the week of{' '}
                <strong>{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</strong>.
                Published shifts will be visible to all employees.
              </p>
            </div>
            <div className="modal__footer">
              <div className="modal__footer-right">
                <button className="btn btn--secondary" onClick={() => setShowPublishConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn--publish" onClick={handlePublishWeek}>
                  <Send size={14} /> Publish All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {editingShift ? 'Edit Shift' : 'New Shift'}
              </h2>
              <button className="btn btn--icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Employee</label>
                  <select
                    className="form-input"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    required
                  >
                    <option value="">Select employee</option>
                    {locationEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Position</label>
                  <select
                    className="form-input"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  >
                    <option value="">Select position</option>
                    {positions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input form-textarea"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal__footer">
                {editingShift && (
                  <button type="button" className="btn btn--danger" onClick={handleDelete}>
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--primary">
                    {editingShift ? 'Save Changes' : 'Create Shift'}
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
