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
  isWithinInterval,
  differenceInHours,
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
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { formatTime, getInitials } from '../utils/helpers';
import './Schedule.css';

export default function Schedule() {
  const { state, dispatch } = useApp();
  const { employees, shifts, positions, currentLocationId, locations, salesEntries, taskTemplates = [] } = state;
  const locationEmployees = employees.filter((e) => (e.locationIds || [e.locationId]).includes(currentLocationId));
  const currentLocation = locations.find((l) => l.id === currentLocationId);

  // Location labor budget settings
  const targetPercent = currentLocation?.targetLaborPercent || 30;
  const budgetWarning = currentLocation?.laborBudgetWarning ?? targetPercent;
  const budgetMax = currentLocation?.laborBudgetMax ?? targetPercent + 5;

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
    taskTemplateIds: [],
  });

  const locationTemplates = useMemo(() => (taskTemplates || []).filter((t) => t.locationId === currentLocationId), [taskTemplates, currentLocationId]);

  // Drag and drop state
  const [draggedShift, setDraggedShift] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Copy/paste state
  const [copiedShift, setCopiedShift] = useState(null);
  const [showCopyToast, setShowCopyToast] = useState(false);

  // Publish state
  const [selectedShifts, setSelectedShifts] = useState(new Set());
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  // Labor warning state
  const [laborWarning, setLaborWarning] = useState(null);

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

  // Get all shifts for the current week at this location
  const weekShifts = useMemo(() => {
    const empIds = locationEmployees.map((e) => e.id);
    return shifts.filter((s) => {
      if (!empIds.includes(s.employeeId)) return false;
      const shiftDate = parseISO(s.start);
      return weekDays.some((d) => isSameDay(shiftDate, d));
    });
  }, [shifts, locationEmployees, weekDays]);

  const draftShifts = weekShifts.filter((s) => s.status !== 'published');
  const draftCount = draftShifts.length;
  const publishedCount = weekShifts.filter((s) => s.status === 'published').length;

  // Weekly labor calculation
  const weeklyLaborData = useMemo(() => {
    let totalCost = 0;
    let totalHours = 0;
    weekShifts.forEach((s) => {
      const emp = locationEmployees.find((e) => e.id === s.employeeId);
      if (emp) {
        const hrs = differenceInHours(parseISO(s.end), parseISO(s.start));
        totalHours += hrs;
        totalCost += hrs * emp.hourlyRate;
      }
    });
    return { totalCost, totalHours };
  }, [weekShifts, locationEmployees]);

  // Weekly sales for labor % calculation — actual and projected
  const weeklySalesActual = useMemo(() => {
    return (salesEntries || [])
      .filter((s) => s.locationId === currentLocationId && (s.type || 'actual') === 'actual')
      .filter((s) => {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      })
      .reduce((sum, s) => sum + s.amount, 0);
  }, [salesEntries, currentLocationId, weekStart, weekEnd]);

  const weeklySalesProjected = useMemo(() => {
    return (salesEntries || [])
      .filter((s) => s.locationId === currentLocationId && s.type === 'projected')
      .filter((s) => {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      })
      .reduce((sum, s) => sum + s.amount, 0);
  }, [salesEntries, currentLocationId, weekStart, weekEnd]);

  // Use actual if available, fallback to projected
  const weeklySales = weeklySalesActual || weeklySalesProjected;
  const isUsingProjected = weeklySalesActual === 0 && weeklySalesProjected > 0;

  const currentLaborPercent = weeklySales > 0
    ? (weeklyLaborData.totalCost / weeklySales) * 100
    : 0;
  const laborPercentVsProjected = weeklySalesProjected > 0
    ? (weeklyLaborData.totalCost / weeklySalesProjected) * 100
    : 0;
  const isOverBudgetMax = weeklySales > 0 && currentLaborPercent >= budgetMax;
  const isOverBudgetWarning = weeklySales > 0 && currentLaborPercent >= budgetWarning && currentLaborPercent < budgetMax;

  // Check if adding a shift would exceed the budget
  function checkLaborBudget(empId, startTime, endTime) {
    if (weeklySales <= 0) return { allowed: true };
    const emp = locationEmployees.find((e) => e.id === empId);
    if (!emp) return { allowed: true };
    const newHours = differenceInHours(new Date(endTime), new Date(startTime));
    const newCost = newHours * emp.hourlyRate;
    const projectedCost = weeklyLaborData.totalCost + newCost;
    const projectedPercent = (projectedCost / weeklySales) * 100;
    const projectedPctVsProjectedSales = weeklySalesProjected > 0 ? (projectedCost / weeklySalesProjected) * 100 : null;

    if (projectedPercent >= budgetMax) {
      return {
        allowed: false,
        projectedPercent,
        message: `Adding this shift would push labor to ${projectedPercent.toFixed(1)}%, exceeding the ${budgetMax}% max budget.${projectedPctVsProjectedSales ? ` (${projectedPctVsProjectedSales.toFixed(1)}% vs projected sales)` : ''}`,
      };
    }
    if (projectedPercent >= budgetWarning) {
      return {
        allowed: true,
        warning: true,
        projectedPercent,
        message: `This shift will push labor to ${projectedPercent.toFixed(1)}%, approaching the ${budgetMax}% max.${projectedPctVsProjectedSales ? ` (${projectedPctVsProjectedSales.toFixed(1)}% vs projected sales)` : ''}`,
      };
    }
    return { allowed: true };
  }

  // --- Shift CRUD ---

  function openNewShift(employeeId, dayIndex) {
    const day = weekDays[dayIndex];
    setEditingShift(null);
    setLaborWarning(null);
    setFormData({
      employeeId: employeeId || locationEmployees[0]?.id || '',
      date: format(day, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      position: (locationEmployees.find((e) => e.id === employeeId)?.roles || [locationEmployees.find((e) => e.id === employeeId)?.role])[0] || positions[0] || '',
      notes: '',
      taskTemplateIds: [],
    });
    setShowModal(true);
  }

  function openEditShift(shift) {
    const start = parseISO(shift.start);
    const end = parseISO(shift.end);
    setEditingShift(shift);
    setLaborWarning(null);
    setFormData({
      employeeId: shift.employeeId,
      date: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      position: shift.position,
      notes: shift.notes || '',
      taskTemplateIds: shift.taskTemplateIds || [],
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

    // Check labor budget for new shifts (not edits)
    if (!editingShift) {
      const check = checkLaborBudget(formData.employeeId, start.toISOString(), end.toISOString());
      if (!check.allowed) {
        setLaborWarning(check);
        return;
      }
      if (check.warning) {
        setLaborWarning(check);
        // Allow but show warning — user can still submit
      }
    }

    const payload = {
      employeeId: formData.employeeId,
      start: start.toISOString(),
      end: end.toISOString(),
      position: formData.position,
      notes: formData.notes,
      taskTemplateIds: formData.taskTemplateIds || [],
    };

    if (editingShift) {
      dispatch({ type: 'UPDATE_SHIFT', payload: { ...payload, id: editingShift.id } });
    } else {
      dispatch({ type: 'ADD_SHIFT', payload });
    }
    setShowModal(false);
    setLaborWarning(null);
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

    // Check budget before pasting
    const check = checkLaborBudget(employeeId, newStart.toISOString(), newEnd.toISOString());
    if (!check.allowed) {
      setLaborWarning(check);
      setShowModal(true);
      setEditingShift(null);
      setFormData({
        employeeId,
        date: format(targetDay, 'yyyy-MM-dd'),
        startTime: format(origStart, 'HH:mm'),
        endTime: format(origEnd, 'HH:mm'),
        position: copiedShift.position,
        notes: copiedShift.notes || '',
      });
      return;
    }

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

  // --- Selective Publish ---

  function toggleSelectShift(e, shiftId) {
    e.stopPropagation();
    setSelectedShifts((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  }

  function selectAllDrafts() {
    setSelectedShifts(new Set(draftShifts.map((s) => s.id)));
  }

  function clearSelection() {
    setSelectedShifts(new Set());
  }

  function handlePublishSelected() {
    const ids = Array.from(selectedShifts);
    if (ids.length > 0) {
      dispatch({ type: 'PUBLISH_SHIFTS', payload: ids });
    }
    setSelectedShifts(new Set());
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

  const selectedCount = selectedShifts.size;

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
              setLaborWarning(null);
              setFormData({
                employeeId: locationEmployees[0]?.id || '',
                date: format(new Date(), 'yyyy-MM-dd'),
                startTime: '09:00',
                endTime: '17:00',
                position: positions[0] || '',
                notes: '',
                taskTemplateIds: [],
              });
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Add Shift
          </button>
        </div>
      </div>

      {/* Labor Budget Bar */}
      {weeklySales > 0 && (
        <div className={`labor-budget-bar ${isOverBudgetMax ? 'labor-budget-bar--danger' : isOverBudgetWarning ? 'labor-budget-bar--warning' : 'labor-budget-bar--ok'}`}>
          <div className="labor-budget-bar__left">
            {isOverBudgetMax ? <XCircle size={16} /> : isOverBudgetWarning ? <AlertTriangle size={16} /> : <Check size={16} />}
            <span>
              Labor: <strong>{currentLaborPercent.toFixed(1)}%</strong>
              {' '}(${weeklyLaborData.totalCost.toLocaleString()} / ${weeklySales.toLocaleString()} {isUsingProjected ? 'projected ' : ''}sales)
              {isUsingProjected && <em style={{ fontSize: '11px', marginLeft: 4, opacity: 0.8 }}> — using projected sales</em>}
            </span>
          </div>
          <div className="labor-budget-bar__right">
            {weeklySalesActual > 0 && weeklySalesProjected > 0 && (
              <span className="labor-budget-bar__projected">
                vs Projected: <strong>{laborPercentVsProjected.toFixed(1)}%</strong>
              </span>
            )}
            <span className="labor-budget-bar__range">
              Target: {targetPercent}% | Max: {budgetMax}%
            </span>
          </div>
        </div>
      )}

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
            {selectedCount > 0 && (
              <span className="publish-bar__badge publish-bar__badge--selected">
                {selectedCount} selected
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
          {draftCount > 0 && selectedCount === 0 && (
            <button className="btn btn--secondary btn--sm" onClick={selectAllDrafts}>
              Select All Drafts
            </button>
          )}
          {selectedCount > 0 && (
            <button className="btn btn--secondary btn--sm" onClick={clearSelection}>
              Clear Selection
            </button>
          )}
          {publishedCount > 0 && (
            <button className="btn btn--secondary btn--sm" onClick={handleUnpublishWeek}>
              Unpublish All
            </button>
          )}
          {selectedCount > 0 && (
            <button
              className="btn btn--publish btn--sm"
              onClick={() => setShowPublishConfirm(true)}
            >
              <Send size={14} /> Publish {selectedCount} Shift{selectedCount !== 1 ? 's' : ''}
            </button>
          )}
          {draftCount > 0 && selectedCount === 0 && (
            <button
              className="btn btn--publish btn--sm"
              onClick={() => { selectAllDrafts(); setShowPublishConfirm(true); }}
            >
              <Send size={14} /> Publish All
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
                  <div className="schedule-grid__avatar" style={{ background: employee.photoUrl ? 'transparent' : employee.color }}>
                    {employee.photoUrl ? (
                      <img src={employee.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      getInitials(employee.name)
                    )}
                  </div>
                  <div>
                    <div className="schedule-grid__emp-name">{employee.name}</div>
                    <div className="schedule-grid__emp-role">{(employee.roles || [employee.role]).join(', ')}</div>
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
                      {dayShifts.map((s) => {
                        const isDraft = s.status !== 'published';
                        const isSelected = selectedShifts.has(s.id);
                        return (
                          <div
                            key={s.id}
                            className={`schedule-shift ${s.status === 'published' ? 'schedule-shift--published' : 'schedule-shift--draft'} ${draggedShift?.id === s.id ? 'schedule-shift--dragging' : ''} ${isSelected ? 'schedule-shift--selected' : ''}`}
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
                              <div className="schedule-shift__actions">
                                <button
                                  className="schedule-shift__copy-btn"
                                  title="Copy shift"
                                  onClick={(e) => handleCopyShift(e, s)}
                                >
                                  <Copy size={11} />
                                </button>
                                {isDraft && (
                                  <label
                                    className="schedule-shift__checkbox"
                                    title={isSelected ? 'Deselect for publishing' : 'Select for publishing'}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => toggleSelectShift(e, s.id)}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                            <span className="schedule-shift__time">
                              {formatTime(s.start)} - {formatTime(s.end)}
                            </span>
                            <span className="schedule-shift__pos">{s.position}</span>
                            {(s.taskTemplateIds || []).length > 0 && (
                              <span className="schedule-shift__tasks" title={`${s.taskTemplateIds.length} task template(s) assigned`}>
                                {s.taskTemplateIds.length} task{s.taskTemplateIds.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {s.status === 'published' && (
                              <span className="schedule-shift__status">
                                <Check size={10} /> Published
                              </span>
                            )}
                          </div>
                        );
                      })}
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
                You are about to publish <strong>{selectedCount || draftCount}</strong> shift{(selectedCount || draftCount) !== 1 ? 's' : ''} for the week of{' '}
                <strong>{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</strong>.
                Published shifts will be visible to all employees.
              </p>
            </div>
            <div className="modal__footer">
              <div className="modal__footer-right">
                <button className="btn btn--secondary" onClick={() => setShowPublishConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn--publish" onClick={handlePublishSelected}>
                  <Send size={14} /> Publish {selectedCount || draftCount} Shift{(selectedCount || draftCount) !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setLaborWarning(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {editingShift ? 'Edit Shift' : 'New Shift'}
              </h2>
              <button className="btn btn--icon" onClick={() => { setShowModal(false); setLaborWarning(null); }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal__body">
                {/* Labor budget warning/error in modal */}
                {laborWarning && !laborWarning.allowed && (
                  <div className="labor-modal-alert labor-modal-alert--danger">
                    <XCircle size={16} />
                    <span>{laborWarning.message}</span>
                  </div>
                )}
                {laborWarning && laborWarning.allowed && laborWarning.warning && (
                  <div className="labor-modal-alert labor-modal-alert--warning">
                    <AlertTriangle size={16} />
                    <span>{laborWarning.message}</span>
                  </div>
                )}

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

                {locationTemplates.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Task Templates</label>
                    <p className="form-hint">Assign task checklists to this shift. Tasks will be linked to the scheduled employee.</p>
                    <div className="shift-template-chips">
                      {locationTemplates.map((tmpl) => {
                        const isSelected = (formData.taskTemplateIds || []).includes(tmpl.id);
                        return (
                          <button
                            key={tmpl.id}
                            type="button"
                            className={`shift-template-chip ${isSelected ? 'shift-template-chip--active' : ''} shift-template-chip--${tmpl.type}`}
                            onClick={() => {
                              const ids = formData.taskTemplateIds || [];
                              const newIds = isSelected ? ids.filter((id) => id !== tmpl.id) : [...ids, tmpl.id];
                              setFormData({ ...formData, taskTemplateIds: newIds });
                            }}
                          >
                            <span className="shift-template-chip__name">{tmpl.name}</span>
                            <span className="shift-template-chip__count">{tmpl.subtasks.length} items</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal__footer">
                {editingShift && (
                  <button type="button" className="btn btn--danger" onClick={handleDelete}>
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => { setShowModal(false); setLaborWarning(null); }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={laborWarning && !laborWarning.allowed}
                  >
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
