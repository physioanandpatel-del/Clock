import { useState, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
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
                {empShifts.map((dayShifts, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`schedule-grid__cell ${isSameDay(weekDays[dayIdx], new Date()) ? 'schedule-grid__cell--today' : ''}`}
                    onClick={() => {
                      if (dayShifts.length === 0) openNewShift(employee.id, dayIdx);
                    }}
                  >
                    {dayShifts.map((s) => (
                      <div
                        key={s.id}
                        className="schedule-shift"
                        style={{ borderLeftColor: employee.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditShift(s);
                        }}
                      >
                        <span className="schedule-shift__time">
                          {formatTime(s.start)} - {formatTime(s.end)}
                        </span>
                        <span className="schedule-shift__pos">{s.position}</span>
                      </div>
                    ))}
                    {dayShifts.length === 0 && (
                      <div className="schedule-grid__empty">
                        <Plus size={14} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

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
