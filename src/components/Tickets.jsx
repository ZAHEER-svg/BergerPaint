import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Ticket, PlusCircle, MoreVertical, ChevronLeft, ChevronRight, Laptop, Globe, 
  Settings as SettingsGear, Lock, ChevronDown, CheckCircle2, AlertTriangle, 
  Clock, Eye, UserCheck, X, HelpCircle, Send, Loader2, Bell, Mail, 
  ShieldCheck, Tag, UserPlus, RefreshCw, ThumbsUp, Wrench, Sparkles, CheckSquare,
  Search, Filter, ArrowUpRight, Zap, Play, Pause, Flame, UserCheck2, ArrowUpCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const buildUrl = (endpoint) => {
  if (!endpoint) return '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${path}`;
};

const formatAvatarUrl = (pic) => {
  if (!pic || typeof pic !== 'string') return null;
  const trimmed = pic.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    return buildUrl(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
  }
  return `data:image/jpeg;base64,${trimmed}`;
};

function CriticalTicketTimer({ ticket, onTogglePause }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(ticket.time_spent || 0);

  useEffect(() => {
    setElapsedSeconds(ticket.time_spent || 0);

    if (ticket.is_paused || ticket.status === 'Resolved' || ticket.status === 'Closed') {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [ticket.time_spent, ticket.is_paused, ticket.status]);

  const formatTime = (secs) => {
    const totalSecs = Math.max(0, secs || 0);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isUnattendedOver1Hour = ticket.status === 'New' && ticket.created_at && ((Date.now() - new Date(ticket.created_at).getTime()) / 1000 >= 3600);

  return (
    <div className="flex flex-col gap-1">
      {isUnattendedOver1Hour && (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-red-600 text-white animate-pulse shadow-xs">
          <Flame className="w-3 h-3 text-yellow-300" />
          <span>UNATTENDED (&gt;1H)</span>
        </div>
      )}

      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-black border ${
        ticket.is_paused 
          ? 'bg-amber-50 text-amber-700 border-amber-200' 
          : isUnattendedOver1Hour 
            ? 'bg-red-50 text-red-700 border-red-300 animate-bounce' 
            : 'bg-red-500/10 text-red-600 border-red-200/60'
      }`}>
        <Clock className={`w-3.5 h-3.5 ${ticket.is_paused ? 'text-amber-500' : 'text-red-500 animate-spin-slow'}`} />
        <span>{formatTime(elapsedSeconds)}</span>
        {ticket.is_paused && <span className="text-[9px] uppercase font-bold text-amber-600">(Paused)</span>}
      </div>
    </div>
  );
}

export default function TicketsPage({ user = { id: null, name: 'Guest', email: '', role: 'Employee' }, searchQuery: propSearchQuery }) {
  const [tickets, setTickets] = useState([]);
  const [usersAvatarMap, setUsersAvatarMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [assigningTicket, setAssigningTicket] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const itemsPerPage = 6;

  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const actionMenuRef = useRef(null);
  const userId = user?.id || user?.user_id || user?.userId || null;
  
  const userRole = (user?.role || 'Employee').trim().toLowerCase();
  const adminRoles = ['it','system admin', 'admin', 'administrator', 'it support', 'it engineer', 'it admin', 'super admin', 'support', 'help desk'];
  const isItStaff = adminRoles.includes(userRole);

  const categoryIcons = { 
    'Hardware': Laptop, 
    'Software': SettingsGear, 
    'Network': Globe, 
    'Access & Accounts': Lock, 
    'Other': HelpCircle 
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) setOpenActionMenuId(null);
    };
    if (openActionMenuId !== null) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openActionMenuId]);

  const fetchUsersAvatars = async () => {
    try {
      const token = localStorage.getItem('berger_token') || sessionStorage.getItem('berger_token') || '';
      const response = await fetch(`${API_URL}/settings/users`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const map = {};
        result.data.forEach(u => {
          const uid = u.id || u.user_id;
          const pic = u.profile_picture || u.profilePic || u.avatar;
          if (uid && pic) {
            map[uid] = formatAvatarUrl(pic);
          }
        });
        setUsersAvatarMap(map);
      }
    } catch (err) {
      console.error('Error fetching users avatar map:', err);
    }
  };

  const fetchTickets = useCallback(async () => {
    if (!userId && !isItStaff) { setTickets([]); setLoading(false); return; }
    setLoading(true);
    try {
      await fetchUsersAvatars();
      const queryParams = new URLSearchParams({ user_id: userId || '', user_role: user?.role || 'Employee' });
      const response = await fetch(`${API_URL}/tickets?${queryParams.toString()}`);
      const resData = await response.json();
      if (resData.success) { setTickets(resData.data || []); } 
      else { setTickets([]); showToast(resData.message || 'Failed to fetch tickets', 'error'); }
    } catch (err) {
      console.error('Error connecting to tickets API:', err);
      showToast('Failed to load live ticket data', 'error');
    } finally { setLoading(false); }
  }, [userId, user?.role, isItStaff]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const getTicketAvatarUrl = (t) => {
    if (!t) return null;
    const reqId = t.requester_id || t.user_id;
    if (reqId && usersAvatarMap[reqId]) return usersAvatarMap[reqId];
    const rawTicketPic = t.profile_picture || t.profilePic || t.avatar || t.requester_avatar;
    const formattedTicketPic = formatAvatarUrl(rawTicketPic);
    if (formattedTicketPic) return formattedTicketPic;
    if (userId && reqId && String(reqId) === String(userId)) {
      const userPropPic = user?.profile_picture || user?.profilePic || user?.avatar;
      const formattedUserProp = formatAvatarUrl(userPropPic);
      if (formattedUserProp) return formattedUserProp;
    }
    return null;
  };

  const fetchSingleTicket = async (ticketCodeOrId) => {
    if (!ticketCodeOrId) return;
    try {
      const queryParams = new URLSearchParams({ user_id: userId || '', user_role: user?.role || 'Employee' });
      const response = await fetch(`${API_URL}/tickets/${encodeURIComponent(ticketCodeOrId)}?${queryParams.toString()}`);
      const resData = await response.json();
      if (resData.success) setSelectedTicket(resData.data);
      else showToast(resData.message || 'Could not fetch ticket details', 'error');
    } catch (err) { showToast('Error loading ticket details', 'error'); }
  };

  const handleUpdateStatus = async (ticketId, newStatus, extraData = {}) => {
    if (!ticketId) return;
    setOpenActionMenuId(null);
    try {
      const response = await fetch(`${API_URL}/tickets/${encodeURIComponent(ticketId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus, 
          user_id: userId,
          user_name: user?.name || 'IT Admin',
          ...extraData 
        }),
      });

      const resData = await response.json();
      if (resData.success) {
        const updatedTicketData = resData.data || {};
        setTickets(prev => prev.map(t => {
          const match = t.ticket_id === ticketId || t.ticket_code === ticketId || t.id === ticketId;
          return match ? { ...t, status: newStatus, ...extraData, ...updatedTicketData } : t;
        }));

        if (selectedTicket && (selectedTicket.ticket_id === ticketId || selectedTicket.ticket_code === ticketId || selectedTicket.id === ticketId)) {
          setSelectedTicket(prev => ({ ...prev, status: newStatus, ...extraData, ...updatedTicketData }));
        }

        if (newStatus === 'Closed') showToast('Resolution confirmed & ticket archived!', 'success');
        else if (newStatus === 'Resolved') showToast('Ticket marked as Resolved. Timer stopped.', 'success');
        else showToast(`Ticket status updated to "${newStatus}"`, 'success');
      } else { showToast(resData.message || 'Failed to update ticket status', 'error'); }
    } catch (err) { showToast('Server error while updating status', 'error'); }
  };

  const handleAssignOrElevate = async (ticketId, assigneeId, isElevated, elevationNotes) => {
    if (!ticketId) return;
    try {
      const response = await fetch(`${API_URL}/tickets/${encodeURIComponent(ticketId)}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to: assigneeId,
          is_elevated: isElevated,
          elevation_notes: elevationNotes,
          user_id: userId
        })
      });

      const resData = await response.json();
      if (resData.success) {
        const updatedTicket = resData.data;
        setTickets(prev => prev.map(t => {
          const match = t.ticket_id === ticketId || t.ticket_code === ticketId || t.id === ticketId;
          return match ? { ...t, ...updatedTicket } : t;
        }));

        if (selectedTicket && (selectedTicket.ticket_id === ticketId || selectedTicket.ticket_code === ticketId || selectedTicket.id === ticketId)) {
          setSelectedTicket(prev => ({ ...prev, ...updatedTicket }));
        }

        showToast(isElevated ? 'Ticket successfully Elevated to Consultant!' : 'Ticket successfully assigned!', 'success');
        setAssigningTicket(null);
      } else {
        showToast(resData.message || 'Failed to update assignment', 'error');
      }
    } catch (err) {
      showToast('Error updating ticket assignment', 'error');
    }
  };

  const handleTogglePauseTimer = async (ticket) => {
    const ticketId = ticket.ticket_id || ticket.ticket_code || ticket.id;
    const newPauseState = !ticket.is_paused;
    setOpenActionMenuId(null);

    try {
      const response = await fetch(`${API_URL}/tickets/${encodeURIComponent(ticketId)}/pause-timer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_paused: newPauseState, user_id: userId })
      });

      const resData = await response.json();
      if (resData.success) {
        setTickets(prev => prev.map(t => {
          const match = t.ticket_id === ticketId || t.ticket_code === ticketId || t.id === ticketId;
          return match ? { ...t, is_paused: newPauseState, ...resData.data } : t;
        }));

        if (selectedTicket) {
          setSelectedTicket(prev => ({ ...prev, is_paused: newPauseState, ...resData.data }));
        }

        showToast(newPauseState ? 'Timer Paused for Critical Ticket' : 'Timer Resumed for Critical Ticket', 'success');
      } else {
        showToast(resData.message || 'Failed to update timer state', 'error');
      }
    } catch (err) {
      showToast('Error toggling ticket timer', 'error');
    }
  };

  const stats = useMemo(() => ({
    total: tickets.length,
    critical: tickets.filter(t => t.priority === 'Critical').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
    closed: tickets.filter(t => t.status === 'Closed').length,
    unattendedCritical: tickets.filter(t => {
      if (t.priority !== 'Critical' || t.status !== 'New' || !t.created_at) return false;
      const elapsed = (Date.now() - new Date(t.created_at).getTime()) / 1000;
      return elapsed >= 3600;
    }).length,
  }), [tickets]);

  const effectiveSearch = propSearchQuery !== undefined ? propSearchQuery : localSearch;

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const search = (effectiveSearch || '').toLowerCase();
      const matchesSearch = (t.subject || '').toLowerCase().includes(search) ||
        (t.ticket_code || t.ticket_id || t.id || '').toLowerCase().includes(search) ||
        (t.requester || '').toLowerCase().includes(search) ||
        (t.assignedTo || '').toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tickets, effectiveSearch, statusFilter, priorityFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage, itemsPerPage]);

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
      case 'New': return 'bg-blue-600 text-white shadow-xs shadow-blue-500/30';
      case 'In Progress': return 'bg-amber-500/15 text-amber-700 border border-amber-300/50';
      case 'Pending': return 'bg-purple-500/15 text-purple-700 border border-purple-300/50';
      case 'Resolved': return 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 animate-pulse';
      case 'Closed': return 'bg-slate-100 text-slate-600 border border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto font-sans bg-slate-50/50 min-h-screen">
      {toast && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-bold transition-all transform animate-bounce ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {isItStaff && stats.unattendedCritical > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><Flame className="w-5 h-5 text-yellow-300" /></div>
            <div>
              <h4 className="font-black text-sm">URGENT: {stats.unattendedCritical} Critical Ticket(s) Unattended!</h4>
              <p className="text-xs text-red-100">These issues have been open for over 1 hour without response. Please assign or set to In Progress.</p>
            </div>
          </div>
          <button 
            onClick={() => { setPriorityFilter('Critical'); setStatusFilter('New'); }}
            className="px-4 py-2 bg-white text-red-600 font-black rounded-xl text-xs hover:bg-red-50 transition cursor-pointer shrink-0"
          >
            Filter Critical
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
              {isItStaff ? 'IT Administrator Dashboard' : 'Self-Service Desk'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-400 font-medium">Real-time Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isItStaff ? 'Support Queue' : 'My Service Tickets'}
          </h1>
          <p className="text-xs text-slate-500 max-w-xl">
            {isItStaff ? 'Manage employee requests, assign specialists, elevate critical issues to consultants, and log resolution details.' : 'Track live progress on your raised issues or submit a new IT service desk ticket.'}
          </p>
        </div>

        <button 
          onClick={() => setIsCreateModalOpen(true)} 
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/25 transition active:scale-95 cursor-pointer z-10 shrink-0"
        >
          <PlusCircle className="w-4 h-4" /> 
          <span>{isItStaff ? 'Log Ticket on Behalf' : 'Create New Ticket'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/70 p-4 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Ticket className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</div>
        </div>

        <div className="bg-white border border-slate-200/70 p-4 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Critical</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.critical}</div>
            {stats.unattendedCritical > 0 && (
              <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                {stats.unattendedCritical} Unattended
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200/70 p-4 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.inProgress}</div>
        </div>

        <div className="bg-white border border-slate-200/70 p-4 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resolved</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.resolved}</div>
        </div>

        <div className="bg-white border border-slate-200/70 p-4 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition col-span-2 sm:col-span-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Closed</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl"><ShieldCheck className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.closed}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 p-3.5 sm:p-4 rounded-3xl shadow-xs space-y-3">
        {propSearchQuery === undefined && (
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by ticket code, subject, requester, or assigned specialist..." 
              value={localSearch} 
              onChange={(e) => { setLocalSearch(e.target.value); setCurrentPage(1); }} 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative shrink-0">
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="appearance-none bg-slate-50 border border-slate-200/80 pl-3.5 pr-8 py-2 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-500">
                <option value="All">Status: All</option>
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative shrink-0">
              <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }} className="appearance-none bg-slate-50 border border-slate-200/80 pl-3.5 pr-8 py-2 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-500">
                <option value="All">Priority: All</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative shrink-0">
              <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }} className="appearance-none bg-slate-50 border border-slate-200/80 pl-3.5 pr-8 py-2 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-500">
                <option value="All">Category: All</option>
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="Access & Accounts">Access & Accounts</option>
                <option value="Other">Other</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {(statusFilter !== 'All' || priorityFilter !== 'All' || categoryFilter !== 'All' || localSearch) && (
            <button onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); setCategoryFilter('All'); setLocalSearch(''); setCurrentPage(1); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 transition px-3 py-1.5 rounded-xl hover:bg-slate-100 shrink-0 flex items-center gap-1 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-bold tracking-wide">Fetching ticket queue...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-16 text-center px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto"><Ticket className="w-6 h-6" /></div>
            <p className="text-sm font-bold text-slate-700">No support tickets found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Try adjusting your filters or search terms to locate specific tickets.</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto min-h-[360px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/60">
                    <th className="py-3.5 px-4 font-bold">Code</th>
                    <th className="py-3.5 px-3 font-bold">Subject</th>
                    <th className="py-3.5 px-3 font-bold">Requester</th>
                    <th className="py-3.5 px-3 font-bold">Assigned Specialist</th>
                    <th className="py-3.5 px-3 font-bold">Priority / Timer</th>
                    <th className="py-3.5 px-3 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedTickets.map((t) => {
                    const CategoryIcon = categoryIcons[t.category] || HelpCircle;
                    const code = t.ticket_code || t.ticket_id || t.id;
                    const reqId = t.requester_id || t.user_id;
                    const isRequester = Boolean(userId && reqId && String(reqId) === String(userId));
                    const avatarUrl = getTicketAvatarUrl(t);

                    return (
                      <tr key={t.ticket_id || code} className="hover:bg-blue-50/30 transition group">
                        <td className="py-4 px-4 font-black text-blue-600">{code}</td>
                        <td className="py-4 px-3 font-bold text-slate-900 max-w-[200px] truncate cursor-pointer group-hover:text-blue-600 transition" onClick={() => fetchSingleTicket(code)}>
                          {t.subject}
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2.5">
                            <AvatarImage ticket={t} url={avatarUrl} sizeClass="w-8 h-8" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 leading-tight truncate">{t.requester || 'User'}</span>
                              <span className="text-[10px] text-slate-400 truncate">{t.requester_email || ''}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-1.5">
                            {t.is_elevated ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                                <ArrowUpCircle className="w-3 h-3 text-purple-600" />
                                {t.assignedTo || 'Consultant'}
                              </span>
                            ) : (
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                {t.assignedTo || 'IT Support Team'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${getPriorityStyle(t.priority)}`}>
                              {t.priority}
                            </span>
                            {t.priority === 'Critical' && (
                              <CriticalTicketTimer ticket={t} />
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${getStatusStyle(t.status)}`}>
                            {t.status === 'Resolved' && <CheckCircle2 className="w-3 h-3 text-white" />}
                            {t.status === 'Resolved' ? 'Resolved' : t.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right relative">
                          <button onClick={() => setOpenActionMenuId(openActionMenuId === code ? null : code)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openActionMenuId === code && (
                            <div ref={actionMenuRef} className="absolute right-4 top-12 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 text-left">
                              <button onClick={() => { setOpenActionMenuId(null); fetchSingleTicket(code); }} className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold cursor-pointer">
                                <Eye className="w-3.5 h-3.5 text-slate-400" /> Inspect Details
                              </button>
                              
                              {isItStaff && (
                                <>
                                  <div className="my-1 border-t border-slate-100"></div>
                                  <span className="px-4 py-1 block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">IT Desk Action</span>
                                  
                                  <button 
                                    onClick={() => { setOpenActionMenuId(null); setAssigningTicket(t); }} 
                                    className="w-full px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-bold cursor-pointer"
                                  >
                                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" /> Assign / Elevate Ticket
                                  </button>

                                  {t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed' && (
                                    <button 
                                      onClick={() => handleTogglePauseTimer(t)} 
                                      className="w-full px-4 py-2 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-bold cursor-pointer"
                                    >
                                      {t.is_paused ? <Play className="w-3.5 h-3.5 text-blue-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
                                      {t.is_paused ? 'Resume Timer' : 'Pause Timer'}
                                    </button>
                                  )}

                                  {t.status !== 'In Progress' && t.status !== 'Closed' && (
                                    <button onClick={() => handleUpdateStatus(t.ticket_id || code, 'In Progress')} className="w-full px-4 py-2 text-xs text-amber-600 hover:bg-amber-50 flex items-center gap-2 font-bold cursor-pointer">
                                      <Clock className="w-3.5 h-3.5" /> Set In Progress
                                    </button>
                                  )}
                                  {t.status !== 'Resolved' && t.status !== 'Closed' && (
                                    <button onClick={() => { setOpenActionMenuId(null); setResolvingTicket(t); }} className="w-full px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 font-bold cursor-pointer">
                                      <Wrench className="w-3.5 h-3.5 text-emerald-600" /> Log Fix & Resolve
                                    </button>
                                  )}
                                </>
                              )}
                              {isRequester && t.status === 'Resolved' && (
                                <>
                                  <div className="my-1 border-t border-slate-100"></div>
                                  <button onClick={() => handleUpdateStatus(t.ticket_id || code, 'Closed')} className="w-full px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-black cursor-pointer">
                                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" /> Confirm & Close
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="block sm:hidden divide-y divide-slate-100">
              {paginatedTickets.map((t) => {
                const code = t.ticket_code || t.ticket_id || t.id;
                const reqId = t.requester_id || t.user_id;
                const isRequester = Boolean(userId && reqId && String(reqId) === String(userId));
                const avatarUrl = getTicketAvatarUrl(t);

                return (
                  <div key={t.ticket_id || code} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-blue-600 text-xs bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
                          {code}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusStyle(t.status)}`}>
                          {t.status}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getPriorityStyle(t.priority)}`}>
                        {t.priority}
                      </span>
                    </div>

                    {t.is_elevated && (
                      <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-xl text-[10px] font-bold border border-purple-200 flex items-center gap-1.5">
                        <ArrowUpCircle className="w-3.5 h-3.5 text-purple-600" />
                        <span>Elevated to Consultant: {t.assignedTo}</span>
                      </div>
                    )}

                    <div>
                      <h4 
                        className="text-xs font-bold text-slate-900 line-clamp-2 cursor-pointer hover:text-blue-600"
                        onClick={() => fetchSingleTicket(code)}
                      >
                        {t.subject}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100/60">
                      <div className="flex items-center gap-2 font-medium min-w-0">
                        <AvatarImage ticket={t} url={avatarUrl} sizeClass="w-6 h-6" />
                        <span className="truncate max-w-[110px] font-semibold text-slate-800">{t.requester || 'User'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => fetchSingleTicket(code)} 
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <p className="text-[11px] font-semibold">
            Showing {filteredTickets.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredTickets.length)} of {filteredTickets.length} items
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
              disabled={currentPage === 1} 
              className="p-1.5 border border-slate-200 rounded-xl hover:bg-white transition text-slate-600 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 px-2">Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
              disabled={currentPage === totalPages} 
              className="p-1.5 border border-slate-200 rounded-xl hover:bg-white transition text-slate-600 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedTicket && (
        <TicketDetailModal 
          ticket={selectedTicket} 
          isItStaff={isItStaff} 
          currentUserId={userId} 
          usersAvatarMap={usersAvatarMap}
          onClose={() => setSelectedTicket(null)} 
          onStatusChange={handleUpdateStatus} 
          onTogglePause={handleTogglePauseTimer}
          onOpenResolveModal={(t) => setResolvingTicket(t)} 
          onOpenAssignModal={(t) => setAssigningTicket(t)}
        />
      )}

      {assigningTicket && (
        <AssignElevateModal 
          ticket={assigningTicket}
          onClose={() => setAssigningTicket(null)}
          onSuccess={(ticketId, assigneeId, isElevated, elevationNotes) => {
            handleAssignOrElevate(ticketId, assigneeId, isElevated, elevationNotes);
          }}
        />
      )}

      {resolvingTicket && (
        <ResolveTicketModal 
          ticket={resolvingTicket} 
          userId={userId} 
          userName={user?.name || 'IT Admin'} 
          onClose={() => setResolvingTicket(null)} 
          onSuccess={(ticketId, extraData) => { handleUpdateStatus(ticketId, 'Resolved', extraData); setResolvingTicket(null); }} 
        />
      )}

      {isCreateModalOpen && (
        <CreateTicketModal 
          user={user} 
          isItStaff={isItStaff} 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={() => { fetchTickets(); showToast('Ticket submitted successfully!'); }} 
        />
      )}
    </div>
  );
}

function AvatarImage({ ticket, url, sizeClass = "w-9 h-9" }) {
  const [hasError, setHasError] = useState(false);
  const name = ticket?.requester || ticket?.name || 'User';
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  if (url && !hasError) {
    return (
      <img 
        src={url} 
        alt={name} 
        onError={() => setHasError(true)}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-slate-100 shadow-xs shrink-0`} 
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-xs ring-2 ring-slate-100 shrink-0`}>
      {initials || 'U'}
    </div>
  );
}

function TicketDetailModal({ ticket, isItStaff, currentUserId, usersAvatarMap, onClose, onStatusChange, onTogglePause, onOpenResolveModal, onOpenAssignModal }) {
  const [updating, setUpdating] = useState(false);
  const reqId = ticket.requester_id || ticket.user_id;
  const avatarUrl = (reqId && usersAvatarMap[reqId]) ? usersAvatarMap[reqId] : formatAvatarUrl(ticket.profile_picture || ticket.avatar);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 sm:hidden"></div>

        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100">
              {ticket.ticket_code || ticket.ticket_id || ticket.id}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              ticket.status === 'Closed' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              {ticket.status}
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AvatarImage ticket={ticket} url={avatarUrl} sizeClass="w-10 h-10" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{ticket.requester || 'Unknown User'}</h4>
                <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 text-slate-400" /> {ticket.requester_email || 'No email associated'}
                </p>
              </div>
            </div>
            <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Specialist</span>
              <span className="font-bold text-slate-800 flex items-center sm:justify-end gap-1 mt-0.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" /> {ticket.assignedTo || 'IT Support Team'}
              </span>
            </div>
          </div>

          {ticket.is_elevated && (
            <div className="p-4 bg-purple-500/10 border border-purple-300 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-purple-950 font-black text-xs">
                <ArrowUpCircle className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Ticket Elevated to Specialist Consultant ({ticket.assignedTo})</span>
              </div>
              <p className="text-xs text-purple-900 bg-white/90 p-3 rounded-xl border border-purple-100 font-medium">
                {ticket.elevation_notes || 'This ticket has been escalated to an external expert consultant for specialized intervention.'}
              </p>
            </div>
          )}

          {ticket.priority === 'Critical' && (
            <div className="p-4 bg-red-50/80 border border-red-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 block">Critical Ticket SLA Timer</span>
                <CriticalTicketTimer ticket={ticket} />
              </div>
              {isItStaff && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                <button 
                  onClick={() => onTogglePause(ticket)}
                  className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  {ticket.is_paused ? <Play className="w-3.5 h-3.5 text-blue-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
                  {ticket.is_paused ? 'Resume Timer' : 'Pause Timer'}
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">{ticket.subject}</h3>
            <div className="flex flex-wrap items-center gap-3 text-slate-500 font-semibold">
              <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5 text-slate-400" /> {ticket.category}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'}</span>
            </div>
            <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl text-slate-700 leading-relaxed font-medium">
              {ticket.description}
            </div>
          </div>

          {(ticket.resolution_notes || ticket.resolution_details) && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  <span>IT Resolution Details & Fix Notes</span>
                </div>
                {ticket.resolved_at && <span className="text-[10px] text-emerald-800 font-semibold">{new Date(ticket.resolved_at).toLocaleString()}</span>}
              </div>
              <p className="text-xs text-slate-800 bg-white/90 p-3 rounded-xl border border-emerald-100/80 leading-relaxed font-medium shadow-xs">
                {ticket.resolution_notes || ticket.resolution_details}
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="text-slate-500 font-semibold text-[11px]">
            SLA Status: <span className="font-black text-emerald-600">{ticket.sla_status || 'Active Tracking'}</span>
          </div>
          {isItStaff && ticket.status !== 'Closed' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onOpenAssignModal(ticket)} 
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" /> Assign / Elevate
              </button>

              {ticket.status !== 'Resolved' && (
                <button disabled={updating} onClick={() => onOpenResolveModal(ticket)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs">
                  <Wrench className="w-3.5 h-3.5" /> Log Fix & Resolve
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

{/* ASSIGN OR ELEVATE MODAL */}
function AssignElevateModal({ ticket, onClose, onSuccess }) {
  const [usersList, setUsersList] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState(ticket.assigned_id || '');
  const [isElevated, setIsElevated] = useState(Boolean(ticket.is_elevated));
  const [elevationNotes, setElevationNotes] = useState(ticket.elevation_notes || '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Requests only IT Admins, Support Engineers, and Consultants
    fetch(`${API_URL}/tickets/users/list?role=admin_only`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setUsersList(data.data);
          if (!selectedAssignee && data.data.length > 0) {
            setSelectedAssignee(data.data[0].user_id);
          }
        }
      })
      .catch(err => console.error('Error fetching admin assignees:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const codeOrId = ticket.ticket_id || ticket.ticket_code || ticket.id;
    setSubmitting(true);
    onSuccess(codeOrId, selectedAssignee, isElevated, elevationNotes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Assign / Elevate Ticket</h3>
              <p className="text-xs text-indigo-800 font-bold truncate max-w-[200px]">{ticket.ticket_code || ticket.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Assign to IT Specialist or Consultant *</label>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 py-2"><Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading IT team directory...</div>
            ) : (
              <select 
                value={selectedAssignee} 
                onChange={(e) => setSelectedAssignee(e.target.value)} 
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 outline-none focus:border-indigo-600 bg-white font-bold text-slate-900 cursor-pointer"
                required
              >
                {usersList.map(u => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name} ({u.role || 'IT Support'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center justify-between p-3.5 bg-purple-50/60 rounded-2xl border border-purple-200">
            <div className="flex items-center gap-2.5">
              <ArrowUpCircle className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <p className="font-extrabold text-purple-950">Elevate Issue to Consultant</p>
                <p className="text-[10px] text-purple-700">Flag this ticket as escalated to an external expert/vendor.</p>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={isElevated} 
              onChange={(e) => setIsElevated(e.target.checked)} 
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer" 
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Elevation & Handover Notes</label>
            <textarea 
              rows={3} 
              value={elevationNotes} 
              onChange={(e) => setElevationNotes(e.target.value)} 
              placeholder="Provide reason for assignment or instructions for the consultant..." 
              className="w-full p-3 rounded-2xl border border-slate-200 outline-none focus:border-indigo-600 text-slate-900 font-medium resize-none" 
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancel</button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-md transition disabled:opacity-50 cursor-pointer">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck2 className="w-4 h-4" />} Save Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResolveTicketModal({ ticket, userId, userName, onClose, onSuccess }) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [notifyRequester, setNotifyRequester] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const quickPresets = [
    "Password reset completed and user login verified.",
    "Hardware replaced/repaired; equipment operating normally.",
    "Software updated/reinstalled and configurations tested.",
    "Network connectivity restored and verified on workstation."
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) return setError('Please provide resolution details.');
    setIsSubmitting(true);
    setError('');
    const codeOrId = ticket.ticket_id || ticket.ticket_code || ticket.id;
    onSuccess(codeOrId, { resolution_notes: resolutionNotes, notify_requester: notifyRequester });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20"><Wrench className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Resolve Ticket: {ticket.ticket_code || ticket.ticket_id || ticket.id}</h3>
              <p className="text-xs text-emerald-800 font-bold truncate max-w-[220px]">{ticket.subject}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick Resolution Templates</label>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset, idx) => (
                <button key={idx} type="button" onClick={() => setResolutionNotes(preset)} className="text-[10px] font-bold bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 px-2.5 py-1 rounded-xl transition cursor-pointer">+ {preset.split(" ")[0]} {preset.split(" ")[1]}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Resolution & Solution Details *</label>
            <textarea rows={4} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Describe the diagnosis, steps taken, hardware/software fixes applied..." className="w-full p-3.5 rounded-2xl border border-slate-200 outline-none focus:border-emerald-600 text-slate-900 font-medium resize-none" required />
          </div>
          <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-emerald-600 shrink-0" />
              <div><p className="font-bold text-slate-900">Notify Requester via Email</p><p className="text-[10px] text-slate-500">Sends instant email with fix notes.</p></div>
            </div>
            <input type="checkbox" checked={notifyRequester} onChange={(e) => setNotifyRequester(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer" />
          </div>
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50 cursor-pointer">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Resolving...</> : <><CheckSquare className="w-4 h-4" /> Mark Ticket as Resolved</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateTicketModal({ user, isItStaff, onClose, onSuccess }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [notifyAdmin, setNotifyAdmin] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [selectedRequesterId, setSelectedRequesterId] = useState(user?.id || user?.user_id || user?.userId || '');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isItStaff) {
      setLoadingUsers(true);
      fetch(`${API_URL}/tickets/users/list`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data && data.data.length > 0) {
            setUsersList(data.data);
            const currentId = user?.id || user?.user_id || user?.userId;
            const match = data.data.find(u => String(u.user_id) === String(currentId));
            setSelectedRequesterId(match ? match.user_id : data.data[0].user_id);
          }
        })
        .catch(err => console.error('Failed to fetch users list:', err))
        .finally(() => setLoadingUsers(false));
    }
  }, [isItStaff, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) return setFormError('Please enter a ticket subject.');
    if (!description.trim()) return setFormError('Please provide issue details.');
    const finalRequesterId = isItStaff ? selectedRequesterId : (user?.id || user?.user_id || user?.userId);
    if (!finalRequesterId) return setFormError('Please select a valid requester for this ticket.');

    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, priority, description, requester_id: finalRequesterId, notify_admin: notifyAdmin })
      });
      const resData = await response.json();
      if (!response.ok || !resData.success) throw new Error(resData.message || 'Failed to submit ticket');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting ticket:', err);
      setFormError(err.message || 'Server error while submitting ticket.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-600/20"><PlusCircle className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-black text-slate-900">{isItStaff ? 'Create Ticket on Behalf of User' : 'Submit Support Request'}</h2>
              <p className="text-xs text-slate-500">{isItStaff ? 'Log a support request for any staff member.' : 'Submit a support request directly to the IT team.'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" /><span>{formError}</span>
            </div>
          )}

          {isItStaff && (
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-2">
              <label className="block font-bold text-slate-900 flex items-center gap-1.5"><UserPlus className="w-4 h-4 text-blue-600" /> Select Requester *</label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-slate-400 py-1"><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> Loading users list...</div>
              ) : (
                <select value={selectedRequesterId} onChange={(e) => setSelectedRequesterId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-blue-200 outline-none focus:border-blue-600 bg-white font-bold text-slate-900 cursor-pointer" required>
                  {usersList.map((u) => (
                    <option key={u.user_id} value={u.user_id}>{u.name} ({u.email || 'No email'} - {u.role || 'Employee'})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Ticket Subject *</label>
            <input type="text" placeholder="e.g. Server down, Main switch offline" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 outline-none focus:border-blue-600 text-slate-900 font-medium" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 outline-none focus:border-blue-600 bg-white font-medium text-slate-800 cursor-pointer">
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="Access & Accounts">Access & Accounts</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Priority Level *</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 outline-none focus:border-blue-600 bg-white font-medium text-slate-800 cursor-pointer">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Detailed Description *</label>
            <textarea rows={4} placeholder="Describe the issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-600 text-slate-900 font-medium resize-none" required />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-blue-600 shrink-0" />
              <div><p className="font-bold text-slate-900">Notify IT Support Team</p><p className="text-[10px] text-slate-500">Dispatches automated email notification.</p></div>
            </div>
            <input type="checkbox" checked={notifyAdmin} onChange={(e) => setNotifyAdmin(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-md transition disabled:opacity-50 cursor-pointer">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Ticket</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}