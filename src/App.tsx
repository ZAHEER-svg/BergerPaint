import React, { useState, useEffect, useRef, useCallback } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TicketsPage from './components/Tickets';
import AssetsPage from './components/AssetsPage';
import KnowledgeBasePage from './components/KnowledgeBasePage';
import ReportsPage from './components/ReportsPage';
import UsersPage from './components/UsersPage';
import SettingsPage from './components/SettingsPage';
import { 
  Search, Bell, PlusCircle, CheckCircle2, AlertTriangle, 
  Ticket, Check, X, ExternalLink
} from 'lucide-react';

export interface User {
  id?: string | number;
  user_id?: string | number;
  name: string;
  email: string;
  role: 'user' | 'it' | 'admin' | string;
  token?: string;
  avatar?: string;
  phone?: string;
  department?: string;
}

export interface NotificationItem {
  id: string;
  ticketCode: string;
  title: string;
  message: string;
  timeAgo: string;
  read: boolean;
  type: 'critical' | 'resolved' | 'new' | 'update';
}

const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes session timeout
const API_URL = import.meta.env.VITE_API_URL || 'https://ztech-backend-production-7ad0.up.railway.app/api';

export default function App() {
  // Initialize user state from localStorage if session is 
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('berger_user');
      const savedTimestamp = localStorage.getItem('berger_session_time');

      if (savedUser && savedTimestamp) {
        const elapsed = Date.now() - parseInt(savedTimestamp, 10);
        if (elapsed < SESSION_TIMEOUT_MS) {
          return JSON.parse(savedUser);
        } else {
          localStorage.removeItem('berger_user');
          localStorage.removeItem('berger_token');
          localStorage.removeItem('berger_session_time');
        }
      }
    } catch (e) {
      console.error('Failed to parse session storage', e);
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNavigating, setIsNavigating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Notification states
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Classy Navigation Loader Handler
  const handleTabChange = useCallback((newTab: string) => {
    if (newTab === activeTab) return;
    setIsNavigating(true);
    setActiveTab(newTab);

    // Smoothly finish loader sweep after view swap
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [activeTab]);

  // Determine IT / Admin privileges dynamically with flexible keyword matching
  const roleStr = user?.role?.toLowerCase() || '';
  const emailStr = user?.email?.toLowerCase() || '';
  const isItStaff = Boolean(
    roleStr.includes('admin') || 
    roleStr.includes('it') || 
    roleStr.includes('support') ||
    roleStr.includes('help desk') ||
    emailStr.includes('it') || 
    emailStr.includes('admin') || 
    emailStr === 'lawalzoheer1@gmail.com'
  );

  const userId = user?.id || user?.user_id;

  // Login handler with token storage
  const handleLoginSuccess = useCallback((userData: User & { token?: string }) => {
    setUser(userData);
    localStorage.setItem('berger_user', JSON.stringify(userData));
    if (userData.token) {
      localStorage.setItem('berger_token', userData.token);
    }
    localStorage.setItem('berger_session_time', Date.now().toString());
  }, []);

  // GLOBAL SETTINGS UPDATE HANDLER
  const handleUserUpdate = useCallback((updatedFields: Partial<User>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const merged = { ...prevUser, ...updatedFields };
      localStorage.setItem('berger_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  // Logout handler
  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('berger_user');
    localStorage.removeItem('berger_token');
    localStorage.removeItem('berger_session_time');
  }, []);

  // Session activity keep-alive monitor
  useEffect(() => {
    if (!user) return;

    const updateSessionActivity = () => {
      localStorage.setItem('berger_session_time', Date.now().toString());
    };

    window.addEventListener('mousemove', updateSessionActivity);
    window.addEventListener('keydown', updateSessionActivity);
    window.addEventListener('click', updateSessionActivity);

    const interval = setInterval(() => {
      const savedTimestamp = localStorage.getItem('berger_session_time');
      if (savedTimestamp) {
        const elapsed = Date.now() - parseInt(savedTimestamp, 10);
        if (elapsed >= SESSION_TIMEOUT_MS) {
          handleLogout();
        }
      }
    }, 30 * 1000);

    return () => {
      window.removeEventListener('mousemove', updateSessionActivity);
      window.removeEventListener('keydown', updateSessionActivity);
      window.removeEventListener('click', updateSessionActivity);
      clearInterval(interval);
    };
  }, [user, handleLogout]);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  // Poll live ticket updates for popover alerts
  const refreshNotificationsFromTickets = useCallback(async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('berger_token') || user.token;
      const queryParams = new URLSearchParams({ 
        user_id: String(userId || ''), 
        user_role: isItStaff ? 'admin' : 'user' 
      });

      const response = await fetch(`${API_URL}/tickets?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      const resData = await response.json();

      if (resData.success && Array.isArray(resData.data)) {
        const rawTickets = resData.data;

        const liveTickets = isItStaff 
          ? rawTickets 
          : rawTickets.filter((t: any) => 
              String(t.user_id || t.requester_id) === String(userId) || 
              t.email?.toLowerCase() === user.email?.toLowerCase()
            );

        const readNotifIds: string[] = JSON.parse(
          localStorage.getItem(`berger_read_notifs_${userId || 'guest'}`) || '[]'
        );

        const generatedNotifs: NotificationItem[] = [];

        liveTickets.forEach((t: any) => {
          const code = t.ticket_code || t.ticket_id || t.id;
          
          // 1. Critical Priority Alerts
          if (t.priority === 'Critical' && t.status !== 'Closed') {
            const notifId = `crit_${code}`;
            generatedNotifs.push({
              id: notifId,
              ticketCode: code,
              title: 'Critical Ticket Alert',
              message: `[${code}] ${t.subject}`,
              timeAgo: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
              read: readNotifIds.includes(notifId),
              type: 'critical',
            });
          }

          // 2. Ticket Resolutions
          if (t.status === 'Resolved') {
            const notifId = `res_${code}`;
            generatedNotifs.push({
              id: notifId,
              ticketCode: code,
              title: isItStaff ? 'Ticket Resolved' : 'Resolution Confirmation Needed',
              message: isItStaff ? `[${code}] marked as resolved.` : `[${code}] IT fixed your ticket! Please confirm & close.`,
              timeAgo: t.resolved_at ? new Date(t.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
              read: readNotifIds.includes(notifId),
              type: 'resolved',
            });
          }

          // 3. Admin / IT Staff Hourly Escalations for Unattended Tickets
          if (isItStaff) {
            const isUnattended = t.status === 'New' && (!t.assigned_to || t.assigned_to === null || t.assigned_to === 'unassigned');

            if (isUnattended) {
              const createdAtMs = t.created_at ? new Date(t.created_at).getTime() : Date.now();
              const elapsedMs = Math.max(0, Date.now() - createdAtMs);
              const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));

              if (elapsedHours >= 1) {
                // Re-trigger alert every hour until ticket is assigned or status changes
                const notifId = `unattended_${code}_${elapsedHours}h`;
                generatedNotifs.push({
                  id: notifId,
                  ticketCode: code,
                  title: `⚠️ Escalation: ${elapsedHours}h Unattended`,
                  message: `[${code}] "${t.subject}" by ${t.requester || 'User'} has not been assigned or responded to for ${elapsedHours} hour${elapsedHours > 1 ? 's' : ''}!`,
                  timeAgo: `${elapsedHours}h ago`,
                  read: readNotifIds.includes(notifId),
                  type: 'critical',
                });
              } else {
                // Initial new ticket alert for the first hour
                const notifId = `new_${code}`;
                generatedNotifs.push({
                  id: notifId,
                  ticketCode: code,
                  title: 'New Support Ticket',
                  message: `[${code}] ${t.subject} by ${t.requester || 'User'}`,
                  timeAgo: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
                  read: readNotifIds.includes(notifId),
                  type: 'new',
                });
              }
            }
          }
        });

        setNotifications(generatedNotifs);
      }
    } catch (err) {
      console.error('Failed to sync live notifications:', err);
    }
  }, [user, userId, isItStaff, handleLogout]);

  useEffect(() => {
    refreshNotificationsFromTickets();
    const interval = setInterval(refreshNotificationsFromTickets, 15000);
    return () => clearInterval(interval);
  }, [refreshNotificationsFromTickets]);

  const markAsRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    const saved: string[] = JSON.parse(localStorage.getItem(`berger_read_notifs_${userId || 'guest'}`) || '[]');
    if (!saved.includes(notifId)) {
      localStorage.setItem(`berger_read_notifs_${userId || 'guest'}`, JSON.stringify([...saved, notifId]));
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    localStorage.setItem(`berger_read_notifs_${userId || 'guest'}`, JSON.stringify(allIds));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    setSearchQuery(notif.ticketCode);
    handleTabChange('tickets');
    setIsNotifOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) {
    return (
      <div key="auth-view" className="animate-pageEntrance">
        <style>{`
          @keyframes pageEntrance {
            0% {
              opacity: 0;
              transform: translateY(12px) scale(0.995);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .animate-pageEntrance {
            animation: pageEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            isItStaff={isItStaff} 
            searchQuery={searchQuery} 
            onNavigateQueue={() => handleTabChange('tickets')}
            onCreateTicket={() => {
              setSearchQuery('');
              handleTabChange('tickets');
            }}
          />
        );
      
      case 'tickets':
        return <TicketsPage user={user} isItStaff={isItStaff} searchQuery={searchQuery} />;
      
      case 'assets':
        return <AssetsPage user={user} isItStaff={isItStaff} searchQuery={searchQuery} />;
      
      case 'kb':
        return <KnowledgeBasePage user={user} isItStaff={isItStaff} searchQuery={searchQuery} />;
      
      case 'reports':
        return isItStaff ? (
          <ReportsPage user={user} isItStaff={isItStaff} />
        ) : (
          <Dashboard user={user} isItStaff={false} searchQuery={searchQuery} onNavigateQueue={() => handleTabChange('tickets')} />
        );

      case 'users':
        return isItStaff ? (
          <UsersPage user={user} isItStaff={isItStaff} searchQuery={searchQuery} />
        ) : (
          <Dashboard user={user} isItStaff={false} searchQuery={searchQuery} onNavigateQueue={() => handleTabChange('tickets')} />
        );

      case 'settings':
        return <SettingsPage user={user} isItStaff={isItStaff} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
      
      default:
        return <Dashboard user={user} isItStaff={isItStaff} searchQuery={searchQuery} onNavigateQueue={() => handleTabChange('tickets')} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden selection:bg-blue-600 selection:text-white relative">
      
      {/* Global CSS Styles for Nav Loader & Page Entrance */}
      <style>{`
        @keyframes navProgressLoader {
          0% {
            width: 0%;
            opacity: 1;
          }
          50% {
            width: 70%;
            opacity: 1;
          }
          100% {
            width: 100%;
            opacity: 0;
          }
        }
        .animate-navLoader {
          animation: navProgressLoader 0.45s ease-in-out forwards;
        }

        @keyframes pageEntrance {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.996);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-pageEntrance {
          animation: pageEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Classy Top Premium Progress Bar Loader */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent overflow-hidden pointer-events-none">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-cyan-400 shadow-[0_0_12px_rgba(37,99,235,0.8)] animate-navLoader rounded-r-full" />
        </div>
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        isItStaff={isItStaff} 
        user={user} 
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 shadow-sm relative z-30">
          <div className="flex items-center gap-4 bg-gray-100 border border-gray-200 px-4 py-2.5 rounded-2xl w-96 shadow-inner focus-within:border-blue-500 transition">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input 
              type="text" 
              placeholder={isItStaff ? "Admin: Search all tickets, assets, users..." : "Search your personal tickets..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-gray-800 w-full placeholder-gray-400 font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative" ref={notifDropdownRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative bg-gray-50 hover:bg-gray-100 border border-gray-200 p-2.5 rounded-2xl text-gray-600 transition shadow-sm cursor-pointer active:scale-95"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full ring-4 ring-white flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-gray-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider">
                        {isItStaff ? "System Notifications" : "My Notifications"}
                      </h3>
                      {unreadCount > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead} 
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <Bell className="w-8 h-8 text-gray-300 mx-auto" />
                        <p className="text-xs font-bold text-gray-500">No active notifications</p>
                        <p className="text-[10px] text-gray-400">Updates on your tickets will appear here.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3.5 flex items-start gap-3 hover:bg-blue-50/50 transition cursor-pointer relative ${
                            !notif.read ? 'bg-blue-50/20' : ''
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {notif.type === 'critical' && (
                              <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            )}
                            {notif.type === 'resolved' && (
                              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            )}
                            {notif.type === 'new' && (
                              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                <Ticket className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs ${!notif.read ? 'font-black text-gray-900' : 'font-bold text-gray-700'} truncate`}>
                                {notif.title}
                              </h4>
                              <span className="text-[10px] text-gray-400 shrink-0">{notif.timeAgo}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 font-medium">
                              {notif.message}
                            </p>
                          </div>

                          {!notif.read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 self-center"></span>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                    <button 
                      onClick={() => { handleTabChange('tickets'); setIsNotifOpen(false); }}
                      className="text-xs font-bold text-gray-600 hover:text-blue-600 transition flex items-center justify-center gap-1.5 w-full cursor-pointer"
                    >
                      <span>{isItStaff ? "Manage All System Tickets" : "View My Support Tickets"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                setSearchQuery('');
                handleTabChange('tickets');
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-lg shadow-blue-600/25 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> New Ticket
            </button>
          </div>
        </header>

        {/* Dynamic Animated View Area */}
        <div className="flex-1 overflow-y-auto">
          <div key={activeTab} className="animate-pageEntrance min-h-full">
            {renderPage()}
          </div>
        </div>
      </div>
    </div>
  );
}