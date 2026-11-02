import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, Ticket, HardDrive, BookOpen, BarChart3, Users as UsersIcon, Settings, 
  HelpCircle, ChevronDown, LogOut, ChevronLeft 
} from 'lucide-react';
import bergerLogo from '../assets/berger.png';

// Base URL resolver
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000';

const buildUrl = (endpoint) => {
  if (!endpoint) return '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${path}`;
};

// Formats Base64 strings or server static paths into valid image src URLs
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

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isItStaff: propIsItStaff, 
  user = { name: 'Lawal Olawale', email: 'lawalzoheer1@gmail.com', role: 'IT Engineer' },
  onLogout,
  isCollapsed: externalIsCollapsed,
  setIsCollapsed: externalSetIsCollapsed
}) {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  
  const toggleCollapse = () => {
    if (externalSetIsCollapsed) {
      externalSetIsCollapsed(!isCollapsed);
    } else {
      setInternalIsCollapsed(!isCollapsed);
    }
  };

  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Extract and format user avatar from all possible user object properties
  const rawAvatar = user?.avatar || user?.avatarUrl || user?.profile_picture || user?.profilePicture || null;
  const avatarUrl = formatAvatarUrl(rawAvatar);

  const isItStaff = propIsItStaff !== undefined ? propIsItStaff : (
    user.email?.toLowerCase().includes('it') || 
    user.email?.toLowerCase().includes('admin') || 
    user.email?.toLowerCase().endsWith('@bergerpaints.com') || 
    user.email?.toLowerCase() === 'lawalzoheer1@gmail.com' ||
    user.role?.toLowerCase() === 'it' || 
    user.role?.toLowerCase() === 'admin' ||
    user.role?.toLowerCase() === 'it engineer'
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setShowUserMenu(false);
    if (onLogout) {
      onLogout();
    }
  };

  // Helper function to launch mail client with a pre-filled support request
  const handleContactSupportMail = () => {
    const recipient = 'it.support@bergerpaints.com';
    const subject = encodeURIComponent(`IT Support Request - ${user?.name || 'Employee'}`);
    const body = encodeURIComponent(
      `Hello IT Support Team,\n\nI need assistance with the following issue/request:\n\n[Please describe your need or issue here]\n\n---
User Details:
Name: ${user?.name || 'Lawal Olawale'}
Email: ${user?.email || 'lawalzoheer1@gmail.com'}
Role: ${user?.role || 'IT Engineer'}`
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tickets', label: isItStaff ? 'Tickets' : 'My Tickets', icon: Ticket },
    { id: 'assets', label: isItStaff ? 'Assets' : 'My Assets', icon: HardDrive },
    { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
    ...(isItStaff ? [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'users', label: 'Users', icon: UsersIcon },
    ] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      className={`bg-white border-r border-gray-200 flex flex-col justify-between select-none shadow-sm shrink-0 h-screen relative z-30 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Brand Logo Header */}
        <div className={`border-b border-gray-100 flex items-center transition-all duration-300 ${
          isCollapsed 
            ? 'h-24 justify-center flex-col gap-1.5 p-2' 
            : 'h-28 justify-between px-6 gap-3'
        }`}>
          {/* Centered Large Logo Frame */}
          <div className="flex items-center justify-center shrink-0 min-w-0">
            <img 
              src={bergerLogo} 
              alt="Berger Logo" 
              className={`object-contain transition-all duration-300 drop-shadow-sm ${
                isCollapsed ? 'h-10 max-w-[52px]' : 'h-16 w-auto max-w-[180px]'
              }`} 
            />
          </div>

          {/* Sidebar Collapse/Expand Toggle */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition focus:outline-none shrink-0"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation Items - Airy Vertical Spacing */}
        <nav className={`transition-all duration-300 ${isCollapsed ? 'p-3 space-y-2.5' : 'p-4 space-y-2'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-4 py-3.5 rounded-2xl text-sm transition-all duration-200 ${
                  isCollapsed ? 'justify-center px-0' : 'px-4'
                } ${
                  isActive 
                    ? 'bg-blue-50/80 text-blue-600 font-semibold shadow-2xs' 
                    : 'text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`whitespace-nowrap transition-all duration-200 ${
                  isCollapsed ? 'opacity-0 w-0 overflow-hidden hidden' : 'opacity-100'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Extras - Spacious & Modern Padding */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'p-3 space-y-3 pb-5' : 'p-4 space-y-4 pb-6'}`}>
        {/* Help Card */}
        <div className={`bg-gradient-to-b from-blue-50/70 to-blue-50/30 border border-blue-100/80 rounded-2xl transition-all duration-300 ${
          isCollapsed ? 'p-2.5 flex justify-center' : 'p-4'
        }`}>
          {isCollapsed ? (
            <button 
              onClick={handleContactSupportMail}
              title="Need Help? Contact Support via Mail"
              className="p-2 text-blue-600 hover:bg-blue-100/60 rounded-xl transition"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs mb-1.5">
                <HelpCircle className="w-4 h-4" /> Need Help?
              </div>
              <p className="text-[11px] text-gray-500 mb-3.5 leading-relaxed">Our support team is here for you.</p>
              <button 
                onClick={handleContactSupportMail}
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-blue-600 text-xs font-semibold py-2.5 rounded-xl shadow-2xs transition"
              >
                Contact Support
              </button>
            </>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative" ref={menuRef}>
          {showUserMenu && (
            <div className={`absolute bottom-full mb-3 bg-white border border-gray-200/80 rounded-2xl shadow-xl p-2 z-50 animate-fade-in space-y-1 ${
              isCollapsed ? 'left-14 w-52' : 'left-0 w-full'
            }`}>
              <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2.5">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={user?.name || 'User Profile'} 
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-gray-200 shrink-0" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-[11px] shrink-0">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'LO'}
                  </div>
                )}
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{user?.name || 'Lawal Olawale'}</p>
                  <p className="text-[10px] text-gray-400 truncate">{user?.email || 'lawalzoheer1@gmail.com'}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  setActiveTab('settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition"
              >
                <Settings className="w-3.5 h-3.5 text-gray-400" /> Account Settings
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" /> Sign Out
              </button>
            </div>
          )}

          <div 
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={isCollapsed ? user?.name || 'Lawal Olawale' : undefined}
            className={`flex items-center bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/70 rounded-2xl cursor-pointer transition shadow-2xs ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between p-3.5'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={user?.name || 'User Profile'} 
                  className="w-9 h-9 rounded-xl object-cover shadow-md ring-1 ring-black/5 shrink-0" 
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
                  {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'LO'}
                </div>
              )}

              {!isCollapsed && (
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{user?.name || 'Lawal Olawale'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <p className="text-[10px] text-gray-500 truncate font-semibold">
                      {user?.role || (isItStaff ? 'IT Engineer' : 'Employee')}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}