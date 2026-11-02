import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, TrendingUp, CheckCircle2, 
  Clock, Star, Ticket, ShieldCheck, Loader2, ChevronDown, 
  FileSpreadsheet, AlertCircle, BarChart3, PieChart, LineChart as LineChartIcon,
  X, Eye, ArrowUpRight, Filter
} from 'lucide-react';

// Base URL resolver
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'https://ztech-backend-production-7ad0.up.railway.app';

export default function ReportsPage({ 
  user = { id: null, name: 'Guest', email: '', role: 'Employee' },
  isItStaff: propIsItStaff 
}) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('30d'); // '7d' | 'weekly' | '30d' | 'this_month' | 'all'
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar' | 'pie'
  const [isExporting, setIsExporting] = useState(false);

  // Drilldown Modal State for Trackable/Clickable Chart Nodes
  const [drilldownData, setDrilldownData] = useState(null); // { title: string, tickets: [] }
  const [activeHoverPoint, setActiveHoverPoint] = useState(null);

  const userId = user?.id || user?.user_id || user?.userId || null;
  const userRole = (user?.role || 'Employee').trim().toLowerCase();
  
  const adminRoles = [
    'it', 'system admin', 'admin', 'administrator', 
    'it support', 'it engineer', 'it admin', 'super admin', 'support', 'help desk'
  ];
  
  const isItStaff = propIsItStaff !== undefined 
    ? propIsItStaff 
    : adminRoles.includes(userRole);

  // Fetch tickets directly from backend
  const fetchTickets = useCallback(async () => {
    if (!userId && !isItStaff) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ 
        user_id: userId || '', 
        user_role: user?.role || 'Employee' 
      });
      const response = await fetch(`${API_URL}/tickets?${queryParams.toString()}`);
      const resData = await response.json();
      if (resData.success) {
        setTickets(resData.data || []);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error('Error fetching report ticket data:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.role, isItStaff]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Filter tickets based on weekly/monthly/custom timeframe selection
  const filteredTickets = useMemo(() => {
    const now = new Date();
    return tickets.filter(t => {
      if (!t.created_at) return true;
      const createdAt = new Date(t.created_at);
      if (isNaN(createdAt.getTime())) return true;

      if (dateFilter === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return createdAt >= sevenDaysAgo;
      }
      if (dateFilter === 'weekly') {
        // Current ISO Calendar Week (Monday to Sunday)
        const dayOfWeek = now.getDay() || 7; // Convert Sunday 0 to 7
        const startOfWeek = new Date(now);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        return createdAt >= startOfWeek;
      }
      if (dateFilter === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return createdAt >= thirtyDaysAgo;
      }
      if (dateFilter === 'this_month') {
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  }, [tickets, dateFilter]);

  // Dynamically calculate metrics from filtered live tickets
  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const resolvedTickets = filteredTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
    const resolved = resolvedTickets.length;
    
    // SLA Compliance calculation
    const slaMetCount = filteredTickets.filter(t => (t.sla_status || '').toLowerCase() !== 'breached').length;
    const slaPercentage = total > 0 ? Math.round((slaMetCount / total) * 100) : 100;

    // Average Resolution Time (in minutes)
    let totalMinutes = 0;
    let resolvedWithDates = 0;
    resolvedTickets.forEach(t => {
      if (t.created_at && (t.resolved_at || t.updated_at)) {
        const start = new Date(t.created_at).getTime();
        const end = new Date(t.resolved_at || t.updated_at).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          totalMinutes += (end - start) / (1000 * 60);
          resolvedWithDates++;
        }
      }
    });

    const avgTimeMinutes = resolvedWithDates > 0 ? Math.round(totalMinutes / resolvedWithDates) : 0;
    const formatAvgTime = (mins) => {
      if (mins === 0) return '0m';
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    };

    // Category Breakdown
    const categoriesList = ['Hardware', 'Software', 'Network', 'Access & Accounts', 'Other'];
    const categoryCounts = categoriesList.reduce((acc, cat) => {
      acc[cat] = filteredTickets.filter(t => t.category === cat);
      return acc;
    }, {});

    const getCatPercent = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);

    const categoryColors = {
      'Hardware': '#2563eb', // Blue
      'Software': '#10b981', // Emerald
      'Network': '#a855f7', // Purple
      'Access & Accounts': '#f59e0b', // Amber
      'Other': '#64748b'  // Slate
    };

    return {
      total,
      resolved,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      slaPercentage,
      avgResponseTime: formatAvgTime(avgTimeMinutes),
      categories: categoriesList.map(cat => ({
        name: cat,
        tickets: categoryCounts[cat],
        count: categoryCounts[cat].length,
        percent: getCatPercent(categoryCounts[cat].length),
        color: categoryColors[cat]
      }))
    };
  }, [filteredTickets]);

  // Generate trend time-series data points dynamically
  const trendData = useMemo(() => {
    const days = [];
    const now = new Date();
    const intervalCount = dateFilter === '30d' || dateFilter === 'this_month' ? 12 : 7;
    
    for (let i = intervalCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayCreatedTickets = filteredTickets.filter(t => t.created_at && t.created_at.startsWith(dateStr));
      const dayResolvedTickets = filteredTickets.filter(t => 
        (t.status === 'Resolved' || t.status === 'Closed') && 
        ((t.resolved_at && t.resolved_at.startsWith(dateStr)) || (t.updated_at && t.updated_at.startsWith(dateStr)))
      );

      days.push({ 
        dateStr,
        label, 
        createdCount: dayCreatedTickets.length, 
        resolvedCount: dayResolvedTickets.length,
        createdTickets: dayCreatedTickets,
        resolvedTickets: dayResolvedTickets
      });
    }

    const maxVal = Math.max(...days.map(d => Math.max(d.createdCount, d.resolvedCount)), 5);

    // SVG Line Coordinates
    const createdSvgPoints = days.map((d, index) => {
      const x = (index / (days.length - 1)) * 560 + 20;
      const y = 180 - ((d.createdCount / maxVal) * 150);
      return { x, y, ...d };
    });

    const resolvedSvgPoints = days.map((d, index) => {
      const x = (index / (days.length - 1)) * 560 + 20;
      const y = 180 - ((d.resolvedCount / maxVal) * 150);
      return { x, y, ...d };
    });

    const createdPath = createdSvgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const resolvedPath = resolvedSvgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return {
      days,
      maxVal,
      createdSvgPoints,
      resolvedSvgPoints,
      createdPath,
      resolvedPath
    };
  }, [filteredTickets, dateFilter]);

  // CSV Export Engine
  const handleExportCSV = () => {
    if (!filteredTickets.length) {
      alert('No ticket records available to export.');
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        'Ticket Code',
        'Subject',
        'Requester Name',
        'Requester Email',
        'Category',
        'Priority',
        'Status',
        'SLA Status',
        'Created Date'
      ];

      const csvRows = filteredTickets.map(t => [
        `"${t.ticket_code || t.ticket_id || t.id || ''}"`,
        `"${(t.subject || '').replace(/"/g, '""')}"`,
        `"${(t.requester || t.requester_name || 'User').replace(/"/g, '""')}"`,
        `"${(t.requester_email || '').replace(/"/g, '""')}"`,
        `"${t.category || 'Other'}"`,
        `"${t.priority || 'Medium'}"`,
        `"${t.status || 'New'}"`,
        `"${t.sla_status || 'On Track'}"`,
        `"${t.created_at ? new Date(t.created_at).toLocaleString() : ''}"`
      ]);

      const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `IT_HelpDesk_Report_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isItStaff) {
    return (
      <div className="p-12 text-center space-y-3 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          You do not have administrative privileges to view IT help desk analytics and reports.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans bg-slate-50/50 min-h-screen">
      
      {/* Page Heading & Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 sm:p-6 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">IT Analytics & Reports</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time performance metrics, SLA statistics, and help desk trends.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Chart Type Toggle Buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                chartType === 'line' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Line Chart View"
            >
              <LineChartIcon className="w-4 h-4" />
              <span className="hidden md:inline">Line</span>
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                chartType === 'bar' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Bar Chart View"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">Bar</span>
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                chartType === 'pie' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Distribution View"
            >
              <PieChart className="w-4 h-4" />
              <span className="hidden md:inline">Pie</span>
            </button>
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative">
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)} 
              className="appearance-none bg-slate-50 border border-slate-200/80 pl-9 pr-8 py-2.5 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-600 transition"
            >
              <option value="7d">Last 7 Days</option>
              <option value="weekly">This Week (Mon-Sun)</option>
              <option value="30d">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="all">All Time</option>
            </select>
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Export Button */}
          <button 
            onClick={handleExportCSV} 
            disabled={isExporting || loading || filteredTickets.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border border-blue-600 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white border border-slate-200/80 rounded-3xl shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs font-bold tracking-wide">Calculating live report analytics...</span>
        </div>
      ) : (
        <>
          {/* Metrics Summary Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            
            {/* Total Tickets */}
            <div 
              onClick={() => setDrilldownData({ title: `All Logged Tickets (${dateFilter})`, tickets: filteredTickets })}
              className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tickets</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition"><Ticket className="w-4 h-4" /></div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</div>
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-blue-600 mt-1">
                  <TrendingUp className="w-3 h-3" /> Click to Inspect
                </div>
              </div>
            </div>

            {/* Resolved Tickets */}
            <div 
              onClick={() => setDrilldownData({ 
                title: `Resolved Tickets (${dateFilter})`, 
                tickets: filteredTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed') 
              })}
              className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resolved</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition"><CheckCircle2 className="w-4 h-4" /></div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.resolved}</div>
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 mt-1">
                  <TrendingUp className="w-3 h-3" /> {stats.resolutionRate}% rate
                </div>
              </div>
            </div>

            {/* SLA Compliance */}
            <div 
              onClick={() => setDrilldownData({ 
                title: `SLA Compliant Tickets (${dateFilter})`, 
                tickets: filteredTickets.filter(t => (t.sla_status || '').toLowerCase() !== 'breached') 
              })}
              className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SLA Target</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition"><ShieldCheck className="w-4 h-4" /></div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.slaPercentage}%</div>
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-purple-600 mt-1">
                  Compliance
                </div>
              </div>
            </div>

            {/* Avg. Response Time */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg. Fix Time</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-4 h-4" /></div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.avgResponseTime}</div>
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-600 mt-1">
                  Resolution average
                </div>
              </div>
            </div>

            {/* Customer Satisfaction */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Satisfaction</span>
                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl"><Star className="w-4 h-4" /></div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">4.8 / 5</div>
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 mt-1">
                  User Rating
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Chart Section & Category Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Dynamic Trackable Chart Panel */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6 flex flex-col justify-between relative">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Help Desk Activity Trend</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Click any data node or bar to inspect underlying tickets.</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 px-2.5 py-1 rounded-xl border border-blue-100">
                  {dateFilter.replace('_', ' ')}
                </span>
              </div>

              {/* RENDER CHART SWITCHER */}
              <div className="h-64 relative flex items-end my-2">
                
                {/* Horizontal Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-300 font-semibold">
                  <div className="border-b border-slate-100 w-full flex justify-between"><span>{trendData.maxVal}</span></div>
                  <div className="border-b border-slate-100 w-full flex justify-between"><span>{Math.round(trendData.maxVal / 2)}</span></div>
                  <div className="border-b border-slate-100 w-full flex justify-between"><span>0</span></div>
                </div>

                {/* LINE CHART MODE */}
                {chartType === 'line' && (
                  <div className="relative w-full h-full">
                    <svg className="w-full h-full overflow-visible pt-4 pb-4" preserveAspectRatio="none" viewBox="0 0 600 200">
                      <path d={trendData.createdPath} fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d={trendData.resolvedPath} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                    {/* Clickable Line Chart Nodes */}
                    {trendData.createdSvgPoints.map((pt, idx) => (
                      <div key={`node-${idx}`} className="absolute" style={{ left: `${(idx / (trendData.days.length - 1)) * 92 + 3}%`, bottom: `${(pt.createdCount / trendData.maxVal) * 75 + 10}%` }}>
                        <button
                          onClick={() => setDrilldownData({ title: `Logged Tickets on ${pt.label}`, tickets: pt.createdTickets })}
                          onMouseEnter={() => setActiveHoverPoint({ label: pt.label, created: pt.createdCount, resolved: trendData.resolvedSvgPoints[idx].resolvedCount })}
                          onMouseLeave={() => setActiveHoverPoint(null)}
                          className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md hover:scale-150 transition cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* BAR CHART MODE */}
                {chartType === 'bar' && (
                  <div className="w-full h-full flex items-end justify-between px-2 pt-6 gap-2">
                    {trendData.days.map((day, idx) => (
                      <div 
                        key={idx} 
                        className="flex-1 flex items-end justify-center gap-1 group relative h-full cursor-pointer"
                        onClick={() => setDrilldownData({ title: `All Activity on ${day.label}`, tickets: [...day.createdTickets, ...day.resolvedTickets] })}
                      >
                        {/* Created Bar */}
                        <div 
                          className="w-1/2 bg-blue-600 rounded-t-lg transition-all group-hover:bg-blue-700" 
                          style={{ height: `${(day.createdCount / trendData.maxVal) * 100}%`, minHeight: day.createdCount > 0 ? '6px' : '0' }}
                          title={`Logged: ${day.createdCount}`}
                        />
                        {/* Resolved Bar */}
                        <div 
                          className="w-1/2 bg-emerald-500 rounded-t-lg transition-all group-hover:bg-emerald-600" 
                          style={{ height: `${(day.resolvedCount / trendData.maxVal) * 100}%`, minHeight: day.resolvedCount > 0 ? '6px' : '0' }}
                          title={`Resolved: ${day.resolvedCount}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* PIE / DISTRIBUTION MODE */}
                {chartType === 'pie' && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="relative w-48 h-48 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-[18px] border-blue-600 border-t-emerald-500 border-r-purple-500 border-b-amber-400 animate-spin-slow"></div>
                      <div className="text-center">
                        <span className="text-3xl font-black text-slate-900 block">{stats.total}</span>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Desk Queue</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Dynamic Hover Tooltip Banner */}
              {activeHoverPoint && (
                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
                  <span>Date: {activeHoverPoint.label}</span>
                  <div className="flex gap-4">
                    <span className="text-blue-400">Logged: {activeHoverPoint.created}</span>
                    <span className="text-emerald-400">Resolved: {activeHoverPoint.resolved}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-2.5 h-2.5 bg-blue-600 rounded-full inline-block" /> Logged Tickets
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" /> Resolved Tickets
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-[11px] font-bold text-slate-400 px-2">
                {trendData.days.map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))}
              </div>
            </div>

            {/* Right: Dynamic Interactive Category Breakdown */}
            <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900">Category Distribution</h3>
                <p className="text-[11px] text-slate-400 font-medium">Click any category to filter and inspect related tickets.</p>
              </div>

              <div className="space-y-3 my-auto">
                {stats.categories.map((cat) => (
                  <div 
                    key={cat.name} 
                    onClick={() => setDrilldownData({ title: `${cat.name} Category Tickets`, tickets: cat.tickets })}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100/80 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                      <span className="font-black text-slate-900 group-hover:text-blue-600 transition flex items-center gap-1">
                        {cat.count} ({cat.percent}%) <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.percent}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-right text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Real-Time Synchronized
              </div>
            </div>

          </div>
        </>
      )}

      {/* CLICKABLE TRACKING DRILLDOWN MODAL */}
      {drilldownData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl"><Filter className="w-4 h-4" /></div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{drilldownData.title}</h3>
                  <p className="text-xs text-slate-500">Showing {drilldownData.tickets.length} matching tickets</p>
                </div>
              </div>
              <button onClick={() => setDrilldownData(null)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto divide-y divide-slate-100 text-xs">
              {drilldownData.tickets.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold">No tickets logged for this specific filter point.</div>
              ) : (
                drilldownData.tickets.map((t) => (
                  <div key={t.ticket_id || t.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-3 rounded-2xl transition">
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {t.ticket_code || t.ticket_id || t.id}
                        </span>
                        <span className="font-bold text-slate-900 truncate max-w-sm">{t.subject}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Requester: <strong className="text-slate-700">{t.requester || 'User'}</strong> • Category: {t.category}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        t.status === 'Resolved' || t.status === 'Closed' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-right">
              <button onClick={() => setDrilldownData(null)} className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer">
                Close Inspection
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer Copyright */}
      <div className="text-center py-4 text-[11px] text-slate-400 font-semibold">
        © 2026 Berger Paints IT Support Desk. All rights reserved.
      </div>

    </div>
  );
}