import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ListTodo, Plus, X, Trash2, CheckSquare, Square, PlusCircle, Clipboard, Edit2, Copy,
  Sunrise, Sunset, CalendarCheck, GraduationCap, ClipboardList, Send, Star, MessageSquare,
  Users, BarChart2, BookOpen, UserPlus, Clock, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
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
  const {
    tasks, employees, currentLocationId, taskTemplates = [],
    trainingPrograms = [], trainingAssignments = [], surveyTemplates = [], surveyResponses = [],
  } = state;

  const locationEmployees = useMemo(() => employees.filter((e) => (e.locationIds || [e.locationId]).includes(currentLocationId)), [employees, currentLocationId]);
  const locationTasks = useMemo(() => tasks.filter((t) => t.locationId === currentLocationId), [tasks, currentLocationId]);
  const locationTemplates = useMemo(() => (taskTemplates || []).filter((t) => t.locationId === currentLocationId), [taskTemplates, currentLocationId]);
  const locationPrograms = useMemo(() => trainingPrograms.filter((p) => p.locationId === currentLocationId), [trainingPrograms, currentLocationId]);
  const locationAssignments = useMemo(() => {
    const progIds = new Set(locationPrograms.map((p) => p.id));
    return trainingAssignments.filter((a) => progIds.has(a.programId));
  }, [trainingAssignments, locationPrograms]);
  const locationSurveyTemplates = useMemo(() => surveyTemplates.filter((s) => s.locationId === currentLocationId), [surveyTemplates, currentLocationId]);
  const locationSurveyResponses = useMemo(() => {
    const tmplIds = new Set(locationSurveyTemplates.map((s) => s.id));
    return surveyResponses.filter((r) => tmplIds.has(r.surveyId));
  }, [surveyResponses, locationSurveyTemplates]);

  const [activeTab, setActiveTab] = useState('tasks');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', assigneeId: '', dueDate: '' });
  const [newSubtask, setNewSubtask] = useState({});

  // Template state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'opening', subtasks: [] });
  const [newTemplateSubtask, setNewTemplateSubtask] = useState('');

  // Training state
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [trainingForm, setTrainingForm] = useState({ name: '', modules: [] });
  const [newModuleText, setNewModuleText] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [expandedAssignments, setExpandedAssignments] = useState({});

  // Survey state
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [surveyForm, setSurveyForm] = useState({ name: '', type: 'new_hire', triggerDays: 30, intervalDays: 90, questions: [] });
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('rating');
  const [showSendSurvey, setShowSendSurvey] = useState(null);
  const [sendEmployeeId, setSendEmployeeId] = useState('');
  const [viewingResponses, setViewingResponses] = useState(null);

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

  // ===== TASK HANDLERS =====
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

  // ===== TEMPLATE HANDLERS =====
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
    const payload = { name: templateForm.name.trim(), type: templateForm.type, locationId: currentLocationId, subtasks: templateForm.subtasks };
    if (editingTemplate) {
      dispatch({ type: 'UPDATE_TASK_TEMPLATE', payload: { ...payload, id: editingTemplate.id } });
    } else {
      dispatch({ type: 'ADD_TASK_TEMPLATE', payload });
    }
    setShowTemplateModal(false);
  }

  function handleDeleteTemplate(id) {
    if (window.confirm('Delete this template?')) dispatch({ type: 'DELETE_TASK_TEMPLATE', payload: id });
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
    setTemplateForm((prev) => ({ ...prev, subtasks: prev.subtasks.filter((s) => s.id !== id) }));
  }

  function duplicateTemplate(template) {
    dispatch({
      type: 'ADD_TASK_TEMPLATE',
      payload: { name: template.name + ' (Copy)', type: template.type, locationId: template.locationId, subtasks: template.subtasks.map((s) => ({ ...s, id: generateId() })) },
    });
  }

  function createTaskFromTemplate(template, assigneeId) {
    const subtasks = template.subtasks.map((s) => ({ id: generateId(), text: s.text, done: false }));
    dispatch({ type: 'ADD_TASK', payload: { title: template.name, locationId: currentLocationId, assigneeId: assigneeId || null, dueDate: new Date().toISOString().split('T')[0], subtasks, templateId: template.id } });
  }

  const [showCreateFromTemplate, setShowCreateFromTemplate] = useState(null);
  const [createAssigneeId, setCreateAssigneeId] = useState('');

  // ===== TRAINING HANDLERS =====
  function openNewTraining() {
    setEditingProgram(null);
    setTrainingForm({ name: '', modules: [] });
    setNewModuleText('');
    setShowTrainingModal(true);
  }

  function openEditTraining(program) {
    setEditingProgram(program);
    setTrainingForm({ name: program.name, modules: [...program.modules] });
    setNewModuleText('');
    setShowTrainingModal(true);
  }

  function handleSaveTraining(e) {
    e.preventDefault();
    if (!trainingForm.name.trim()) return;
    const payload = { name: trainingForm.name.trim(), locationId: currentLocationId, modules: trainingForm.modules };
    if (editingProgram) {
      dispatch({ type: 'UPDATE_TRAINING_PROGRAM', payload: { ...payload, id: editingProgram.id } });
    } else {
      dispatch({ type: 'ADD_TRAINING_PROGRAM', payload });
    }
    setShowTrainingModal(false);
  }

  function handleDeleteTraining(id) {
    if (window.confirm('Delete this program and all assignments?')) dispatch({ type: 'DELETE_TRAINING_PROGRAM', payload: id });
  }

  function addModule() {
    if (!newModuleText.trim()) return;
    setTrainingForm((prev) => ({
      ...prev,
      modules: [...prev.modules, { id: generateId(), text: newModuleText.trim(), order: prev.modules.length }],
    }));
    setNewModuleText('');
  }

  function removeModule(id) {
    setTrainingForm((prev) => ({ ...prev, modules: prev.modules.filter((m) => m.id !== id) }));
  }

  function handleAssignTraining(programId) {
    if (!assignEmployeeId) return;
    dispatch({ type: 'ASSIGN_TRAINING', payload: { programId, employeeId: assignEmployeeId } });
    setShowAssignModal(null);
    setAssignEmployeeId('');
  }

  function handleToggleModule(assignmentId, moduleId) {
    dispatch({ type: 'COMPLETE_TRAINING_MODULE', payload: { assignmentId, moduleId } });
  }

  function handleCompleteTraining(assignmentId) {
    dispatch({ type: 'COMPLETE_TRAINING', payload: assignmentId });
  }

  function handleDeleteAssignment(assignmentId) {
    if (window.confirm('Remove this training assignment?')) dispatch({ type: 'DELETE_TRAINING_ASSIGNMENT', payload: assignmentId });
  }

  function toggleAssignmentExpand(id) {
    setExpandedAssignments((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ===== SURVEY HANDLERS =====
  function openNewSurvey() {
    setEditingSurvey(null);
    setSurveyForm({ name: '', type: 'new_hire', triggerDays: 30, intervalDays: 90, questions: [] });
    setNewQuestionText('');
    setNewQuestionType('rating');
    setShowSurveyModal(true);
  }

  function openEditSurvey(survey) {
    setEditingSurvey(survey);
    setSurveyForm({
      name: survey.name,
      type: survey.type,
      triggerDays: survey.triggerDays || 30,
      intervalDays: survey.intervalDays || 90,
      questions: [...survey.questions],
    });
    setNewQuestionText('');
    setNewQuestionType('rating');
    setShowSurveyModal(true);
  }

  function handleSaveSurvey(e) {
    e.preventDefault();
    if (!surveyForm.name.trim()) return;
    const payload = {
      name: surveyForm.name.trim(),
      type: surveyForm.type,
      triggerDays: surveyForm.type === 'new_hire' ? Number(surveyForm.triggerDays) : 0,
      intervalDays: surveyForm.type === 'periodic' ? Number(surveyForm.intervalDays) : 0,
      locationId: currentLocationId,
      questions: surveyForm.questions,
    };
    if (editingSurvey) {
      dispatch({ type: 'UPDATE_SURVEY_TEMPLATE', payload: { ...payload, id: editingSurvey.id } });
    } else {
      dispatch({ type: 'ADD_SURVEY_TEMPLATE', payload });
    }
    setShowSurveyModal(false);
  }

  function handleDeleteSurvey(id) {
    if (window.confirm('Delete this survey template?')) dispatch({ type: 'DELETE_SURVEY_TEMPLATE', payload: id });
  }

  function addQuestion() {
    if (!newQuestionText.trim()) return;
    setSurveyForm((prev) => ({
      ...prev,
      questions: [...prev.questions, { id: generateId(), text: newQuestionText.trim(), type: newQuestionType }],
    }));
    setNewQuestionText('');
  }

  function removeQuestion(id) {
    setSurveyForm((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== id) }));
  }

  function handleSendSurvey(surveyId) {
    if (!sendEmployeeId) return;
    dispatch({ type: 'SEND_SURVEY', payload: { surveyId, employeeId: sendEmployeeId } });
    setShowSendSurvey(null);
    setSendEmployeeId('');
  }

  // ===== Computed data for Training tab =====
  const trainingStats = useMemo(() => {
    let assigned = 0, inProgress = 0, completed = 0;
    locationAssignments.forEach((a) => {
      if (a.status === 'completed') completed++;
      else if (a.status === 'in_progress') inProgress++;
      else assigned++;
    });
    return { assigned, inProgress, completed, total: locationAssignments.length };
  }, [locationAssignments]);

  // ===== Computed data for Surveys tab =====
  const surveyStats = useMemo(() => {
    let pending = 0, completed = 0;
    locationSurveyResponses.forEach((r) => {
      if (r.status === 'completed') completed++;
      else pending++;
    });
    return { pending, completed, total: locationSurveyResponses.length };
  }, [locationSurveyResponses]);

  // Header action button
  const headerAction = () => {
    if (activeTab === 'tasks') return <button className="btn btn--primary" onClick={() => { setFormData({ title: '', assigneeId: '', dueDate: '' }); setShowModal(true); }}><Plus size={16} /> Add Task</button>;
    if (activeTab === 'templates') return <button className="btn btn--primary" onClick={openNewTemplate}><Plus size={16} /> New Template</button>;
    if (activeTab === 'training') return <button className="btn btn--primary" onClick={openNewTraining}><Plus size={16} /> New Program</button>;
    if (activeTab === 'surveys') return <button className="btn btn--primary" onClick={openNewSurvey}><Plus size={16} /> New Survey</button>;
    return null;
  };

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks & Training</h1>
          <p className="page-subtitle">{counts.total} tasks &middot; {locationPrograms.length} programs &middot; {locationSurveyTemplates.length} surveys</p>
        </div>
        <div className="tasks-header-actions">{headerAction()}</div>
      </div>

      {/* Tab Toggle */}
      <div className="tasks-tabs">
        <button className={`tasks-tab ${activeTab === 'tasks' ? 'tasks-tab--active' : ''}`} onClick={() => setActiveTab('tasks')}>
          <ListTodo size={16} /> Tasks ({counts.total})
        </button>
        <button className={`tasks-tab ${activeTab === 'templates' ? 'tasks-tab--active' : ''}`} onClick={() => setActiveTab('templates')}>
          <Clipboard size={16} /> Templates ({locationTemplates.length})
        </button>
        <button className={`tasks-tab ${activeTab === 'training' ? 'tasks-tab--active' : ''}`} onClick={() => setActiveTab('training')}>
          <GraduationCap size={16} /> Training ({locationAssignments.length})
        </button>
        <button className={`tasks-tab ${activeTab === 'surveys' ? 'tasks-tab--active' : ''}`} onClick={() => setActiveTab('surveys')}>
          <ClipboardList size={16} /> Surveys ({locationSurveyTemplates.length})
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
                    {template.subtasks.length === 0 && <p className="template-empty-hint">No checklist items yet. Edit to add.</p>}
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

      {/* ===== TRAINING VIEW ===== */}
      {activeTab === 'training' && (
        <>
          <div className="tasks-summary">
            <div className="task-count task-count--pending" style={{ cursor: 'default' }}>
              <span className="task-count__num">{trainingStats.assigned}</span><span className="task-count__label">Assigned</span>
            </div>
            <div className="task-count task-count--progress" style={{ cursor: 'default' }}>
              <span className="task-count__num">{trainingStats.inProgress}</span><span className="task-count__label">In Progress</span>
            </div>
            <div className="task-count task-count--done" style={{ cursor: 'default' }}>
              <span className="task-count__num">{trainingStats.completed}</span><span className="task-count__label">Completed</span>
            </div>
          </div>

          <div className="training-programs-list">
            {locationPrograms.length === 0 ? (
              <div className="card"><div className="card__body"><div className="empty-state"><GraduationCap size={40} className="empty-state__icon" /><p>No training programs yet. Create one to track employee progress.</p></div></div></div>
            ) : (
              locationPrograms.map((program) => {
                const assignments = locationAssignments.filter((a) => a.programId === program.id);
                const activeAssignments = assignments.filter((a) => a.status !== 'completed');
                const completedCount = assignments.filter((a) => a.status === 'completed').length;
                return (
                  <div key={program.id} className="training-card">
                    <div className="training-card__header">
                      <div className="training-card__title-row">
                        <BookOpen size={18} className="training-card__icon" />
                        <h3 className="training-card__name">{program.name}</h3>
                        <span className="training-module-count">{program.modules.length} modules</span>
                      </div>
                      <div className="training-card__actions">
                        <button className="btn btn--icon btn--sm" title="Assign" onClick={() => { setShowAssignModal(program.id); setAssignEmployeeId(''); }}><UserPlus size={14} /></button>
                        <button className="btn btn--icon btn--sm" title="Edit" onClick={() => openEditTraining(program)}><Edit2 size={14} /></button>
                        <button className="btn btn--icon btn--sm" title="Delete" onClick={() => handleDeleteTraining(program.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>

                    {/* Module List */}
                    <div className="training-card__modules">
                      {program.modules.map((mod, i) => (
                        <div key={mod.id} className="training-module-item">
                          <span className="training-module-item__num">{i + 1}.</span>
                          <span>{mod.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Active Assignments */}
                    {assignments.length > 0 && (
                      <div className="training-card__assignments">
                        <div className="training-card__assignments-header">
                          <Users size={14} /> {assignments.length} assigned &middot; {completedCount} completed
                        </div>
                        {assignments.map((assignment) => {
                          const emp = employees.find((e) => e.id === assignment.employeeId);
                          if (!emp) return null;
                          const progress = program.modules.length > 0 ? Math.round((assignment.completedModules.length / program.modules.length) * 100) : 0;
                          const isExpanded = expandedAssignments[assignment.id];
                          return (
                            <div key={assignment.id} className={`training-assignment ${assignment.status === 'completed' ? 'training-assignment--completed' : ''}`}>
                              <div className="training-assignment__header" onClick={() => toggleAssignmentExpand(assignment.id)}>
                                <div className="training-assignment__info">
                                  <span className="training-assignment__avatar" style={{ background: emp.color }}>{getInitials(emp.name)}</span>
                                  <span className="training-assignment__name">{emp.name}</span>
                                  <span className={`training-status-badge training-status-badge--${assignment.status}`}>
                                    {assignment.status === 'completed' ? 'Completed' : assignment.status === 'in_progress' ? 'In Progress' : 'Assigned'}
                                  </span>
                                </div>
                                <div className="training-assignment__right">
                                  <span className="training-assignment__progress-text">{assignment.completedModules.length}/{program.modules.length}</span>
                                  <div className="training-assignment__progress-bar">
                                    <div className="training-assignment__progress-fill" style={{ width: `${progress}%` }} />
                                  </div>
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="training-assignment__modules">
                                  {program.modules.map((mod) => {
                                    const done = assignment.completedModules.includes(mod.id);
                                    return (
                                      <label key={mod.id} className={`training-module-check ${done ? 'training-module-check--done' : ''}`}>
                                        <button className="subtask__check" onClick={() => assignment.status !== 'completed' && handleToggleModule(assignment.id, mod.id)} disabled={assignment.status === 'completed'}>
                                          {done ? <CheckSquare size={15} /> : <Square size={15} />}
                                        </button>
                                        <span>{mod.text}</span>
                                      </label>
                                    );
                                  })}
                                  <div className="training-assignment__actions">
                                    {assignment.status !== 'completed' && progress === 100 && (
                                      <button className="btn btn--primary btn--sm" onClick={() => handleCompleteTraining(assignment.id)}>
                                        <CheckSquare size={14} /> Mark Complete
                                      </button>
                                    )}
                                    <button className="btn btn--icon btn--sm" title="Remove assignment" onClick={() => handleDeleteAssignment(assignment.id)}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="training-card__footer">
                      <span className="training-card__footer-text">{activeAssignments.length} active &middot; {completedCount} completed</span>
                      <button className="btn btn--secondary btn--sm" onClick={() => { setShowAssignModal(program.id); setAssignEmployeeId(''); }}>
                        <UserPlus size={12} /> Assign Employee
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ===== SURVEYS VIEW ===== */}
      {activeTab === 'surveys' && (
        <>
          <div className="tasks-summary">
            <div className="task-count task-count--pending" style={{ cursor: 'default' }}>
              <span className="task-count__num">{surveyStats.pending}</span><span className="task-count__label">Pending</span>
            </div>
            <div className="task-count task-count--done" style={{ cursor: 'default' }}>
              <span className="task-count__num">{surveyStats.completed}</span><span className="task-count__label">Completed</span>
            </div>
            <div className="task-count task-count--progress" style={{ cursor: 'default' }}>
              <span className="task-count__num">{surveyStats.total}</span><span className="task-count__label">Total Sent</span>
            </div>
          </div>

          <div className="surveys-list">
            {locationSurveyTemplates.length === 0 ? (
              <div className="card"><div className="card__body"><div className="empty-state"><ClipboardList size={40} className="empty-state__icon" /><p>No survey templates yet. Create one to collect team feedback.</p></div></div></div>
            ) : (
              locationSurveyTemplates.map((survey) => {
                const responses = locationSurveyResponses.filter((r) => r.surveyId === survey.id);
                const completedResps = responses.filter((r) => r.status === 'completed');
                const pendingResps = responses.filter((r) => r.status === 'pending');
                // Calculate average rating for completed responses
                let avgRating = null;
                if (completedResps.length > 0) {
                  const ratingQuestionIds = new Set(survey.questions.filter((q) => q.type === 'rating').map((q) => q.id));
                  let totalRating = 0, ratingCount = 0;
                  completedResps.forEach((r) => {
                    r.answers.forEach((a) => {
                      if (ratingQuestionIds.has(a.questionId) && typeof a.value === 'number') {
                        totalRating += a.value;
                        ratingCount++;
                      }
                    });
                  });
                  if (ratingCount > 0) avgRating = (totalRating / ratingCount).toFixed(1);
                }

                return (
                  <div key={survey.id} className={`survey-card survey-card--${survey.type}`}>
                    <div className="survey-card__header">
                      <div className="survey-card__title-row">
                        <ClipboardList size={18} className="survey-card__icon" />
                        <h3 className="survey-card__name">{survey.name}</h3>
                        <span className={`survey-type-badge survey-type-badge--${survey.type}`}>
                          {survey.type === 'new_hire' ? 'New Hire' : 'Periodic'}
                        </span>
                      </div>
                      <div className="survey-card__actions">
                        <button className="btn btn--icon btn--sm" title="Send" onClick={() => { setShowSendSurvey(survey); setSendEmployeeId(''); }}><Send size={14} /></button>
                        <button className="btn btn--icon btn--sm" title="Edit" onClick={() => openEditSurvey(survey)}><Edit2 size={14} /></button>
                        <button className="btn btn--icon btn--sm" title="Delete" onClick={() => handleDeleteSurvey(survey.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <div className="survey-card__meta">
                      <span className="survey-meta-item">
                        <MessageSquare size={13} /> {survey.questions.length} questions
                      </span>
                      {survey.type === 'new_hire' && (
                        <span className="survey-meta-item">
                          <Clock size={13} /> Sent at {survey.triggerDays} days
                        </span>
                      )}
                      {survey.type === 'periodic' && (
                        <span className="survey-meta-item">
                          <Clock size={13} /> Every {survey.intervalDays} days
                        </span>
                      )}
                      {avgRating && (
                        <span className="survey-meta-item survey-meta-item--rating">
                          <Star size={13} /> {avgRating}/5 avg
                        </span>
                      )}
                    </div>

                    {/* Questions preview */}
                    <div className="survey-card__questions">
                      {survey.questions.map((q, i) => (
                        <div key={q.id} className="survey-question-preview">
                          <span className="survey-question-preview__num">{i + 1}.</span>
                          <span className="survey-question-preview__text">{q.text}</span>
                          <span className={`survey-question-type survey-question-type--${q.type}`}>
                            {q.type === 'rating' ? <><Star size={10} /> Rating</> : <><MessageSquare size={10} /> Text</>}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Responses summary */}
                    {responses.length > 0 && (
                      <div className="survey-card__responses">
                        <div className="survey-card__responses-header">
                          <BarChart2 size={14} /> {completedResps.length} completed &middot; {pendingResps.length} pending
                        </div>
                        {completedResps.slice(0, 3).map((resp) => {
                          const emp = employees.find((e) => e.id === resp.employeeId);
                          if (!emp) return null;
                          return (
                            <div key={resp.id} className="survey-response-row">
                              <span className="survey-response-row__avatar" style={{ background: emp.color }}>{getInitials(emp.name)}</span>
                              <span className="survey-response-row__name">{emp.name}</span>
                              <span className="survey-response-row__date">{resp.completedDate}</span>
                              <button className="btn btn--icon btn--sm" title="View responses" onClick={() => setViewingResponses(resp)}>
                                <Eye size={14} />
                              </button>
                            </div>
                          );
                        })}
                        {pendingResps.map((resp) => {
                          const emp = employees.find((e) => e.id === resp.employeeId);
                          if (!emp) return null;
                          return (
                            <div key={resp.id} className="survey-response-row survey-response-row--pending">
                              <span className="survey-response-row__avatar" style={{ background: emp.color, opacity: 0.5 }}>{getInitials(emp.name)}</span>
                              <span className="survey-response-row__name">{emp.name}</span>
                              <span className="survey-response-row__pending-badge">Pending</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="survey-card__footer">
                      <span className="survey-card__footer-text">{responses.length} response{responses.length !== 1 ? 's' : ''} sent</span>
                      <button className="btn btn--secondary btn--sm" onClick={() => { setShowSendSurvey(survey); setSendEmployeeId(''); }}>
                        <Send size={12} /> Send Survey
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
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
                {showCreateFromTemplate.subtasks.map((st) => (
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

      {/* ===== TRAINING PROGRAM MODAL ===== */}
      {showTrainingModal && (
        <div className="modal-overlay" onClick={() => setShowTrainingModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{editingProgram ? 'Edit Training Program' : 'New Training Program'}</h2>
              <button className="btn btn--icon" onClick={() => setShowTrainingModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveTraining}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Program Name</label>
                  <input type="text" className="form-input" value={trainingForm.name} onChange={(e) => setTrainingForm({ ...trainingForm, name: e.target.value })} placeholder="e.g. New Hire Onboarding" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Modules ({trainingForm.modules.length})</label>
                  <div className="template-subtask-list">
                    {trainingForm.modules.map((mod, i) => (
                      <div key={mod.id} className="template-subtask-edit">
                        <span className="template-subtask-edit__num">{i + 1}</span>
                        <input type="text" className="form-input template-subtask-edit__input" value={mod.text}
                          onChange={(e) => {
                            const updated = [...trainingForm.modules];
                            updated[i] = { ...updated[i], text: e.target.value };
                            setTrainingForm({ ...trainingForm, modules: updated });
                          }}
                        />
                        <button type="button" className="btn btn--icon btn--sm" onClick={() => removeModule(mod.id)}><X size={14} /></button>
                      </div>
                    ))}
                    <div className="template-subtask-add">
                      <PlusCircle size={14} />
                      <input type="text" className="form-input" value={newModuleText} onChange={(e) => setNewModuleText(e.target.value)}
                        placeholder="Add module..."
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModule(); } }}
                      />
                      <button type="button" className="btn btn--secondary btn--sm" onClick={addModule}>Add</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowTrainingModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">{editingProgram ? 'Save Changes' : 'Create Program'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== ASSIGN TRAINING MODAL ===== */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Assign Training</h2>
              <button className="btn btn--icon" onClick={() => setShowAssignModal(null)}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Select an employee to assign to: <strong>{locationPrograms.find((p) => p.id === showAssignModal)?.name}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">Employee</label>
                <select className="form-input" value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)}>
                  <option value="">Select employee...</option>
                  {locationEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
            </div>
            <div className="modal__footer">
              <div className="modal__footer-right">
                <button type="button" className="btn btn--secondary" onClick={() => setShowAssignModal(null)}>Cancel</button>
                <button type="button" className="btn btn--primary" disabled={!assignEmployeeId} onClick={() => handleAssignTraining(showAssignModal)}>Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SURVEY TEMPLATE MODAL ===== */}
      {showSurveyModal && (
        <div className="modal-overlay" onClick={() => setShowSurveyModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{editingSurvey ? 'Edit Survey' : 'New Survey Template'}</h2>
              <button className="btn btn--icon" onClick={() => setShowSurveyModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveSurvey}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Survey Name</label>
                  <input type="text" className="form-input" value={surveyForm.name} onChange={(e) => setSurveyForm({ ...surveyForm, name: e.target.value })} placeholder="e.g. 30-Day Check-in" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Survey Type</label>
                  <div className="survey-type-selector">
                    <button type="button" className={`template-type-btn ${surveyForm.type === 'new_hire' ? 'template-type-btn--active' : ''}`} onClick={() => setSurveyForm({ ...surveyForm, type: 'new_hire' })}>
                      <UserPlus size={16} /> New Hire
                    </button>
                    <button type="button" className={`template-type-btn ${surveyForm.type === 'periodic' ? 'template-type-btn--active' : ''}`} onClick={() => setSurveyForm({ ...surveyForm, type: 'periodic' })}>
                      <Clock size={16} /> Periodic
                    </button>
                  </div>
                </div>
                {surveyForm.type === 'new_hire' && (
                  <div className="form-group">
                    <label className="form-label">Send after how many days from hire?</label>
                    <input type="number" className="form-input" value={surveyForm.triggerDays} onChange={(e) => setSurveyForm({ ...surveyForm, triggerDays: e.target.value })} min="1" />
                    <span className="form-hint">Survey will be triggered X days after the employee's hire date.</span>
                  </div>
                )}
                {surveyForm.type === 'periodic' && (
                  <div className="form-group">
                    <label className="form-label">Send every (days)</label>
                    <input type="number" className="form-input" value={surveyForm.intervalDays} onChange={(e) => setSurveyForm({ ...surveyForm, intervalDays: e.target.value })} min="1" />
                    <span className="form-hint">Survey will be sent to all team members at this interval.</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Questions ({surveyForm.questions.length})</label>
                  <div className="template-subtask-list">
                    {surveyForm.questions.map((q, i) => (
                      <div key={q.id} className="survey-question-edit">
                        <span className="template-subtask-edit__num">{i + 1}</span>
                        <input type="text" className="form-input template-subtask-edit__input" value={q.text}
                          onChange={(e) => {
                            const updated = [...surveyForm.questions];
                            updated[i] = { ...updated[i], text: e.target.value };
                            setSurveyForm({ ...surveyForm, questions: updated });
                          }}
                        />
                        <select className="survey-question-edit__type" value={q.type} onChange={(e) => {
                          const updated = [...surveyForm.questions];
                          updated[i] = { ...updated[i], type: e.target.value };
                          setSurveyForm({ ...surveyForm, questions: updated });
                        }}>
                          <option value="rating">Rating</option>
                          <option value="text">Text</option>
                        </select>
                        <button type="button" className="btn btn--icon btn--sm" onClick={() => removeQuestion(q.id)}><X size={14} /></button>
                      </div>
                    ))}
                    <div className="survey-question-add">
                      <PlusCircle size={14} />
                      <input type="text" className="form-input" value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="Add question..."
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuestion(); } }}
                        style={{ flex: 1 }}
                      />
                      <select className="survey-question-edit__type" value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)}>
                        <option value="rating">Rating</option>
                        <option value="text">Text</option>
                      </select>
                      <button type="button" className="btn btn--secondary btn--sm" onClick={addQuestion}>Add</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowSurveyModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary">{editingSurvey ? 'Save Changes' : 'Create Survey'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== SEND SURVEY MODAL ===== */}
      {showSendSurvey && (
        <div className="modal-overlay" onClick={() => setShowSendSurvey(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Send Survey</h2>
              <button className="btn btn--icon" onClick={() => setShowSendSurvey(null)}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Send <strong>{showSendSurvey.name}</strong> to an employee.
              </p>
              <div className="form-group">
                <label className="form-label">Employee</label>
                <select className="form-input" value={sendEmployeeId} onChange={(e) => setSendEmployeeId(e.target.value)}>
                  <option value="">Select employee...</option>
                  {locationEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div className="survey-send-preview">
                <p className="survey-send-preview__label">Preview ({showSendSurvey.questions.length} questions)</p>
                {showSendSurvey.questions.map((q, i) => (
                  <div key={q.id} className="survey-send-preview__item">
                    <span>{i + 1}. {q.text}</span>
                    <span className={`survey-question-type survey-question-type--${q.type}`}>
                      {q.type === 'rating' ? <><Star size={10} /> 1-5</> : <><MessageSquare size={10} /> Text</>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal__footer">
              <div className="modal__footer-right">
                <button type="button" className="btn btn--secondary" onClick={() => setShowSendSurvey(null)}>Cancel</button>
                <button type="button" className="btn btn--primary" disabled={!sendEmployeeId} onClick={() => handleSendSurvey(showSendSurvey.id)}>
                  <Send size={14} /> Send Survey
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW RESPONSE MODAL ===== */}
      {viewingResponses && (() => {
        const survey = surveyTemplates.find((s) => s.id === viewingResponses.surveyId);
        const emp = employees.find((e) => e.id === viewingResponses.employeeId);
        if (!survey || !emp) return null;
        return (
          <div className="modal-overlay" onClick={() => setViewingResponses(null)}>
            <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal__header">
                <h2 className="modal__title">Survey Response &mdash; {emp.name}</h2>
                <button className="btn btn--icon" onClick={() => setViewingResponses(null)}><X size={18} /></button>
              </div>
              <div className="modal__body">
                <div className="survey-response-header">
                  <div className="survey-response-header__info">
                    <span className="survey-response-header__avatar" style={{ background: emp.color }}>{getInitials(emp.name)}</span>
                    <div>
                      <strong>{emp.name}</strong>
                      <div className="survey-response-header__meta">
                        {survey.name} &middot; Completed {viewingResponses.completedDate}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="survey-response-answers">
                  {survey.questions.map((q, i) => {
                    const answer = viewingResponses.answers.find((a) => a.questionId === q.id);
                    return (
                      <div key={q.id} className="survey-response-answer">
                        <div className="survey-response-answer__question">
                          <span className="survey-response-answer__num">{i + 1}.</span>
                          {q.text}
                        </div>
                        <div className="survey-response-answer__value">
                          {q.type === 'rating' && answer ? (
                            <div className="survey-rating-display">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star key={n} size={18} className={n <= answer.value ? 'star-filled' : 'star-empty'} />
                              ))}
                              <span className="survey-rating-display__num">{answer.value}/5</span>
                            </div>
                          ) : q.type === 'text' && answer ? (
                            <p className="survey-text-answer">{answer.value}</p>
                          ) : (
                            <span className="survey-no-answer">No response</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal__footer">
                <div className="modal__footer-right">
                  <button type="button" className="btn btn--secondary" onClick={() => setViewingResponses(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
