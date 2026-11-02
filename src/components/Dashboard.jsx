import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Ticket, AlertTriangle, Clock, Activity, Eye, FileText, 
  CheckCircle2, TrendingUp, ShieldCheck, Loader2, ArrowUpRight, 
  Plus, RefreshCw, Zap, X, User, Tag, MessageSquare, Flame
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Dashboard({ 
  user = { id: null, name: 'Guest', email: '', role: 'Employee' }, 
  isItStaff: propIsItStaff, 
  searchQuery = '',
  onViewTicket,
  onCreateTicket,
  onNavigateQueue
}) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Identity Resolution
  const userId = user?.id || user?.user_id || user?.userId || null;
  const userRole = (user?.role || 'Employee').trim().toLowerCase();
  
  const adminRoles = [
    'it', 'system admin', 'admin', 'administrator', 
    'it support', 'it engineer', 'it admin', 'super admin', 'support', 'help desk'
  ];
  
  const isItStaff = propIsItStaff !== undefined 
    ? propIsItStaff 
    : adminRoles.includes(userRole);

  // Format Name Function: Strips titles and keeps full name clean
  const formattedDisplayName = useMemo(() => {
    if (!user?.name) return 'User';
    return user.name.replace(/^(mr|mrs|ms|dr|prof)\.?\s+/i, '').trim();
  }, [user?.name]);

  // Fetch Live Tickets
  const fetchTickets = useCallback(async (isSilent = false) => {
    if (!userId && !isItStaff) {
      setTickets([]);
      setLoading(false);
      return;
    }
    
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

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
      console.error('Error fetching dashboard tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, user?.role, isItStaff]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Operational Metrics Computation (Synced with TicketsPage logic)
  const stats = useMemo(() => {
    const total = tickets.length;
    
    const openTickets = tickets.filter(t => t.status === 'New' || t.status === 'In Progress' || t.status === 'Pending');
    const inProgress = tickets.filter(t => t.status === 'In Progress');
    const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
    
    // Critical metrics perfectly synced with Tickets.jsx
    const critical = tickets.filter(t => t.priority === 'Critical').length;
    const criticalActive = tickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;

    const unattendedCritical = tickets.filter(t => {
      if (t.priority !== 'Critical' || t.status !== 'New' || !t.created_at) return false;
      const elapsed = (Date.now() - new Date(t.created_at).getTime()) / 1000;
      return elapsed >= 3600;
    }).length;

    const breachingSoon = tickets.filter(t => (t.sla_status || '').toLowerCase() === 'breaching soon').length;
    const breached = tickets.filter(t => (t.sla_status || '').toLowerCase() === 'breached').length;
    const withinSLA = Math.max(0, total - breachingSoon - breached);
    const slaPercentage = total > 0 ? Math.round((withinSLA / total) * 100) : 100;

    let totalMinutes = 0;
    let resolvedCount = 0;
    resolved.forEach(t => {
      if (t.created_at && (t.resolved_at || t.updated_at)) {
        const start = new Date(t.created_at).getTime();
        const end = new Date(t.resolved_at || t.updated_at).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          totalMinutes += (end - start) / (1000 * 60);
          resolvedCount++;
        }
      }
    });

    const avgMins = resolvedCount > 0 ? Math.round(totalMinutes / resolvedCount) : 0;
    const formattedAvgTime = avgMins === 0 
      ? 'N/A' 
      : avgMins < 60 
        ? `${avgMins}m` 
        : `${(avgMins / 60).toFixed(1)}h`;

    return {
      totalOpen: openTickets.length,
      critical,
      criticalActive,
      unattendedCritical,
      inProgressCount: inProgress.length,
      resolvedCount: resolved.length,
      avgResolutionTime: formattedAvgTime,
      withinSLA,
      breachingSoon,
      breached,
      total,
      slaPercentage
    };
  }, [tickets]);

  const formatTimeAgo = useCallback((dateStr) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Recently';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 30) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  // Chronological Activity Timeline
  const recentActivities = useMemo(() => {
    if (!tickets.length) return [];
    
    const events = [];

    tickets.forEach((t) => {
      const code = t.ticket_code || t.ticket_id || (t.id ? `#TK-${t.id}` : '#TK-REQ');
      const requester = t.requester || t.requester_name || 'Staff Member';
      const subject = t.subject || 'Support Ticket';

      if (t.created_at) {
        events.push({
          id: `create-${t.id || code}`,
          rawTicket: t,
          timestamp: new Date(t.created_at).getTime(),
          rawDate: t.created_at,
          title: `Ticket Created (${code})`,
          desc: `${requester} submitted: "${subject}"`,
          icon: FileText,
          color: 'text-blue-600 bg-blue-50 border-blue-200/60'
        });
      }

      if ((t.status === 'Resolved' || t.status === 'Closed') && (t.resolved_at || t.updated_at)) {
        events.push({
          id: `resolve-${t.id || code}`,
          rawTicket: t,
          timestamp: new Date(t.resolved_at || t.updated_at).getTime(),
          rawDate: t.resolved_at || t.updated_at,
          title: `Ticket Resolved (${code})`,
          desc: `"${subject}" marked resolved`,
          icon: CheckCircle2,
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200/60'
        });
      } 
      
      if (t.status === 'In Progress' && t.updated_at && t.updated_at !== t.created_at) {
        events.push({
          id: `progress-${t.id || code}`,
          rawTicket: t,
          timestamp: new Date(t.updated_at).getTime(),
          rawDate: t.updated_at,
          title: `Under Investigation (${code})`,
          desc: `IT actively handling: "${subject}"`,
          icon: Activity,
          color: 'text-amber-600 bg-amber-50 border-amber-200/60'
        });
      } 
      
      if (t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed') {
        events.push({
          id: `priority-${t.id || code}`,
          rawTicket: t,
          timestamp: new Date(t.updated_at || t.created_at).getTime(),
          rawDate: t.updated_at || t.created_at,
          title: `Critical Priority Flagged (${code})`,
          desc: `Elevated priority level assigned`,
          icon: AlertTriangle,
          color: 'text-red-600 bg-red-50 border-red-200/60'
        });
      }
    });

    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 7);
  }, [tickets]);

  // Search Filter
  const filteredTickets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tickets;
    return tickets.filter(t => {
      const code = (t.ticket_code || t.ticket_id || t.id || '').toString().toLowerCase();
      const subject = (t.subject || '').toLowerCase();
      const requester = (t.requester || t.requester_name || '').toLowerCase();
      const category = (t.category || '').toLowerCase();
      const status = (t.status || '').toLowerCase();
      const priority = (t.priority || '').toLowerCase();

      return code.includes(q) || 
             subject.includes(q) || 
             requester.includes(q) || 
             category.includes(q) ||
             status.includes(q) ||
             priority.includes(q);
    });
  }, [tickets, searchQuery]);

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500/10 text-red-600 border-red-200/60 font-black';
      case 'High': return 'bg-amber-500/10 text-amber-600 border-amber-200/60 font-bold';
      case 'Medium': return 'bg-blue-500/10 text-blue-600 border-blue-200/60 font-semibold';
      default: return 'bg-emerald-500/10 text-emerald-600 border-emerald-200/60 font-semibold';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-600 text-white shadow-sm shadow-blue-500/30';
      case 'In Progress': return 'bg-amber-500/15 text-amber-700 border border-amber-300/50';
      case 'Pending': return 'bg-purple-500/15 text-purple-700 border border-purple-300/50';
      case 'Resolved': return 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30 animate-pulse';
      case 'Closed': return 'bg-slate-100 text-slate-600 border border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="relative p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto font-sans bg-slate-50/50 min-h-screen">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome back, {formattedDisplayName}! 👋
            </h1>
            {isItStaff && (
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-blue-200/60 flex items-center gap-1">
                <Zap className="w-3 h-3 text-blue-600 fill-blue-600" /> IT Admin
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {isItStaff 
              ? "Real-time ticket queue status and IT operations overview." 
              : "Overview and real-time tracking of your IT service requests."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-600 rounded-2xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 font-bold text-xs"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {onCreateTicket && (
            <button 
              onClick={onCreateTicket}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Unattended Critical Warning Banner */}
      {isItStaff && stats.unattendedCritical > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-3xl shadow-lg flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><Flame className="w-5 h-5 text-yellow-300" /></div>
            <div>
              <h4 className="font-black text-sm">URGENT: {stats.unattendedCritical} Critical Ticket(s) Unattended!</h4>
              <p className="text-xs text-red-100">These issues have been open for over 1 hour without response. Please review in queue.</p>
            </div>
          </div>
          {onNavigateQueue && (
            <button 
              onClick={onNavigateQueue}
              className="px-4 py-2 bg-white text-red-600 font-black rounded-xl text-xs hover:bg-red-50 transition cursor-pointer shrink-0"
            >
              Open Queue
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-xs font-bold text-slate-400 tracking-wide">Syncing live dashboard metrics...</span>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          {isItStaff ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={onNavigateQueue}
                className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-xs hover:border-blue-300 hover:shadow-sm transition cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Open Queue</span>
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Ticket className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalOpen}</div>
                <div className="text-[10px] text-blue-600 font-extrabold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Active pending tickets
                </div>
              </div>

              <div 
                onClick={onNavigateQueue}
                className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-xs hover:border-red-300 hover:shadow-sm transition cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Critical Alerts</span>
                  <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-colors"><AlertTriangle className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.critical}</div>
                <div className={`text-[10px] font-extrabold mt-1 flex items-center gap-1 ${stats.critical > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {stats.critical > 0 ? `${stats.criticalActive} active critical` : '✓ All priority normal'}
                </div>
              </div>

              <div 
                onClick={onNavigateQueue}
                className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-xs hover:border-amber-300 hover:shadow-sm transition cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">In Progress</span>
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors"><Activity className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.inProgressCount}</div>
                <div className="text-[10px] text-amber-600 font-extrabold mt-1 flex items-center gap-1">
                  Actively being resolved
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-xs hover:border-emerald-300 transition group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Avg Fix Time</span>
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Clock className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.avgResolutionTime}</div>
                <div className="text-[10px] text-emerald-600 font-extrabold mt-1 flex items-center gap-1">
                  Calculated from live data
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div onClick={onNavigateQueue} className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-3xl shadow-xs hover:border-blue-300 transition cursor-pointer">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Open Tickets</span>
                <div className="text-3xl font-black text-slate-900 mt-2">{stats.totalOpen}</div>
                <div className="text-[11px] text-blue-600 font-extrabold mt-2 flex items-center gap-1">Active requests</div>
              </div>

              <div onClick={onNavigateQueue} className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-3xl shadow-xs hover:border-amber-300 transition cursor-pointer">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">In Progress</span>
                <div className="text-3xl font-black text-slate-900 mt-2">{stats.inProgressCount}</div>
                <div className="text-[11px] text-amber-600 font-extrabold mt-2 flex items-center gap-1">Being worked on</div>
              </div>

              <div onClick={onNavigateQueue} className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-3xl shadow-xs hover:border-emerald-300 transition cursor-pointer">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Resolved</span>
                <div className="text-3xl font-black text-slate-900 mt-2">{stats.resolvedCount}</div>
                <div className="text-[11px] text-emerald-600 font-extrabold mt-2 flex items-center gap-1">Completed requests</div>
              </div>

              <div onClick={onNavigateQueue} className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-3xl shadow-xs hover:border-purple-300 transition cursor-pointer">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Submitted</span>
                <div className="text-3xl font-black text-slate-900 mt-2">{stats.total}</div>
                <div className="text-[11px] text-slate-500 font-extrabold mt-2 flex items-center gap-1">Lifetime total</div>
              </div>
            </div>
          )}

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Tickets Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {isItStaff ? 'Tickets Overview' : 'My Recent Requests'}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">Click any ticket row to view quick details.</p>
                  </div>
                  {filteredTickets.length > 6 && (
                    <span className="text-xs text-blue-600 font-extrabold bg-blue-50 px-3 py-1.5 rounded-xl">
                      Showing 6 of {filteredTickets.length}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="pb-3">Code</th>
                        <th className="pb-3">Subject</th>
                        {isItStaff && <th className="pb-3">Requester</th>}
                        <th className="pb-3">Priority</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Updated</th>
                        {isItStaff && <th className="pb-3">SLA</th>}
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan={isItStaff ? 8 : 6} className="py-12 text-center text-slate-400 font-bold">
                            No tickets match your filter or criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTickets.slice(0, 6).map((t) => {
                          const ticketCode = t.ticket_code || t.ticket_id || (t.id ? `#TK-${t.id}` : '#TK-REQ');
                          const priority = t.priority || 'Medium';
                          const status = t.status || 'New';
                          const slaStatus = t.sla_status || 'On Track';

                          return (
                            <tr 
                              key={t.id || ticketCode} 
                              onClick={() => setSelectedTicket(t)}
                              className="hover:bg-slate-50/80 transition cursor-pointer group"
                            >
                              <td className="py-4 font-black text-blue-600">{ticketCode}</td>
                              <td className="py-4 font-bold text-slate-900 max-w-[180px] truncate">
                                {t.subject}
                              </td>
                              {isItStaff && (
                                <td className="py-4 text-slate-500 font-semibold truncate max-w-[120px]">
                                  {t.requester || t.requester_name || 'Employee'}
                                </td>
                              )}
                              <td className="py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] ${getPriorityStyle(priority)}`}>
                                  {priority}
                                </span>
                              </td>
                              <td className="py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${getStatusStyle(status)}`}>
                                  {status === 'Resolved' && <CheckCircle2 className="w-3 h-3 text-white" />}
                                  {status}
                                </span>
                              </td>
                              <td className="py-4 text-slate-400 font-semibold">{formatTimeAgo(t.updated_at || t.created_at)}</td>
                              {isItStaff && (
                                <td className="py-4">
                                  <span className={`font-black text-[11px] ${
                                    slaStatus.toLowerCase().includes('breach') ? 'text-amber-600' : 'text-emerald-600'
                                  }`}>
                                    {slaStatus}
                                  </span>
                                </td>
                              )}
                              <td className="py-4 text-right">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTicket(t);
                                  }}
                                  className="p-1.5 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                  title="Quick View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center text-xs font-bold text-slate-400">
                <span className="flex items-center gap-2 text-slate-500 font-extrabold text-[11px]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Real-time active connection
                </span>
                {onNavigateQueue && (
                  <button 
                    onClick={onNavigateQueue}
                    className="text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center gap-1 font-extrabold"
                  >
                    View Full Ticket Queue <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* SLA Performance & Live Stream */}
            <div className="space-y-6">
              {isItStaff && (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-slate-900">SLA Performance</h3>
                      <p className="text-[11px] text-slate-400 font-medium">Operational response targets.</p>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center py-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-4xl font-black text-emerald-600 tracking-tight">{stats.slaPercentage}%</div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1">Compliance Rate</p>
                  </div>

                  <div className="space-y-2 text-xs font-bold pt-1 border-t border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span>Within Target</span> 
                      <span className="text-slate-900 font-extrabold">{stats.withinSLA}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Nearing Deadline</span> 
                      <span className="text-amber-600 font-extrabold">{stats.breachingSoon}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Overdue</span> 
                      <span className="text-red-600 font-extrabold">{stats.breached}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Recent Activity</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Live ticket lifecycle events.</p>
                  </div>
                  
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100/80 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Stream
                  </span>
                </div>

                <div className="space-y-3.5">
                  {recentActivities.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 font-bold text-xs">
                      No recent ticket activities logged.
                    </div>
                  ) : (
                    recentActivities.map((act) => {
                      const IconComponent = act.icon;
                      return (
                        <div 
                          key={act.id} 
                          onClick={() => act.rawTicket && setSelectedTicket(act.rawTicket)}
                          className="flex items-start gap-3 text-xs group cursor-pointer hover:bg-slate-50 p-1.5 rounded-2xl transition"
                        >
                          <div className={`p-2 rounded-2xl border shrink-0 mt-0.5 transition ${act.color}`}>
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-extrabold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                {act.title}
                              </p>
                              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                {formatTimeAgo(act.rawDate)}
                              </span>
                            </div>
                            <p className="text-slate-500 font-medium line-clamp-1 mt-0.5 text-[11px]">
                              {act.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        </>
      )}

      {/* Detail Drawer */}
      {selectedTicket && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity duration-300"
          onClick={() => setSelectedTicket(null)}
        >
          <div 
            className="bg-white w-full max-w-lg h-full shadow-2xl p-6 sm:p-8 overflow-y-auto flex flex-col justify-between border-l border-slate-200 transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full">
                    {selectedTicket.ticket_code || selectedTicket.ticket_id || `#TK-${selectedTicket.id}`}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] ${getPriorityStyle(selectedTicket.priority || 'Medium')}`}>
                    {selectedTicket.priority || 'Medium'} Priority
                  </span>
                </div>
                
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition cursor-pointer"
                  title="Close side pane"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                  {selectedTicket.subject || 'No Subject Provided'}
                </h2>
                
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${getStatusStyle(selectedTicket.status || 'New')}`}>
                    Status: {selectedTicket.status || 'New'}
                  </span>
                  
                  {selectedTicket.sla_status && (
                    <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      SLA: {selectedTicket.sla_status}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Description / Issue Details
                </label>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-700 font-medium leading-relaxed max-h-48 overflow-y-auto">
                  {selectedTicket.description || selectedTicket.details || 'No additional detailed summary was attached to this ticket.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
                <div className="bg-slate-50/70 border border-slate-200/70 p-3.5 rounded-2xl">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" /> Requester
                  </div>
                  <div className="font-bold text-slate-800 truncate">
                    {selectedTicket.requester || selectedTicket.requester_name || 'Staff Member'}
                  </div>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/70 p-3.5 rounded-2xl">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" /> Category
                  </div>
                  <div className="font-bold text-slate-800 truncate">
                    {selectedTicket.category || 'General Hardware/IT'}
                  </div>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/70 p-3.5 rounded-2xl col-span-2">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Submission Date
                  </div>
                  <div className="font-bold text-slate-800">
                    {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
              <button 
                onClick={() => setSelectedTicket(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer text-center"
              >
                Close
              </button>

              {onViewTicket && (
                <button 
                  onClick={() => {
                    const t = selectedTicket;
                    setSelectedTicket(null);
                    onViewTicket(t);
                  }}
                  className="w-1/2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Full View</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="text-center py-4 text-[11px] text-slate-400 font-bold border-t border-slate-200/60 mt-8">
        © 2026 Berger Paints IT Support Help Desk. All rights reserved.
      </div>

    </div>
  );
}