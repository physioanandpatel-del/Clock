import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ListTodo, Plus, X, Trash2, CheckSquare, Square, PlusCircle, Clipboard, Edit2, Copy, Sunrise, Sunset, CalendarCheck } from 'lucide-react';
import { getInitials, generateId } from '../utils/helpers';
import './Tasks.css';

const TEMPLATE_TYPES = [
  { value: 'opening', label: 'Opening', icon: Sunrise },
  { value: 'closing', label: 'Closing', icon: Sunset },
  { value: 'weekly', label: 'Weekly', icon: CalendarCheck },
  { value: 'custom', label: 'Custom', icon: Clipboard },
];

const TEMPLATE_TYPE_LABELS = { opening: 'Opening', closing: 'Closing', weekly: 'Weekly', custom: 'Custom' };

export default function Tasks() {
  const { state, dispatch } = useApp();
  const { tasks, employees, currentLocationId, taskTemplates = [] } = state;

  const locationEmployees = useMemo(() => employees.filter((e) => (e.locationIds || [e.locationId]).includes(currentLocationId)), [employees, currentLocationId]);
  const locationTasks = useMemo(() => tasks.filter((t) => t.locationId === currentLocationId), [tasks, currentLocationId]);
  const locationTemplates = useMemo(() => (taskTemplates || []).filter((t) => t.locationId === currentLocationId), [taskTemplates, currentLocationId]);

  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'templates'
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', assigneeId: '', dueDate: '' });
  const [newSubtask, setNewSubtask] = useState({});

  // Template state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'opening', subtasks: [] });
  const [newTemplateSubtask, setNewTemplateSubtask] = useState('');

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

  // --- Template Handlers ---

  function openNewTemplate() {
    setEditingTemplate(null);
    setTemplateForm({ name: '', type: 'opening', subtasks: [] });
    setNewTemplateSubtask('');
    setShowTemplateModal(true);
  }

  function openEditTemplate(template) {
    setEditingTemplate(template);
    setTemplateForm({ name: template.name, type: template.type, subtasks: [...template.subtasks] });
    setNewTemplateSubtask('');
    setShowTemplateModal(true);
  }

  function handleSaveTemplate(e) {
    e.preventDefault();
    if (!templateForm.name.trim()) return;
    const payload = {
      name: templateForm.name.trim(),
      type: templateForm.type,
      locationId: currentLocationId,
      subtasks: templateForm.subtasks,
    };
    if (editingTemplate) {
      dispatch({ type: 'UPDATE_TASK_TEMPLATE', payload: { ...payload, id: editingTemplate.id } });
    } else {
      dispatch({ type: 'ADD_TASK_TEMPLATE', payload });
    }
    setShowTemplateModal(false);
  }

  function handleDeleteTemplate(id) {
    if (window.confirm('Delete this template? It will be unlinked from any shifts.')) {
      dispatch({ type: 'DELETE_TASK_TEMPLATE', payload: id });
    }
  }

  function addTemplateSubtask() {
    if (!newTemplateSubtask.trim()) return;
    setTemplateForm((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, { id: generateId(), text: newTemplateSubtask.trim(), order: prev.subtasks.length }],
    }));
    setNewTemplateSubtask('');
  }

  function removeTemplateSubtask(id) {
    setTemplateForm((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((s) => s.id !== id),
    }));
  }

  function duplicateTemplate(template) {
    dispatch({
      type: 'ADD_TASK_TEMPLATE',
      payload: {
        name: template.name + ' (Copy)',
        type: template.type,
        locationId: template.locationId,
        subtasks: template.subtasks.map((s) => ({ ...s, id: generateId() })),
      },
    });
  }

  // Create a task from a template
  function createTaskFromTemplate(template, assigneeId) {
    const subtasks = template.subtasks.map((s) => ({
      id: generateId(),
      text: s.text,
      done: false,
    }));
    dispatch({
      type: 'ADD_TASK',
      payload: {
        title: template.name,
        locationId: currentLocationId,
        assigneeId: assigneeId || null,
        dueDate: new Date().toISOString().split('T')[0],
        subtasks,
        templateId: template.id,
      },
    });
  }

  const [showCreateFromTemplate, setShowCreateFromTemplate] = useState(null);
  const [createAssigneeId, setCreateAssigneeId] = useState('');

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{counts.total} tasks &middot; {locationTemplates.length} templates</p>
        </div>
        <div className="tasks-header-actions">
          {activeTab === 'tasks' && (
            <button className="btn btn--primary" onClick={() => { setFormData({ title: '', assigneeId: '', dueDate: '' }); setShowModal(true); }}>
              <Plus size={16} /> Add Task
            </button>
          )}
          {activeTab === 'templates' && (
            <button className="btn btn--primary" onClick={openNewTemplate}>
              <Plus size={16} /> New Template
            </button>
          )}
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="tasks-tabs">
        <button className={`tasks-tab ${activeTab === 'tasks' ? 'tasks-tab--active' : ''}`} onClick={() => setActiveTab('tasks')}>
          <ListTodo size={16} /> Tasks ({counts.total})
        </button>
        <button className={`tasks-tab ${activeTab === 'templates' ? 'tasks-tab--active' : ''}`} onClick={() => setActiveTab('templates')}>
          <Clipboard size={16} /> Templates ({locationTemplates.length})
        </button>
      </div>

      {/* ===== TASKS VIEW ===== */}
      {activeTab === 'tasks' && (
        <>
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
                const linkedTemplate = task.templateId ? (taskTemplates || []).find((t) => t.id === task.templateId) : null;
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
                        {linkedTemplate && (
                          <span className={`template-badge template-badge--${linkedTemplate.type}`}>
                            {TEMPLATE_TYPE_LABELS[linkedTemplate.type]}
                          </span>
                        )}
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
        </>
      )}

      {/* ===== TEMPLATES VIEW ===== */}
      {activeTab === 'templates' && (
        <div className="templates-list">
          {locationTemplates.length === 0 ? (
            <div className="card"><div className="card__body"><div className="empty-state"><Clipboard size={40} className="empty-state__icon" /><p>No templates yet. Create one to speed up task assignment.</p></div></div></div>
          ) : (
            locationTemplates.map((template) => {
              const TypeIcon = TEMPLATE_TYPES.find((t) => t.value === template.type)?.icon || Clipboard;
              return (
                <div key={template.id} className={`template-card template-card--${template.type}`}>
                  <div className="template-card__header">
                    <div className="template-card__title-row">
                      <TypeIcon size={18} className="template-card__type-icon" />
                      <h3 className="template-card__name">{template.name}</h3>
                      <span className={`template-type-badge template-type-badge--${template.type}`}>
                        {TEMPLATE_TYPE_LABELS[template.type] || 'Custom'}
                      </span>
                    </div>
                    <div className="template-card__actions">
                      <button className="btn btn--icon btn--sm" title="Duplicate" onClick={() => duplicateTemplate(template)}><Copy size={14} /></button>
                      <button className="btn btn--icon btn--sm" title="Edit" onClick={() => openEditTemplate(template)}><Edit2 size={14} /></button>
                      <button className="btn btn--icon btn--sm" title="Delete" onClick={() => handleDeleteTemplate(template.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="template-card__subtasks">
                    {template.subtasks.map((st, i) => (
                      <div key={st.id} className="template-subtask">
                        <span className="template-subtask__num">{i + 1}.</span>
                        <span>{st.text}</span>
                      </div>
                    ))}
                    {template.subtasks.length === 0 && (
                      <p className="template-empty-hint">No checklist items yet. Edit to add.</p>
                    )}
                  </div>
                  <div className="template-card__footer">
                    <span className="template-card__count">{template.subtasks.length} item{template.subtasks.length !== 1 ? 's' : ''}</span>
                    <button className="btn btn--secondary btn--sm" onClick={() => { setShowCreateFromTemplate(template); setCreateAssigneeId(''); }}>
                      <Plus size={12} /> Create Task from Template
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== ADD TASK MODAL ===== */}
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

      {/* ===== TEMPLATE MODAL ===== */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{editingTemplate ? 'Edit Template' : 'New Task Template'}</h2>
              <button className="btn btn--icon" onClick={() => setShowTemplateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveTemplate}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Template Name</label>
                  <input type="text" className="form-input" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="e.g. Opening Tasks" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Template Type</label>
                  <div className="template-type-selector">
                    {TEMPLATE_TYPES.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button key={t.value} type="button" className={`template-type-btn ${templateForm.type === t.value ? 'template-type-btn--active' : ''}`} onClick={() => setTemplateForm({ ...templateForm, type: t.value })}>
                          <Icon size={16} /> {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Checklist Items ({templateForm.subtasks.length})</label>
                  <div className="template-subtask-list">
                    {templateForm.subtasks.map((st, i) => (
                      <div key={st.id} className="template-subtask-edit">
                        <span className="template-subtask-edit__num">{i + 1}</span>
                        <input type="text" className="form-input template-subtask-edit__input" value={st.text}
                          onChange={(e) => {
                            const updated = [...templateForm.subtasks];
                            updated[i] = { ...updated[i], text: e.target.value };
                            setTemplateForm({ ...templateForm, subtasks: updated });
                          }}
                        />
                        <button type="button" className="btn btn--icon btn--sm" onClick={() => removeTemplateSubtask(st.id)}><X size={14} /></button>
                      </div>
                    ))}
                    <div className="template-subtask-add">
                      <PlusCircle size={14} />
                      <input type="text" className="form-input" value={newTemplateSubtask} onChange={(e) => setNewTemplateSubtask(e.target.value)}
                        placeholder="Add checklist item..."
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTemplateSubtask(); } }}
                      />
                      <button type="button" className="btn btn--secondary btn--sm" onClick={addTemplateSubtask}>Add</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowTemplateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">{editingTemplate ? 'Save Changes' : 'Create Template'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== CREATE FROM TEMPLATE MODAL ===== */}
      {showCreateFromTemplate && (
        <div className="modal-overlay" onClick={() => setShowCreateFromTemplate(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Create Task: {showCreateFromTemplate.name}</h2>
              <button className="btn btn--icon" onClick={() => setShowCreateFromTemplate(null)}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                This will create a new task with {showCreateFromTemplate.subtasks.length} checklist items from the template.
              </p>
              <div className="form-group">
                <label className="form-label">Assign To</label>
                <select className="form-input" value={createAssigneeId} onChange={(e) => setCreateAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {locationEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div className="template-preview-items">
                {showCreateFromTemplate.subtasks.map((st, i) => (
                  <div key={st.id} className="template-preview-item">
                    <Square size={14} />
                    <span>{st.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal__footer">
              <div className="modal__footer-right">
                <button type="button" className="btn btn--secondary" onClick={() => setShowCreateFromTemplate(null)}>Cancel</button>
                <button type="button" className="btn btn--primary" onClick={() => {
                  createTaskFromTemplate(showCreateFromTemplate, createAssigneeId);
                  setShowCreateFromTemplate(null);
                }}>Create Task</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
