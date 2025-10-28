import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Circle, CheckCircle2, Star, X, Clock, Calendar, Trash2, Edit2, Sparkles } from 'lucide-react';

const WeightedTodoApp = () => {
  const [tasks, setTasks] = useState([]);
  const [lists, setLists] = useState([
    { id: 'my-tasks', name: 'My Tasks', color: '#1a73e8' },
    { id: 'work', name: 'Work', color: '#0f9d58' },
    { id: 'personal', name: 'Personal', color: '#f4b400' }
  ]);
  const [activeListId, setActiveListId] = useState('starred');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [newTask, setNewTask] = useState({
    title: '',
    date: '',
    time: '',
    points: '',
    notes: ''
  });

  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#1a73e8');

  // Request notification permission on load (only once)
  useEffect(() => {
    const hasAskedPermission = localStorage.getItem('notificationAsked');
    
    if ('Notification' in window && Notification.permission === 'default' && !hasAskedPermission) {
      setTimeout(() => {
        if (window.confirm('Enable notifications for task reminders?')) {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Notifications Enabled!', {
                body: 'You will receive reminders for your tasks',
                icon: '/icon-192.png'
              });
            }
            localStorage.setItem('notificationAsked', 'true');
          });
        } else {
          localStorage.setItem('notificationAsked', 'true');
        }
      }, 2000);
    }
    
    // Prevent pull-to-refresh
    document.body.style.overscrollBehavior = 'none';
  }, []);

  useEffect(() => {
    const savedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const savedLists = JSON.parse(localStorage.getItem('lists') || '[]');
    
    if (savedTasks.length > 0) {
      setTasks(savedTasks);
    } else {
      setTasks([
        {
          id: '1',
          listId: 'my-tasks',
          title: 'Review quarterly reports',
          completed: false,
          points: 5,
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          notes: 'Focus on Q4 metrics',
          subtasks: [],
          starred: false
        },
        {
          id: '2',
          listId: 'work',
          title: 'Team standup meeting',
          completed: false,
          points: 2,
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          subtasks: [],
          starred: true
        },
        {
          id: '3',
          listId: 'personal',
          title: 'Grocery shopping',
          completed: false,
          points: 3,
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          subtasks: [],
          starred: false
        }
      ]);
    }
    
    if (savedLists.length > 0) {
      setLists(savedLists);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('lists', JSON.stringify(lists));
  }, [lists]);

  const { totalPoints, earnedPoints, progress } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
    let todayTasks;
    
    if (activeListId === 'starred') {
      todayTasks = tasks.filter((t) => t.starred && t.date === today);
    } else {
      todayTasks = tasks.filter((t) => t.listId === activeListId && t.date === today);
    }
    
    const total = todayTasks.reduce((sum, t) => sum + (parseInt(t.points) || 0), 0);
    const earned = todayTasks.filter((t) => t.completed).reduce((sum, t) => sum + (parseInt(t.points) || 0), 0);
    const prog = total > 0 ? Math.round((earned / total) * 100) : 0;
    return { totalPoints: total, earnedPoints: earned, progress: prog };
  }, [tasks, activeListId]);

  useEffect(() => {
    if (progress === 100 && totalPoints > 0) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);
    }
  }, [progress, totalPoints]);

  const groupedTasks = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().split('T')[0];
    
    let filtered;
    if (activeListId === 'starred') {
      filtered = tasks.filter((t) => t.starred);
    } else {
      filtered = tasks.filter((t) => t.listId === activeListId);
    }
    
    filtered = filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.points !== b.points) return b.points - a.points;
      return (a.title || '').localeCompare(b.title || '');
    });

    return {
      today: filtered.filter((t) => t.date === today),
      tomorrow: filtered.filter((t) => t.date === tomorrow),
      upcoming: filtered.filter((t) => t.date > tomorrow || !t.date),
      overdue: filtered.filter((t) => t.date && t.date < today && !t.completed)
    };
  }, [tasks, activeListId]);

  const addTask = () => {
    if (!newTask.title.trim() || !newTask.points) return;

    const task = {
      id: Date.now().toString(),
      listId: activeListId === 'starred' ? 'my-tasks' : activeListId,
      title: newTask.title,
      completed: false,
      points: newTask.points,
      date: newTask.date,
      time: newTask.time,
      notes: newTask.notes,
      subtasks: [],
      starred: false
    };

    setTasks([...tasks, task]);
    setNewTask({ title: '', date: '', time: '', points: '', notes: '' });
    setShowAddTask(false);

    // Schedule notification if date and time are set
    if (newTask.date && newTask.time) {
      scheduleNotification(task);
    }
  };

  const scheduleNotification = (task) => {
    if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
      const taskDateTime = new Date(`${task.date}T${task.time}`);
      const now = new Date();
      const delay = taskDateTime.getTime() - now.getTime();

      if (delay > 0) {
        navigator.serviceWorker.ready.then(registration => {
          registration.active.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            task: task,
            delay: delay
          });
        });
      }
    }
  };

  const addList = () => {
    if (!newListName.trim()) return;
    
    const newList = {
      id: newListName.toLowerCase().replace(/\s+/g, '-'),
      name: newListName,
      color: newListColor
    };
    
    setLists([...lists, newList]);
    setNewListName('');
    setNewListColor('#1a73e8');
    setShowAddList(false);
  };

  const updateTask = () => {
    if (!editingTask || !editingTask.title.trim()) return;

    setTasks(tasks.map((t) => t.id === editingTask.id ? editingTask : t));
    setEditingTask(null);
    setShowTaskDetail(false);
  };

  const toggleTask = (id) => {
    setTasks(tasks.map((t) => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
    setShowTaskDetail(false);
    setSelectedTask(null);
  };

  const openTaskDetail = (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const toggleStarred = (id) => {
    setTasks(tasks.map((t) => 
      t.id === id ? { ...t, starred: !t.starred } : t
    ));
  };

  const startEditing = (task) => {
    setEditingTask({ ...task });
  };

  const addSubtask = (taskId, subtaskTitle) => {
    if (!subtaskTitle.trim()) return;
    
    setTasks(tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: [...(t.subtasks || []), { id: Date.now().toString(), title: subtaskTitle, completed: false }]
        };
      }
      return t;
    }));
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks(tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map((st) => 
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          )
        };
      }
      return t;
    }));
  };

  const TaskGroup = ({ title, tasks: groupTasks, showCount = true }) => {
    if (groupTasks.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-1">
          {title} {showCount && `(${groupTasks.length})`}
        </h3>
        <div className="space-y-2">
          {groupTasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={toggleTask} onClick={openTaskDetail} />
          ))}
        </div>
      </div>
    );
  };

  const TaskCard = ({ task, onToggle, onClick }) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const completedSubtasks = task.subtasks?.filter((st) => st.completed).length || 0;

    return (
      <div 
        className={`group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer ${task.completed ? 'opacity-60' : ''}`}
        onClick={() => onClick(task)}
      >
        <div className="flex items-start gap-2 md:gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id);
            }}
            className="mt-0.5 flex-shrink-0"
          >
            {task.completed ? (
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            ) : (
              <Circle className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-blue-600" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-xs md:text-sm font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {task.title}
              </p>
              {task.points && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Star className="w-2 h-2 md:w-3 md:h-3" />
                  {task.points}
                </span>
              )}
            </div>

            {task.notes && (
              <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                {task.notes}
              </p>
            )}

            {hasSubtasks && (
              <div className="mb-2 space-y-1">
                {task.subtasks.slice(0, 2).map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 text-xs text-gray-500">
                    {subtask.completed ? (
                      <CheckCircle2 className="w-2 h-2 md:w-3 md:h-3 text-blue-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-2 h-2 md:w-3 md:h-3 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={subtask.completed ? 'line-through' : ''}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
                {task.subtasks.length > 2 && (
                  <span className="text-xs text-gray-400 ml-5">
                    +{task.subtasks.length - 2} more
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 md:gap-3 text-xs text-gray-500">
              {task.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-2 h-2 md:w-3 md:h-3" />
                  {new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {task.time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-2 h-2 md:w-3 md:h-3" />
                  {task.time}
                </span>
              )}
              {hasSubtasks && (
                <span className="text-gray-400">
                  {completedSubtasks}/{task.subtasks.length}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleStarred(task.id);
            }}
            className="flex-shrink-0"
          >
            {task.starred ? (
              <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500" />
            ) : (
              <Star className="w-4 h-4 md:w-5 md:h-5 text-gray-300 group-hover:text-gray-400" />
            )}
          </button>
        </div>
      </div>
    );
  };

  const activeList = activeListId === 'starred' ? { name: 'Starred' } : lists.find((l) => l.id === activeListId);

  return (
    <div className="min-h-screen bg-gray-50 pb-20" style={{ overscrollBehavior: 'none', touchAction: 'pan-y' }}>
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-full shadow-2xl animate-bounce">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="w-6 h-6" />
              100% Complete! Amazing!
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-1">Tasks</h1>
            <p className="text-xs md:text-sm text-gray-500">Weighted to-do list</p>
          </div>

          <div className="flex items-center gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveListId('starred')}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                activeListId === 'starred'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Star className="w-3 h-3 md:w-4 md:h-4" />
              Starred
            </button>
            
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => setActiveListId(list.id)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeListId === list.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full" style={{ backgroundColor: list.color }} />
                {list.name}
              </button>
            ))}

            <button
              onClick={() => setShowAddList(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4" />
              New list
            </button>
          </div>

          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">{activeList?.name}</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                {tasks.filter((t) => activeListId === 'starred' ? t.starred && !t.completed : t.listId === activeListId && !t.completed).length} tasks remaining
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-4 md:mb-6">
            <div className="w-full md:w-[30%] bg-white rounded-2xl shadow-lg border border-gray-100 p-4 md:p-6 flex flex-col items-center justify-center">
              <div className="relative w-24 h-24 md:w-32 md:h-32 mb-2 md:mb-3">
                <svg className="w-24 h-24 md:w-32 md:h-32 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    stroke="#e5e7eb"
                    strokeWidth="6"
                    fill="none"
                    className="md:hidden"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    stroke={progress === 100 ? "#16a34a" : "url(#gradient)"}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500 md:hidden"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                    className="hidden md:block"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={progress === 100 ? "#16a34a" : "url(#gradient)"}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500 hidden md:block"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl md:text-3xl font-bold text-gray-700">{progress}%</span>
                </div>
              </div>
              <p className="text-gray-600 text-xs md:text-sm">
                {earnedPoints}/{totalPoints} points today
              </p>
              {progress === 100 && totalPoints > 0 && (
                <p className="text-green-600 text-xs md:text-sm font-medium mt-2 text-center">
                  🎉 All tasks done!
                </p>
              )}
            </div>

            <div className="w-full md:w-[70%] relative rounded-2xl overflow-hidden shadow-lg h-40 md:h-auto">
              <img
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
                alt="Motivation"
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              <div className="absolute inset-0 bg-black bg-opacity-50"></div>
              
              <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 md:p-8 text-center">
                <p className="text-white text-sm md:text-xl font-semibold italic leading-relaxed drop-shadow-lg">
                  <span className="text-2xl md:text-3xl font-serif">"</span>
                  If your target is 10 miles, aim for the 11th mile.
                  <span className="text-2xl md:text-3xl font-serif">"</span>
                </p>
                <p className="text-blue-100 text-xs md:text-sm mt-2 md:mt-3 font-medium">
                  — Surya Bhai from Businessman
                </p>
              </div>
            </div>
          </div>

          <TaskGroup title="Overdue" tasks={groupedTasks.overdue} />
          <TaskGroup title="Today" tasks={groupedTasks.today} />
          <TaskGroup title="Tomorrow" tasks={groupedTasks.tomorrow} />
          <TaskGroup title="Upcoming" tasks={groupedTasks.upcoming} />

          {((activeListId === 'starred' && tasks.filter((t) => t.starred).length === 0) || 
            (activeListId !== 'starred' && tasks.filter((t) => t.listId === activeListId).length === 0)) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No tasks yet</h3>
              <p className="text-gray-500">Add your first task to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Task Button */}
      <button
        onClick={() => setShowAddTask(true)}
        className="fixed bottom-6 right-6 w-14 h-14 md:w-16 md:h-16 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-110 transition-all duration-200 flex items-center justify-center z-50"
      >
        <Plus className="w-6 h-6 md:w-8 md:h-8" />
      </button>

      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Add new task</h3>
              <button onClick={() => setShowAddTask(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              <input
                type="text"
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontSize: '16px' }}
                autoFocus
              />

              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newTask.date}
                    onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    style={{ fontSize: '16px', colorScheme: 'light' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    style={{ fontSize: '16px', colorScheme: 'light' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Points *
                </label>
                <input
                  type="number"
                  placeholder="Enter points (e.g., 5)"
                  value={newTask.points}
                  onChange={(e) => setNewTask({ ...newTask, points: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontSize: '16px' }}
                  min="0"
                />
              </div>

              <textarea
                placeholder="Notes (optional)"
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontSize: '16px' }}
                rows={3}
              />

              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={() => setShowAddTask(false)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addTask}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {editingTask ? (
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Edit task</h3>
                  <button onClick={() => setEditingTask(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <input
                    type="text"
                    placeholder="Task title"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={editingTask.date}
                      onChange={(e) => setEditingTask({ ...editingTask, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      style={{ fontSize: '16px', colorScheme: 'light' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={editingTask.time}
                      onChange={(e) => setEditingTask({ ...editingTask, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      style={{ fontSize: '16px', colorScheme: 'light' }}
                    />
                  </div>
                </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Points</label>
                    <input
                      type="number"
                      placeholder="Enter points"
                      value={editingTask.points}
                      onChange={(e) => setEditingTask({ ...editingTask, points: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>

                  <textarea
                    placeholder="Notes"
                    value={editingTask.notes}
                    onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />

                  <div className="flex gap-2 md:gap-3">
                    <button
                      onClick={() => setEditingTask(null)}
                      className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateTask}
                      className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save changes
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 md:p-6">
                <div className="flex items-start justify-between mb-4 md:mb-6">
                  <div className="flex items-start gap-2 md:gap-3 flex-1">
                    <button
                      onClick={() => toggleTask(selectedTask.id)}
                      className="mt-1"
                    >
                      {selectedTask.completed ? (
                        <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                      ) : (
                        <Circle className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <h3 className={`text-lg md:text-xl font-semibold mb-2 ${selectedTask.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {selectedTask.title}
                      </h3>
                      {selectedTask.notes && (
                        <p className="text-gray-600 text-xs md:text-sm mb-4">{selectedTask.notes}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-500">
                        {selectedTask.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                            {new Date(selectedTask.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {selectedTask.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 md:w-4 md:h-4" />
                            {selectedTask.time}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
                          {selectedTask.points} points
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 md:gap-2">
                    <button
                      onClick={() => startEditing(selectedTask)}
                      className="p-1.5 md:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                      onClick={() => deleteTask(selectedTask.id)}
                      className="p-1.5 md:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                      onClick={() => setShowTaskDetail(false)}
                      className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                    >
                      <X className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4 md:pt-6">
                  <h4 className="text-xs md:text-sm font-semibold text-gray-900 mb-3 md:mb-4">Subtasks</h4>
                  <div className="space-y-2 mb-3 md:mb-4">
                    {selectedTask.subtasks?.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 md:gap-3 p-2 hover:bg-gray-50 rounded-lg">
                        <button
                          onClick={() => {
                            toggleSubtask(selectedTask.id, subtask.id);
                            // Update the selected task immediately to reflect changes
                            setSelectedTask(prev => ({
                              ...prev,
                              subtasks: prev.subtasks.map(st => 
                                st.id === subtask.id ? { ...st, completed: !st.completed } : st
                              )
                            }));
                          }}
                          className="flex-shrink-0"
                        >
                          {subtask.completed ? (
                            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                          ) : (
                            <Circle className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                          )}
                        </button>
                        <span className={`text-xs md:text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a subtask"
                      id="subtask-input"
                      className="flex-1 px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontSize: '16px' }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('subtask-input');
                        if (input.value.trim()) {
                          addSubtask(selectedTask.id, input.value);
                          input.value = '';
                          // Update selected task to show new subtask
                          const updated = tasks.find((t) => t.id === selectedTask.id);
                          setSelectedTask(updated);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Add new list</h3>
              <button onClick={() => setShowAddList(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              <input
                type="text"
                placeholder="List name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2">
                  {['#1a73e8', '#0f9d58', '#f4b400', '#db4437', '#ab47bc', '#00acc1'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewListColor(color)}
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-full transition-all ${
                        newListColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={() => setShowAddList(false)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addList}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add list
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightedTodoApp;