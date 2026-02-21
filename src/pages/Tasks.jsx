import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ListTodo, Plus, X, Trash2, CheckSquare, Square, PlusCircle } from 'lucide-react';
import { getInitials } from '../utils/helpers';
import './Tasks.css';

export default function Tasks() {
  const { state, dispatch } = useApp();
  const { tasks, employees, currentLocationId } = state;

  const locationEmployees = useMemo(() => employees.filter((e) => e.locationId === currentLocationId), [employees, currentLocationId]);
  const locationTasks = useMemo(() => tasks.filter((t) => t.locationId === currentLocationId), [tasks, currentLocationId]);

  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', assigneeId: '', dueDate: '' });
  const [newSubtask, setNewSubtask] = useState({});

  const filtered = useMemo(() => {
    return locationTasks
      .filter((t) => !filterStatus || t.status === filterStatus)
      .sort((a, b) => { const order = { in_progress: 0, pending: 1, completed: 2 }; return (order[a.status] ?? 1) - (order[b.status] ?? 1); });
  }, [locationTasks, filterStatus]);

  const counts = useMemo(() => {
    let pending = 0, inProgress = 0, completed = 0;
    locationTasks.forEach((t) => { if (t.status === 'pending') pending++; else if (t.status === 'in_progress') inProgress++; else completed++; });
    return { pending, inProgress, completed, total: locationTasks.length };
  }, [locationTasks]);

  function handleAddTask(e) {
    e.preventDefault();
    dispatch({ type: 'ADD_TASK', payload: { ...formData, locationId: currentLocationId, assigneeId: formData.assigneeId || null } });
    setShowModal(false);
  }

  function handleToggleSubtask(taskId, subtaskId) {
    dispatch({ type: 'TOGGLE_SUBTASK', payload: { taskId, subtaskId } });
  }

  function handleAddSubtask(e, taskId) {
    e.preventDefault();
    const text = newSubtask[taskId];
    if (!text?.trim()) return;
    dispatch({ type: 'ADD_SUBTASK', payload: { taskId, text: text.trim() } });
    setNewSubtask((prev) => ({ ...prev, [taskId]: '' }));
  }

  function handleDeleteTask(id) {
    if (window.confirm('Delete this task?')) dispatch({ type: 'DELETE_TASK', payload: id });
  }

  function handleStatusChange(taskId, status) {
    dispatch({ type: 'UPDATE_TASK', payload: { id: taskId, status } });
  }

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{counts.total} tasks</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setFormData({ title: '', assigneeId: '', dueDate: '' }); setShowModal(true); }}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      <div className="tasks-summary">
        <div className="task-count task-count--pending" onClick={() => setFilterStatus(filterStatus === 'pending' ? '' : 'pending')}>
          <span className="task-count__num">{counts.pending}</span><span className="task-count__label">Pending</span>
        </div>
        <div className="task-count task-count--progress" onClick={() => setFilterStatus(filterStatus === 'in_progress' ? '' : 'in_progress')}>
          <span className="task-count__num">{counts.inProgress}</span><span className="task-count__label">In Progress</span>
        </div>
        <div className="task-count task-count--done" onClick={() => setFilterStatus(filterStatus === 'completed' ? '' : 'completed')}>
          <span className="task-count__num">{counts.completed}</span><span className="task-count__label">Completed</span>
        </div>
      </div>

      <div className="tasks-list">
        {filtered.length === 0 ? (
          <div className="card"><div className="card__body"><div className="empty-state"><ListTodo size={40} className="empty-state__icon" /><p>No tasks found</p></div></div></div>
        ) : (
          filtered.map((task) => {
            const assignee = task.assigneeId ? employees.find((e) => e.id === task.assigneeId) : null;
            const doneCount = task.subtasks.filter((s) => s.done).length;
            const totalSubs = task.subtasks.length;
            return (
              <div key={task.id} className={`task-card task-card--${task.status}`}>
                <div className="task-card__header">
                  <div className="task-card__title-row">
                    <select className="task-status-select" value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <h3 className={`task-card__title ${task.status === 'completed' ? 'task-card__title--done' : ''}`}>{task.title}</h3>
                  </div>
                  <button className="btn btn--icon btn--sm" onClick={() => handleDeleteTask(task.id)}><Trash2 size={14} /></button>
                </div>
                <div className="task-card__meta">
                  {assignee ? (
                    <span className="task-assignee">
                      <span className="task-assignee__avatar" style={{ background: assignee.color }}>{getInitials(assignee.name)}</span>
                      {assignee.name}
                    </span>
                  ) : (
                    <span className="task-unassigned">Unassigned</span>
                  )}
                  {task.dueDate && <span className="task-due">Due: {task.dueDate}</span>}
                  {totalSubs > 0 && <span className="task-progress">{doneCount}/{totalSubs} subtasks</span>}
                </div>
                {totalSubs > 0 && (
                  <div className="task-card__progress-bar">
                    <div className="task-progress-fill" style={{ width: `${(doneCount / totalSubs) * 100}%` }} />
                  </div>
                )}
                <div className="task-card__subtasks">
                  {task.subtasks.map((st) => (
                    <label key={st.id} className={`subtask ${st.done ? 'subtask--done' : ''}`}>
                      <button className="subtask__check" onClick={() => handleToggleSubtask(task.id, st.id)}>
                        {st.done ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                      <span>{st.text}</span>
                    </label>
                  ))}
                  <form className="subtask-add" onSubmit={(e) => handleAddSubtask(e, task.id)}>
                    <PlusCircle size={14} />
                    <input type="text" placeholder="Add subtask..." value={newSubtask[task.id] || ''} onChange={(e) => setNewSubtask((prev) => ({ ...prev, [task.id]: e.target.value }))} />
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h2 className="modal__title">New Task</h2><button className="btn btn--icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <form onSubmit={handleAddTask}>
              <div className="modal__body">
                <div className="form-group"><label className="form-label">Title</label><input type="text" className="form-input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Task description" required /></div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assign To</label>
                    <select className="form-input" value={formData.assigneeId} onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}>
                      <option value="">Unassigned</option>
                      {locationEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Due Date</label><input type="date" className="form-input" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal__footer"><div className="modal__footer-right"><button type="button" className="btn btn--secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn--primary">Create Task</button></div></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
