import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import * as Papa from 'papaparse';

const App = () => {
  const [csvData, setCsvData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTask, setSelectedTask] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Define internal clients
  const INTERNAL_CLIENTS = ['Onica', 'Rackspace Innovation In Action'];

  // Helper functions for date operations
  const startOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const formatDate = (date, format) => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (format === 'yyyy-MM-dd') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else if (format === 'MMM d, yyyy') {
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } else if (format === 'MMM d') {
      return `${months[d.getMonth()]} ${d.getDate()}`;
    }
    return d.toDateString();
  };

  const differenceInDays = (date1, date2) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
  };

  // Process CSV data to add full name and categorize clients
  const processedData = useMemo(() => {
    return csvData.map(row => ({
      ...row,
      'Full Name': `${row['First Name']} ${row['Last Name']}`,
      'Date': new Date(row['Date']),
      'Hours': parseFloat(row['Hours']) || 0,
      'Is Internal': INTERNAL_CLIENTS.includes(row['Client'])
    }));
  }, [csvData]);

  // Get unique values for filters
  const employees = useMemo(() => {
    const unique = [...new Set(processedData.map(row => row['Full Name']))];
    return unique.sort();
  }, [processedData]);

  const clients = useMemo(() => {
    const unique = [...new Set(processedData.map(row => row['Client']))];
    return unique.filter(Boolean).sort();
  }, [processedData]);

  const projects = useMemo(() => {
    if (selectedClient === 'all') return [];
    const filtered = processedData.filter(row => row['Client'] === selectedClient);
    const unique = [...new Set(filtered.map(row => row['Project']))];
    return unique.filter(Boolean).sort();
  }, [processedData, selectedClient]);

  const tasks = useMemo(() => {
    if (selectedProject === 'all') return [];
    const filtered = processedData.filter(row => row['Project'] === selectedProject);
    const unique = [...new Set(filtered.map(row => row['Task']))];
    return unique.filter(Boolean).sort();
  }, [processedData, selectedProject]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filtered = processedData;
    
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(row => row['Full Name'] === selectedEmployee);
    }
    
    if (selectedClient !== 'all') {
      filtered = filtered.filter(row => row['Client'] === selectedClient);
    }
    
    if (selectedProject !== 'all') {
      filtered = filtered.filter(row => row['Project'] === selectedProject);
    }
    
    if (selectedTask !== 'all') {
      filtered = filtered.filter(row => row['Task'] === selectedTask);
    }
    
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const ranges = {
        'week': 7,
        'month': 30,
        'quarter': 90,
        'year': 365
      };
      const daysBack = ranges[selectedDateRange];
      if (daysBack) {
        filtered = filtered.filter(row => {
          const daysDiff = differenceInDays(now, row['Date']);
          return daysDiff <= daysBack && daysDiff >= 0;
        });
      }
    }
    
    return filtered.sort((a, b) => b['Date'] - a['Date']); // Sort by date descending
  }, [processedData, selectedEmployee, selectedClient, selectedProject, selectedTask, selectedDateRange]);

  // Separate internal and external data
  const internalData = useMemo(() => filteredData.filter(row => row['Is Internal']), [filteredData]);
  const externalData = useMemo(() => filteredData.filter(row => !row['Is Internal']), [filteredData]);

  // Calculate weekly utilization
  const weeklyUtilization = useMemo(() => {
    const weekMap = new Map();
    
    filteredData.forEach(row => {
      const weekStart = startOfWeek(row['Date']);
      const weekKey = formatDate(weekStart, 'yyyy-MM-dd');
      const employee = row['Full Name'];
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, new Map());
      }
      
      const employeeMap = weekMap.get(weekKey);
      if (!employeeMap.has(employee)) {
        employeeMap.set(employee, {
          hours: 0,
          billableHours: 0,
          internalHours: 0,
          externalHours: 0,
          days: new Set()
        });
      }
      
      const stats = employeeMap.get(employee);
      stats.hours += row['Hours'];
      if (row['Billable?'] === 'Yes') {
        stats.billableHours += row['Hours'];
      }
      if (row['Is Internal']) {
        stats.internalHours += row['Hours'];
      } else {
        stats.externalHours += row['Hours'];
      }
      stats.days.add(formatDate(row['Date'], 'yyyy-MM-dd'));
    });
    
    // Convert to sorted array (newest first)
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => new Date(b) - new Date(a));
  }, [filteredData]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalHours = filteredData.reduce((sum, row) => sum + row['Hours'], 0);
    const billableHours = filteredData.reduce((sum, row) => 
      row['Billable?'] === 'Yes' ? sum + row['Hours'] : sum, 0);
    const internalHours = internalData.reduce((sum, row) => sum + row['Hours'], 0);
    const externalHours = externalData.reduce((sum, row) => sum + row['Hours'], 0);
    const uniqueClients = new Set(filteredData.map(row => row['Client'])).size;
    const uniqueProjects = new Set(filteredData.map(row => row['Project'])).size;
    const uniqueDays = new Set(filteredData.map(row => formatDate(row['Date'], 'yyyy-MM-dd'))).size;
    
    return {
      totalHours: totalHours.toFixed(1),
      billableHours: billableHours.toFixed(1),
      internalHours: internalHours.toFixed(1),
      externalHours: externalHours.toFixed(1),
      utilizationRate: totalHours > 0 ? ((billableHours / totalHours) * 100).toFixed(1) : 0,
      internalRate: totalHours > 0 ? ((internalHours / totalHours) * 100).toFixed(1) : 0,
      uniqueClients,
      uniqueProjects,
      avgHoursPerDay: uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : 0
    };
  }, [filteredData, internalData, externalData]);

  // Internal project breakdown
  const internalBreakdown = useMemo(() => {
    const breakdown = {};
    
    internalData.forEach(row => {
      const client = row['Client'];
      const project = row['Project'] || 'No Project';
      const task = row['Task'] || 'No Task';
      
      if (!breakdown[client]) breakdown[client] = {};
      if (!breakdown[client][project]) breakdown[client][project] = {};
      if (!breakdown[client][project][task]) breakdown[client][project][task] = {
        hours: 0,
        billableHours: 0,
        entries: []
      };
      
      breakdown[client][project][task].hours += row['Hours'];
      if (row['Billable?'] === 'Yes') {
        breakdown[client][project][task].billableHours += row['Hours'];
      }
      breakdown[client][project][task].entries.push(row);
    });
    
    return breakdown;
  }, [internalData]);

  // Task word cloud data
  const taskWordCloud = useMemo(() => {
    const taskCounts = {};
    filteredData.forEach(row => {
      if (row['Task']) {
        taskCounts[row['Task']] = (taskCounts[row['Task']] || 0) + row['Hours'];
      }
    });
    
    return Object.entries(taskCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([task, hours]) => ({
        text: task,
        value: hours,
        size: Math.min(Math.max(hours / 10, 12), 48)
      }));
  }, [filteredData]);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setCsvData(results.data.filter(row => row['Date']));
          setLoading(false);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setLoading(false);
        }
      });
    }
  };

  // Toggle row expansion
  const toggleRow = (key) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Utilization Alert Component
  const UtilizationAlert = ({ employee, hours, weekStart }) => {
    const isLow = hours < 30;
    const isHigh = hours > 45;
    
    if (!isLow && !isHigh) return null;
    
    return (
      <div className={`p-4 rounded-lg ${isLow ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center">
          <span className={`text-2xl mr-3 ${isLow ? '⚠️' : '🔥'}`}></span>
          <div>
            <p className={`font-semibold ${isLow ? 'text-yellow-800' : 'text-red-800'}`}>
              {isLow ? 'Low' : 'High'} Utilization Alert
            </p>
            <p className={`text-sm ${isLow ? 'text-yellow-700' : 'text-red-700'}`}>
              {employee} logged {hours.toFixed(1)} hours for week of {formatDate(new Date(weekStart), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Shoutout Component
  const Shoutout = ({ employee, achievement }) => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
      <div className="flex items-center">
        <span className="text-2xl mr-3">🎉</span>
        <div>
          <p className="font-semibold text-blue-800">Shoutout!</p>
          <p className="text-sm text-blue-700">{employee} - {achievement}</p>
        </div>
      </div>
    </div>
  );

  // Chart colors
  const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Harvest Time Entry Analyzer</h1>
              <p className="text-sm text-gray-600 mt-1">Upload and analyze your team's time tracking data</p>
            </div>
            {csvData.length === 0 && (
              <label className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors">
                Upload CSV
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading CSV data...</p>
          </div>
        </div>
      )}

      {!loading && csvData.length === 0 && (
        <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-4 text-gray-600">Upload your Harvest time entries CSV to get started</p>
            <label className="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors">
              Choose File
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {!loading && csvData.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select 
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <select 
                  value={selectedClient}
                  onChange={(e) => {
                    setSelectedClient(e.target.value);
                    setSelectedProject('all');
                    setSelectedTask('all');
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Clients</option>
                  <optgroup label="Internal">
                    {clients.filter(c => INTERNAL_CLIENTS.includes(c)).map(client => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </optgroup>
                  <optgroup label="External">
                    {clients.filter(c => !INTERNAL_CLIENTS.includes(c)).map(client => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              {selectedClient !== 'all' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                  <select 
                    value={selectedProject}
                    onChange={(e) => {
                      setSelectedProject(e.target.value);
                      setSelectedTask('all');
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Projects</option>
                    {projects.map(project => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedProject !== 'all' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
                  <select 
                    value={selectedTask}
                    onChange={(e) => setSelectedTask(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Tasks</option>
                    {tasks.map(task => (
                      <option key={task} value={task}>{task}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select 
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Time</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="quarter">Last 90 Days</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                  Upload New CSV
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {['overview', 'utilization', 'internal', 'insights', 'details'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-6 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab 
                        ? 'border-indigo-500 text-indigo-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <p className="text-sm text-gray-600 mb-2">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalHours}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <p className="text-sm text-gray-600 mb-2">Billable Hours</p>
                  <p className="text-2xl font-bold text-green-600">{stats.billableHours}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.utilizationRate}% utilization</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <p className="text-sm text-gray-600 mb-2">Internal Hours</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.internalHours}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.internalRate}% of total</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <p className="text-sm text-gray-600 mb-2">External Hours</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.externalHours}</p>
                  <p className="text-xs text-gray-500 mt-1">{(100 - parseFloat(stats.internalRate)).toFixed(1)}% of total</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Internal vs External Pie Chart */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Internal vs External Hours</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Internal', value: parseFloat(stats.internalHours) },
                          { name: 'External', value: parseFloat(stats.externalHours) }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}h`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#7C3AED" />
                        <Cell fill="#3B82F6" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Stats Summary */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unique Clients:</span>
                      <span className="font-medium">{stats.uniqueClients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unique Projects:</span>
                      <span className="font-medium">{stats.uniqueProjects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Hours/Day:</span>
                      <span className="font-medium">{stats.avgHoursPerDay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Range:</span>
                      <span className="font-medium">
                        {filteredData.length > 0 
                          ? `${formatDate(filteredData[filteredData.length - 1]['Date'], 'MMM d')} - ${formatDate(filteredData[0]['Date'], 'MMM d, yyyy')}`
                          : 'No data'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Word Cloud */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Cloud</h3>
                <div className="text-center">
                  {taskWordCloud.map((task, index) => (
                    <span
                      key={index}
                      className="inline-block m-1 px-2 py-1 rounded cursor-pointer hover:scale-110 transition-transform"
                      style={{
                        fontSize: `${task.size}px`,
                        color: `hsl(${220 + index * 15}, 70%, ${40 + (index % 3) * 10}%)`,
                        fontWeight: task.size > 24 ? 'bold' : 'normal'
                      }}
                      title={`${task.text}: ${task.value.toFixed(1)} hours`}
                    >
                      {task.text}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recent Shoutouts */}
              <div className="space-y-3">
                {weeklyUtilization.slice(0, 3).map(([weekStart, employeeMap]) => {
                  return Array.from(employeeMap.entries()).map(([employee, stats]) => {
                    if (stats.billableHours / stats.hours > 0.9 && stats.hours >= 35) {
                      return (
                        <Shoutout 
                          key={`${weekStart}-${employee}`}
                          employee={employee}
                          achievement={`${stats.billableHours.toFixed(1)} billable hours (${((stats.billableHours / stats.hours) * 100).toFixed(0)}% utilization) week of ${formatDate(new Date(weekStart), 'MMM d')}`}
                        />
                      );
                    }
                    return null;
                  });
                })}
              </div>
            </div>
          )}

          {/* Utilization Tab */}
          {activeTab === 'utilization' && (
            <div className="space-y-6">
              {/* Utilization Alerts */}
              <div className="space-y-3">
                {weeklyUtilization.map(([weekStart, employeeMap]) => {
                  return Array.from(employeeMap.entries()).map(([employee, stats]) => {
                    if (stats.hours < 30 || stats.hours > 45) {
                      return (
                        <UtilizationAlert 
                          key={`${weekStart}-${employee}`}
                          employee={employee}
                          hours={stats.hours}
                          weekStart={weekStart}
                        />
                      );
                    }
                    return null;
                  });
                })}
              </div>

              {/* Weekly Breakdown */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Week Starting</th>
                        <th className="text-left py-2 px-4">Employee</th>
                        <th className="text-right py-2 px-4">Total</th>
                        <th className="text-right py-2 px-4">Billable</th>
                        <th className="text-right py-2 px-4">Internal</th>
                        <th className="text-right py-2 px-4">External</th>
                        <th className="text-right py-2 px-4">Utilization %</th>
                        <th className="text-right py-2 px-4">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyUtilization.map(([weekStart, employeeMap]) => {
                        return Array.from(employeeMap.entries()).map(([employee, stats]) => (
                          <tr key={`${weekStart}-${employee}`} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-4">{formatDate(new Date(weekStart), 'MMM d, yyyy')}</td>
                            <td className="py-2 px-4">{employee}</td>
                            <td className="text-right py-2 px-4 font-medium">{stats.hours.toFixed(1)}</td>
                            <td className="text-right py-2 px-4 text-green-600">{stats.billableHours.toFixed(1)}</td>
                            <td className="text-right py-2 px-4 text-purple-600">{stats.internalHours.toFixed(1)}</td>
                            <td className="text-right py-2 px-4 text-blue-600">{stats.externalHours.toFixed(1)}</td>
                            <td className="text-right py-2 px-4">
                              <span className={`font-medium ${
                                stats.hours > 0 ? 
                                  (stats.billableHours / stats.hours > 0.8 ? 'text-green-600' : 
                                   stats.billableHours / stats.hours > 0.6 ? 'text-yellow-600' : 'text-red-600')
                                  : 'text-gray-400'
                              }`}>
                                {stats.hours > 0 ? ((stats.billableHours / stats.hours) * 100).toFixed(1) : '0'}%
                              </span>
                            </td>
                            <td className="text-right py-2 px-4">{stats.days.size}</td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Internal Tab */}
          {activeTab === 'internal' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Internal Time Attribution</h3>
                <p className="text-sm text-gray-600 mb-4">Click on any row to expand and see detailed entries</p>
                
                <div className="space-y-4">
                  {Object.entries(internalBreakdown).map(([client, projects]) => (
                    <div key={client} className="border rounded-lg">
                      <div
                        className="bg-purple-50 p-4 cursor-pointer hover:bg-purple-100"
                        onClick={() => toggleRow(`client-${client}`)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">{expandedRows.has(`client-${client}`) ? '▼' : '▶'}</span>
                            <span className="font-semibold text-gray-900">{client}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {Object.values(projects).reduce((sum, projectData) => 
                              sum + Object.values(projectData).reduce((pSum, taskData) => 
                                pSum + taskData.hours, 0), 0).toFixed(1)} hours
                          </div>
                        </div>
                      </div>
                      
                      {expandedRows.has(`client-${client}`) && (
                        <div className="border-t">
                          {Object.entries(projects).map(([project, tasks]) => (
                            <div key={project} className="ml-4">
                              <div
                                className="bg-gray-50 p-3 cursor-pointer hover:bg-gray-100 border-l-4 border-purple-300"
                                onClick={() => toggleRow(`project-${client}-${project}`)}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-400">{expandedRows.has(`project-${client}-${project}`) ? '▼' : '▶'}</span>
                                    <span className="font-medium">{project}</span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {Object.values(tasks).reduce((sum, taskData) => sum + taskData.hours, 0).toFixed(1)} hours
                                  </div>
                                </div>
                              </div>
                              
                              {expandedRows.has(`project-${client}-${project}`) && (
                                <div className="ml-4">
                                  {Object.entries(tasks).map(([task, data]) => (
                                    <div key={task} className="bg-white p-2 border-l-4 border-gray-200">
                                      <div
                                        className="cursor-pointer hover:bg-gray-50 p-2"
                                        onClick={() => toggleRow(`task-${client}-${project}-${task}`)}
                                      >
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center space-x-2">
                                            <span className="text-gray-400">{expandedRows.has(`task-${client}-${project}-${task}`) ? '▼' : '▶'}</span>
                                            <span className="text-sm">{task}</span>
                                          </div>
                                          <div className="text-sm">
                                            <span className="text-gray-600">{data.hours.toFixed(1)}h</span>
                                            {data.billableHours > 0 && (
                                              <span className="text-green-600 ml-2">({data.billableHours.toFixed(1)}h billable)</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {expandedRows.has(`task-${client}-${project}-${task}`) && (
                                        <div className="mt-2 ml-4 text-xs space-y-1">
                                          {data.entries
                                            .sort((a, b) => b['Date'] - a['Date'])
                                            .map((entry, idx) => (
                                              <div key={idx} className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                                                <span>{formatDate(entry['Date'], 'MMM d, yyyy')}</span>
                                                <span>{entry['Full Name']}</span>
                                                <span>{entry['Hours'].toFixed(1)}h</span>
                                                <span className={entry['Billable?'] === 'Yes' ? 'text-green-600' : 'text-gray-400'}>
                                                  {entry['Billable?'] === 'Yes' ? 'Billable' : 'Non-billable'}
                                                </span>
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Internal Hours by Employee */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Internal Hours by Employee</h3>
                <div className="space-y-3">
                  {Object.entries(
                    internalData.reduce((acc, row) => {
                      acc[row['Full Name']] = (acc[row['Full Name']] || 0) + row['Hours'];
                      return acc;
                    }, {})
                  )
                  .sort(([,a], [,b]) => b - a)
                  .map(([employee, hours]) => (
                    <div key={employee} className="flex items-center">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{employee}</span>
                          <span className="text-sm text-gray-600">{hours.toFixed(1)} hours</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${Math.min((hours / parseFloat(stats.internalHours)) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              {/* Client Breakdown */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Hours Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(
                    filteredData.reduce((acc, row) => {
                      acc[row['Client']] = (acc[row['Client']] || 0) + row['Hours'];
                      return acc;
                    }, {})
                  )
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 10)
                  .map(([client, hours]) => {
                    const isInternal = INTERNAL_CLIENTS.includes(client);
                    return (
                      <div key={client} className="flex items-center">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              {client}
                              {isInternal && <span className="ml-2 text-xs text-purple-600">(Internal)</span>}
                            </span>
                            <span className="text-sm text-gray-600">{hours.toFixed(1)} hours</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${isInternal ? 'bg-purple-600' : 'bg-indigo-600'}`}
                              style={{ width: `${Math.min((hours / parseFloat(stats.totalHours)) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Analysis */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Projects by Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(
                    filteredData.reduce((acc, row) => {
                      const key = `${row['Client']} - ${row['Project']}`;
                      if (!acc[key]) {
                        acc[key] = { hours: 0, billable: 0, isInternal: row['Is Internal'] };
                      }
                      acc[key].hours += row['Hours'];
                      if (row['Billable?'] === 'Yes') {
                        acc[key].billable += row['Hours'];
                      }
                      return acc;
                    }, {})
                  )
                  .sort(([,a], [,b]) => b.hours - a.hours)
                  .slice(0, 9)
                  .map(([project, data]) => (
                    <div key={project} className={`rounded-lg p-4 ${data.isInternal ? 'bg-purple-50' : 'bg-gray-50'}`}>
                      <h4 className="font-medium text-gray-900 text-sm mb-2">
                        {project}
                        {data.isInternal && <span className="ml-1 text-xs text-purple-600">(Internal)</span>}
                      </h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium">{data.hours.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Billable:</span>
                          <span className="font-medium text-green-600">{data.billable.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Rate:</span>
                          <span className="font-medium">{data.hours > 0 ? ((data.billable / data.hours) * 100).toFixed(0) : 0}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Trend */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Hours Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={
                    Object.entries(
                      filteredData.reduce((acc, row) => {
                        const month = formatDate(row['Date'], 'MMM yyyy');
                        if (!acc[month]) {
                          acc[month] = { month, internal: 0, external: 0, total: 0 };
                        }
                        acc[month].total += row['Hours'];
                        if (row['Is Internal']) {
                          acc[month].internal += row['Hours'];
                        } else {
                          acc[month].external += row['Hours'];
                        }
                        return acc;
                      }, {})
                    )
                    .map(([, data]) => data)
                    .sort((a, b) => new Date(a.month) - new Date(b.month))
                  }>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#4F46E5" name="Total" />
                    <Line type="monotone" dataKey="internal" stroke="#7C3AED" name="Internal" />
                    <Line type="monotone" dataKey="external" stroke="#3B82F6" name="External" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Billable</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.slice(0, 100).map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(row['Date'], 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row['Full Name']}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row['Client']}
                          {row['Is Internal'] && <span className="ml-1 text-xs text-purple-600">(Int)</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row['Project']}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row['Task']}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row['Hours'].toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            row['Is Internal'] ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {row['Is Internal'] ? 'Internal' : 'External'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {row['Billable?'] === 'Yes' ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredData.length > 100 && (
                <div className="px-6 py-4 bg-gray-50 text-sm text-gray-600 text-center">
                  Showing first 100 of {filteredData.length} entries (sorted by date, newest first)
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;