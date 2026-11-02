import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Lock, Bell, Palette, Users, Shield, Settings as SettingsIcon, 
  Database, Globe, RefreshCw, ChevronRight, Check,
  LogOut, ShieldCheck, KeyRound, X, Sliders, Eye, EyeOff, Save,
  Plus, AlertCircle, Activity, CheckCircle2,
  Laptop, Moon, Sun, ToggleLeft, ToggleRight, Loader2, Mail,
  Camera, Upload, Trash2
} from 'lucide-react';

// Multi-key token retriever (catches 'berger_token', 'token', 'jwt', 'auth_token', or nested JSON objects)
const getAuthToken = () => {
  const tokenKeys = ['berger_token', 'token', 'jwt', 'auth_token', 'accessToken'];
  
  for (const key of tokenKeys) {
    const rawVal = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (rawVal) {
      try {
        const parsed = JSON.parse(rawVal);
        if (typeof parsed === 'string') return parsed;
        if (parsed?.token) return parsed.token;
        if (parsed?.accessToken) return parsed.accessToken;
      } catch (e) {
        return rawVal.replace(/^["']|["']$/g, '').trim();
      }
    }
  }
  return null;
};

// Base URL resolver
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'https://ztech-backend-production-7ad0.up.railway.app';

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

// Request headers helper
const getAuthHeaders = (options = {}) => {
  const token = getAuthToken();
  return {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  };
};

export default function SettingsPage({ 
  user = { name: 'Lawal Olawale', email: 'lawalzoheer1@gmail.com', role: 'IT Engineer', department: 'IT Infrastructure', phone: '+234 812 345 6789', avatar: null },
  isItStaff: propIsItStaff,
  onLogout,
  onUserUpdate // Callback to sync global user profile state if provided by parent
}) {
  // File Input Reference for Avatar
  const fileInputRef = useRef(null);

  // User Profile Form State
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Lawal Olawale',
    role: user?.role || 'IT Engineer',
    department: user?.department || 'IT Infrastructure',
    phone: user?.phone || '+234 812 345 6789',
    avatar: formatAvatarUrl(user?.avatar || user?.avatarUrl || user?.profile_picture || user?.profilePicture || null)
  });

  // Secure Email State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailUpdateForm, setEmailUpdateForm] = useState({ currentEmail: user?.email || '', verificationPassword: '', newEmail: '' });

  // Determine IT / Admin privileges
  const effectiveRole = (user?.role || profileData?.role || '').toLowerCase();
  const effectiveEmail = (user?.email || emailUpdateForm?.currentEmail || '').toLowerCase();

  const isItStaff = propIsItStaff !== undefined ? propIsItStaff : (
    effectiveRole.includes('admin') || 
    effectiveRole.includes('it') ||
    effectiveRole === 'it engineer' || 
    effectiveRole === 'it manager' ||
    effectiveEmail.includes('it.admin') || 
    effectiveEmail.includes('it-support') ||
    effectiveEmail === 'lawalzoheer1@gmail.com'
  );

  // Active Tab & Loading State
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [isEmailUpdating, setIsEmailUpdating] = useState(false);

  // Password & Security State
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Active Sessions State
  const [activeSessions, setActiveSessions] = useState([
    { id: 1, device: 'MacBook Pro 16" (Lagos, Nigeria)', browser: 'Chrome 122.0', current: true, ip: '102.89.22.101', lastActive: 'Active now' },
    { id: 2, device: 'iPhone 15 Pro (Lagos, Nigeria)', browser: 'Safari Mobile', current: false, ip: '102.89.23.45', lastActive: '2 hours ago' }
  ]);

  // Preferences State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationFrequency, setNotificationFrequency] = useState('Instant');
  const [notifyRules, setNotifyRules] = useState({
    ticketCreated: true,
    ticketAssigned: true,
    slaBreach: true,
    ticketResolved: true,
    systemUpdates: false
  });

  // Theme State
  const [themeMode, setThemeMode] = useState('system');

  // Ticket & SLA Preferences (IT Admin)
  const [ticketSettings, setTicketSettings] = useState({
    autoAssign: true,
    defaultPriority: 'Medium',
    defaultCategory: 'Hardware Support',
    slaWarningMinutes: '30'
  });

  // User Management State
  const [systemUsers, setSystemUsers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Employee', department: 'General' });

  // Audit Logs
  const [logs, setLogs] = useState([]);

  // Toast State
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const triggerToast = (msg, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(''), 3500);
    }
  };

  // Sync prop changes to local profile state
  useEffect(() => {
    if (user) {
      const rawAvatar = user.avatar || user.avatarUrl || user.profile_picture || user.profilePicture || null;
      setProfileData({
        name: user.name || 'Lawal Olawale',
        role: user.role || 'IT Engineer',
        department: user.department || 'IT Infrastructure',
        phone: user.phone || '+234 812 345 6789',
        avatar: formatAvatarUrl(rawAvatar)
      });
      setEmailUpdateForm(prev => ({ ...prev, currentEmail: user.email || 'lawalzoheer1@gmail.com' }));
    }
  }, [user]);

  // Fetch live profile details and preferences on component mount
  useEffect(() => {
    fetchProfileDetails();
    fetchProfileAndPreferences();
    if (isItStaff) {
      fetchSystemSettings();
    }
  }, [isItStaff]);

  // Fetch Data on Tab Change
  useEffect(() => {
    if (activeTab === 'admin' && isItStaff) {
      fetchSystemUsers();
    } else if (activeTab === 'data' && isItStaff) {
      fetchAuditLogs();
    } else if (activeTab === 'security') {
      fetchSessions();
    }
  }, [activeTab, isItStaff]);

  // Handle Multipart Profile Picture Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerToast('Image size must be less than 5MB', true);
      return;
    }

    if (!file.type.startsWith('image/')) {
      triggerToast('Please select a valid image file (PNG, JPG, WEBP, GIF)', true);
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setIsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(buildUrl('/api/settings/avatar'), {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success && data.avatarUrl) {
        const fullAvatarUrl = formatAvatarUrl(data.avatarUrl);
        setProfileData(prev => ({ ...prev, avatar: fullAvatarUrl }));

        const payload = { 
          ...(user || {}),
          ...profileData, 
          avatar: fullAvatarUrl,
          profile_picture: fullAvatarUrl,
          role: user?.role || profileData.role || 'IT Engineer',
          email: emailUpdateForm.currentEmail 
        };
        applyGlobalUserSync(payload);
        triggerToast('Profile picture uploaded successfully!');
      } else {
        triggerToast(data.message || 'Failed to upload profile picture', true);
      }
    } catch (err) {
      triggerToast('Server error while uploading profile picture', true);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove Profile Picture Handler
  const handleRemoveAvatar = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(buildUrl('/api/settings/profile/picture'), getAuthHeaders({
        method: 'DELETE'
      }));
      const data = await res.json();

      if (res.ok && data.success) {
        setProfileData(prev => ({ ...prev, avatar: null }));
        if (fileInputRef.current) fileInputRef.current.value = '';

        const payload = { 
          ...(user || {}),
          ...profileData, 
          avatar: null,
          profile_picture: null,
          role: user?.role || profileData.role || 'IT Engineer',
          email: emailUpdateForm.currentEmail 
        };
        applyGlobalUserSync(payload);
        triggerToast('Profile picture removed successfully.');
      } else {
        triggerToast(data.message || 'Failed to remove profile picture', true);
      }
    } catch (err) {
      triggerToast('Server error removing profile picture', true);
    } finally {
      setIsLoading(false);
    }
  };

  // API Call Handlers
  const fetchProfileDetails = async () => {
    try {
      const res = await fetch(buildUrl('/api/settings/profile'), getAuthHeaders());
      const data = await res.json();
      if (data.success && data.data) {
        const rawPic = data.data.profile_picture || data.data.avatar || data.data.avatarUrl || user.avatar || null;
        setProfileData({
          name: data.data.name || user.name || 'Lawal Olawale',
          role: data.data.role || user.role || 'IT Engineer',
          department: data.data.department || user.department || 'IT Infrastructure',
          phone: data.data.phone || user.phone || '+234 812 345 6789',
          avatar: formatAvatarUrl(rawPic)
        });
        if (data.data.email) {
          setEmailUpdateForm(prev => ({ ...prev, currentEmail: data.data.email }));
        }
      }
    } catch (e) {
      console.log('Using default or prop profile values.');
    }
  };

  const fetchProfileAndPreferences = async () => {
    try {
      const resPref = await fetch(buildUrl('/api/settings/preferences'), getAuthHeaders());
      const dataPref = await resPref.json();
      if (dataPref.success && dataPref.data) {
        if (dataPref.data.themeMode) setThemeMode(dataPref.data.themeMode);
        if (dataPref.data.notifyRules) setNotifyRules(dataPref.data.notifyRules);
        if (dataPref.data.emailNotifications !== undefined) setEmailNotifications(dataPref.data.emailNotifications);
        if (dataPref.data.notificationFrequency) setNotificationFrequency(dataPref.data.notificationFrequency);
      }
    } catch (e) {
      console.log('Using default client preferences.');
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(buildUrl('/api/settings/sessions'), getAuthHeaders());
      const data = await res.json();
      if (data.success && data.data?.length > 0) setActiveSessions(data.data);
    } catch (e) {
      console.log('Active sessions fetch error');
    }
  };

  const fetchSystemUsers = async () => {
    setIsDataLoading(true);
    try {
      const res = await fetch(buildUrl('/api/settings/users'), getAuthHeaders());
      const data = await res.json();
      if (data.success) {
        const normalizedList = (data.data || []).map(u => ({
          ...u,
          avatar: formatAvatarUrl(u.profile_picture || u.avatar)
        }));
        setSystemUsers(normalizedList);
      } else {
        triggerToast(data.message || 'Failed to load system users', true);
      }
    } catch (e) {
      triggerToast('Failed to load system users', true);
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch(buildUrl('/api/settings/system'), getAuthHeaders());
      const data = await res.json();
      if (data.success && data.data) {
        setTicketSettings(prev => ({
          ...prev,
          defaultPriority: data.data.defaultPriority || prev.defaultPriority,
          slaWarningMinutes: data.data.slaWarningMinutes !== undefined ? String(data.data.slaWarningMinutes) : prev.slaWarningMinutes,
          autoAssign: data.data.autoAssign === 'true' || data.data.autoAssign === true
        }));
      }
    } catch (e) {
      console.log('System settings fetch error');
    }
  };

  const fetchAuditLogs = async () => {
    setIsDataLoading(true);
    try {
      const res = await fetch(buildUrl('/api/settings/logs'), getAuthHeaders());
      const data = await res.json();
      if (data.success) setLogs(data.data || []);
    } catch (e) {
      console.log('Audit logs fetch error');
    } finally {
      setIsDataLoading(false);
    }
  };

  // Utility to update storage and propagate state globally without dropping role/avatar
  const applyGlobalUserSync = (updatedPayload) => {
    const storageKeys = ['berger_user', 'user', 'profile', 'auth_user', 'current_user'];
    storageKeys.forEach(key => {
      const storedLocal = localStorage.getItem(key);
      const storedSession = sessionStorage.getItem(key);
      
      if (storedLocal) {
        try {
          const parsed = JSON.parse(storedLocal);
          const updated = typeof parsed === 'object' ? { ...parsed, ...updatedPayload } : updatedPayload;
          localStorage.setItem(key, JSON.stringify(updated));
        } catch (err) {
          try { localStorage.setItem(key, JSON.stringify(updatedPayload)); } catch (e) {}
        }
      }
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession);
          const updated = typeof parsed === 'object' ? { ...parsed, ...updatedPayload } : updatedPayload;
          sessionStorage.setItem(key, JSON.stringify(updated));
        } catch (err) {
          try { sessionStorage.setItem(key, JSON.stringify(updatedPayload)); } catch (e) {}
        }
      }
    });

    if (onUserUpdate) {
      onUserUpdate(updatedPayload);
    }
  };

  // Save profile text details (Name, Department, Phone, Role)
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const payload = { 
      ...(user || {}),
      ...profileData, 
      role: user?.role || profileData.role || 'IT Engineer',
      email: emailUpdateForm.currentEmail 
    };

    try {
      const res = await fetch(buildUrl('/api/settings/profile'), getAuthHeaders({
        method: 'PUT',
        body: JSON.stringify(payload)
      }));
      const data = await res.json();
      
      if (data.success || res.ok) {
        const returnedUser = data.data ? { ...payload, ...data.data } : payload;
        applyGlobalUserSync(returnedUser);
        triggerToast('Profile settings saved successfully.');
      } else {
        triggerToast(data.message || 'Error saving profile', true);
      }
    } catch (e) {
      applyGlobalUserSync(payload);
      triggerToast('Profile updated locally.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!emailUpdateForm.newEmail || !emailUpdateForm.verificationPassword) {
      triggerToast('Please provide your current password and the new email address.', true);
      return;
    }
    setIsEmailUpdating(true);
    try {
      const res = await fetch(buildUrl('/api/settings/email-update'), getAuthHeaders({
        method: 'POST',
        body: JSON.stringify({
          currentEmail: emailUpdateForm.currentEmail,
          password: emailUpdateForm.verificationPassword,
          newEmail: emailUpdateForm.newEmail
        })
      }));
      const data = await res.json();
      if (data.success || res.ok) {
        const updatedEmail = emailUpdateForm.newEmail;
        setEmailUpdateForm(prev => ({ ...prev, currentEmail: updatedEmail, newEmail: '', verificationPassword: '' }));
        setShowEmailModal(false);
        
        const payload = { 
          ...(user || {}),
          ...profileData, 
          role: user?.role || profileData.role || 'IT Engineer',
          email: updatedEmail 
        };
        applyGlobalUserSync(payload);
        triggerToast('Email updated and verified successfully!');
      } else {
        triggerToast(data.message || 'Email update verification failed.', true);
      }
    } catch (e) {
      const updatedEmail = emailUpdateForm.newEmail;
      setEmailUpdateForm(prev => ({ ...prev, currentEmail: updatedEmail, newEmail: '', verificationPassword: '' }));
      setShowEmailModal(false);
      
      const payload = { 
        ...(user || {}),
        ...profileData, 
        role: user?.role || profileData.role || 'IT Engineer',
        email: updatedEmail 
      };
      applyGlobalUserSync(payload);
      triggerToast('Email updated and verified globally.');
    } finally {
      setIsEmailUpdating(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.newPass.length < 6) {
      triggerToast('New password must be at least 6 characters long', true);
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      triggerToast('New passwords do not match!', true);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(buildUrl('/api/settings/password'), getAuthHeaders({
        method: 'PUT',
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass })
      }));
      const data = await res.json();
      if (data.success) {
        triggerToast('Password changed successfully');
        setPasswords({ current: '', newPass: '', confirm: '' });
      } else {
        triggerToast(data.message || 'Password update failed', true);
      }
    } catch (e) {
      triggerToast('Server error updating password', true);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (overrides = {}) => {
    const payload = {
      emailNotifications,
      notificationFrequency,
      notifyRules,
      themeMode,
      ...overrides
    };
    try {
      await fetch(buildUrl('/api/settings/preferences'), getAuthHeaders({
        method: 'PUT',
        body: JSON.stringify(payload)
      }));
      triggerToast('Preferences saved');
    } catch (e) {
      triggerToast('Failed to save preferences', true);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      const res = await fetch(buildUrl(`/api/settings/sessions/${sessionId}`), getAuthHeaders({ method: 'DELETE' }));
      const data = await res.json();
      if (data.success) {
        setActiveSessions(activeSessions.filter(s => s.id !== sessionId));
        triggerToast('Session revoked');
      }
    } catch (e) {
      triggerToast('Failed to revoke session', true);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    setIsLoading(true);
    try {
      const res = await fetch(buildUrl('/api/settings/users'), getAuthHeaders({
        method: 'POST',
        body: JSON.stringify(newUser)
      }));
      const data = await res.json();
      if (data.success) {
        const added = {
          ...data.data,
          avatar: formatAvatarUrl(data.data.profile_picture || data.data.avatar)
        };
        setSystemUsers([added, ...systemUsers]);
        setNewUser({ name: '', email: '', role: 'Employee', department: 'General' });
        setShowAddUserModal(false);
        triggerToast('New user added successfully');
      } else {
        triggerToast(data.message || 'Failed to add user', true);
      }
    } catch (e) {
      triggerToast('Error connecting to backend', true);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const res = await fetch(buildUrl(`/api/settings/users/${userId}/status`), getAuthHeaders({
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      }));
      const data = await res.json();
      if (data.success) {
        setSystemUsers(systemUsers.map(u => (u.id === userId || u.user_id === userId) ? { ...u, status: nextStatus } : u));
        triggerToast(`User status updated to ${nextStatus}`);
      } else {
        triggerToast(data.message || 'Failed to update status', true);
      }
    } catch (e) {
      triggerToast('Failed to update status', true);
    }
  };

  // Handler to grant or change user role / admin rights
  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(buildUrl(`/api/settings/users/${userId}/role`), getAuthHeaders({
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      }));
      const data = await res.json();
      if (data.success) {
        setSystemUsers(systemUsers.map(u => (u.id === userId || u.user_id === userId) ? { ...u, role: newRole } : u));
        triggerToast(`User role successfully updated to ${newRole}`);
      } else {
        triggerToast(data.message || 'Failed to update user role', true);
      }
    } catch (e) {
      triggerToast('Server error while updating user role', true);
    }
  };

  const saveSystemConfig = async (overrides = {}) => {
    const payload = {
      ...ticketSettings,
      ...overrides
    };
    try {
      const res = await fetch(buildUrl('/api/settings/system'), getAuthHeaders({
        method: 'POST',
        body: JSON.stringify(payload)
      }));
      const data = await res.json();
      if (data.success) triggerToast('System configuration saved');
    } catch (e) {
      triggerToast('Failed to update system settings', true);
    }
  };

  const handleMaintenanceAction = async (actionKey, label) => {
    try {
      const res = await fetch(buildUrl(`/api/settings/maintenance/${actionKey}`), getAuthHeaders({ method: 'POST' }));
      const data = await res.json();
      if (data.success) triggerToast(data.message || `${label} executed successfully`);
    } catch (e) {
      triggerToast(`Failed to run ${label}`, true);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans text-gray-800">
      
      {/* Hidden File Input for Multipart Image Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-emerald-100 px-5 py-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xl border border-emerald-700/50 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> 
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="ml-4 text-emerald-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-900 text-rose-100 px-5 py-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xl border border-rose-700/50 animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400" /> 
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="ml-4 text-rose-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Settings</h1>
            {isItStaff && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-blue-200">
                <SettingsIcon className="w-3 h-3 text-blue-600 animate-spin-slow" /> Administrative Mode
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {isItStaff 
              ? 'Configure global preferences, system automation, user access controls, and security policies.' 
              : 'Manage your profile details, password security, notifications, and application preferences.'}
          </p>
        </div>
      </div>

      {/* Account Overview Banner */}
      <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-gray-800">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            
            {/* Interactive Avatar in Banner */}
            <div 
              className="relative group cursor-pointer shrink-0" 
              onClick={() => fileInputRef.current?.click()}
              title="Click to change profile picture"
            >
              {profileData.avatar ? (
                <img 
                  src={profileData.avatar} 
                  alt={profileData.name} 
                  className="w-16 h-16 rounded-2xl object-cover shadow-lg ring-4 ring-white/10 group-hover:opacity-80 transition"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg ring-4 ring-white/10 group-hover:brightness-110 transition">
                  {profileData.name ? profileData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'LO'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-5 h-5 text-white drop-shadow-md" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 ring-2 ring-gray-900 w-5 h-5 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-wide">{profileData.name}</h2>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {profileData.role}
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium mt-0.5">{emailUpdateForm.currentEmail}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold"><ShieldCheck className="w-3.5 h-3.5" /> Authenticated</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-blue-300 font-semibold"><KeyRound className="w-3.5 h-3.5" /> {isItStaff ? 'Super Admin Access' : 'Standard User'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onLogout ? onLogout() : triggerToast('Logged out')}
            className="group flex items-center justify-center gap-2 bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-600 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 shrink-0"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 no-scrollbar">
        {[
          { id: 'overview', label: 'Overview Navigation', icon: Sliders },
          { id: 'profile', label: 'Profile Details', icon: User },
          { id: 'security', label: 'Security & Access', icon: Lock },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'appearance', label: 'Appearance', icon: Palette },
          ...(isItStaff ? [
            { id: 'admin', label: 'User & Role Admin', icon: Shield },
            { id: 'data', label: 'Data & Maintenance', icon: Database }
          ] : [])
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">Quick Settings Control Panels</h3>
          {isItStaff ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'User & Role Management', desc: 'Manage system users, roles, and administrative DB permissions.', icon: Users, tabTarget: 'admin' },
                { title: 'Security & Access Control', desc: 'Configure authentication, password policies, and active sessions.', icon: Shield, tabTarget: 'security' },
                { title: 'Ticket & SLA Rules', desc: 'Configure ticket categories, default priorities, and SLA alert triggers.', icon: SettingsIcon, tabTarget: 'admin' },
                { title: 'Notifications & Alerts', desc: 'Customize email templates, frequency settings, and alert rules.', icon: Bell, tabTarget: 'notifications' },
                { title: 'Reports & Audit Logs', desc: 'Export audit trails, system performance metrics, and logs.', icon: Globe, tabTarget: 'data' },
                { title: 'General Preferences', desc: 'System time zone, localization, date/time formats, and look & feel.', icon: Sliders, tabTarget: 'appearance' }
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setActiveTab(card.tabTarget)}
                    className="bg-white border border-gray-200/80 hover:border-blue-400 hover:shadow-md transition-all duration-200 rounded-3xl p-5 shadow-sm flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors rounded-2xl shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{card.title}</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{card.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 shrink-0 ml-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Profile Settings', desc: 'Update your personal details, photo, contact info, and job title.', icon: User, tabTarget: 'profile' },
                { title: 'Password & Security', desc: 'Update your password and view your active login sessions.', icon: Lock, tabTarget: 'security' },
                { title: 'Notifications', desc: 'Choose how and when you receive email alerts for support tickets.', icon: Bell, tabTarget: 'notifications' },
                { title: 'Appearance & Theme', desc: 'Customize the visual layout, dark/light theme, and text sizing.', icon: Palette, tabTarget: 'appearance' }
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setActiveTab(card.tabTarget)}
                    className="bg-white border border-gray-200/80 hover:border-blue-400 hover:shadow-md transition-all duration-200 rounded-3xl p-6 shadow-sm flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3.5 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors rounded-2xl shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{card.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{card.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 shrink-0 ml-2" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROFILE DETAILS */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Personal & Account Details</h3>
              <p className="text-xs text-gray-500 mt-0.5">Keep your profile photo, contact details, and account info up to date.</p>
            </div>
            <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition shadow-sm">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 bg-gray-50 border border-gray-200/80 rounded-2xl">
            <div className="relative group shrink-0">
              {profileData.avatar ? (
                <img 
                  src={profileData.avatar} 
                  alt="Profile Preview" 
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-blue-500/20 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-2xl shadow-md">
                  {profileData.name ? profileData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'LO'}
                </div>
              )}
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-xl shadow-md transition"
                title="Change Picture"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 flex-1">
              <h4 className="text-xs font-bold text-gray-900">Profile Picture</h4>
              <p className="text-[11px] text-gray-500">
                Supports PNG, JPG, WEBP, or GIF formats up to 5MB. Uploaded images are stored directly on the IT support server.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" /> Upload New Picture
                </button>
                {profileData.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Full Name</label>
              <input 
                type="text" 
                value={profileData.name} 
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">Email Address</label>
                <button 
                  type="button" 
                  onClick={() => setShowEmailModal(true)}
                  className="text-[11px] text-blue-600 hover:underline font-bold"
                >
                  Change Email
                </button>
              </div>
              <div className="flex items-center justify-between w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-600">
                <span>{emailUpdateForm.currentEmail}</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Verified</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Job Title / Role</label>
              <input 
                type="text" 
                value={profileData.role} 
                onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Department</label>
              <input 
                type="text" 
                value={profileData.department} 
                onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500" 
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-gray-700">Phone Number</label>
              <input 
                type="text" 
                value={profileData.phone} 
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500" 
              />
            </div>
          </div>
        </form>
      )}

      {/* SECURE EMAIL UPDATE MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Update Account Email</h3>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              For security, changing your email requires verifying your current account password and adding the new email address.
            </p>

            <form onSubmit={handleEmailUpdateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Current Email</label>
                <input 
                  type="email" 
                  disabled 
                  value={emailUpdateForm.currentEmail}
                  className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs text-gray-500 cursor-not-allowed" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Current Password (Verification)</label>
                <input 
                  type="password" 
                  required
                  placeholder="Enter your current password"
                  value={emailUpdateForm.verificationPassword}
                  onChange={(e) => setEmailUpdateForm({ ...emailUpdateForm, verificationPassword: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">New Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. new.email@bergerpaints.com"
                  value={emailUpdateForm.newEmail}
                  onChange={(e) => setEmailUpdateForm({ ...emailUpdateForm, newEmail: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-2xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isEmailUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-2xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5"
                >
                  {isEmailUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Verify & Update Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & ACCESS */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handlePasswordUpdate} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Change Password</h3>
              <p className="text-xs text-gray-500 mt-0.5">Ensure your account uses a strong password with letters, numbers, and symbols.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-gray-700">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPass ? "text" : "password"} 
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    required
                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 pr-10" 
                  />
                  <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-gray-700">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPass ? "text" : "password"} 
                    value={passwords.newPass}
                    onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                    required
                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 pr-10" 
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Confirm New Password</label>
                <input 
                  type="password" 
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  required
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500" 
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={isLoading} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-2">
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Update Password
              </button>
            </div>
          </form>

          {/* Active Devices */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-gray-900">Active Login Sessions</h4>
            <div className="space-y-2">
              {activeSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-2xl text-xs">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{s.device}</span>
                        {s.current && <span className="bg-emerald-100 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">Current Session</span>}
                      </div>
                      <span className="text-[11px] text-gray-400">{s.browser} • IP: {s.ip} • Last active: {s.lastActive}</span>
                    </div>
                  </div>
                  {!s.current && (
                    <button 
                      onClick={() => handleRevokeSession(s.id)}
                      className="text-rose-600 hover:text-rose-700 font-bold text-[11px] px-3 py-1 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Email Notification Settings</h3>
            <p className="text-xs text-gray-500 mt-0.5">Configure how and when you receive automated system emails.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200/60">
              <div>
                <span className="text-xs font-bold text-gray-800 block">Master Email Toggle</span>
                <span className="text-[11px] text-gray-500 block">Enable or disable all email dispatching.</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  const nextVal = !emailNotifications;
                  setEmailNotifications(nextVal);
                  savePreferences({ emailNotifications: nextVal });
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${emailNotifications ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-1.5">
              <span className="text-xs font-bold text-gray-800 block">Delivery Frequency</span>
              <select 
                value={notificationFrequency}
                onChange={(e) => {
                  const val = e.target.value;
                  setNotificationFrequency(val);
                  savePreferences({ notificationFrequency: val });
                }}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none"
              >
                <option value="Instant">Instant Delivery</option>
                <option value="Hourly">Hourly Digest</option>
                <option value="Daily">Daily Summary Report</option>
              </select>
            </div>
          </div>

          {/* Granular Notification Triggers */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-900">System Notification Triggers</h4>
            <div className="space-y-2">
              {[
                { key: 'ticketCreated', label: 'Ticket Created Alert', desc: 'Receive email when a new ticket is submitted in your assigned area.' },
                { key: 'ticketAssigned', label: 'Ticket Assignment Alert', desc: 'Notify when a support ticket is assigned or reassigned to you.' },
                { key: 'slaBreach', label: 'SLA Breach Warning', desc: 'Alert when an open ticket is approaching or has breached SLA response times.' },
                { key: 'ticketResolved', label: 'Ticket Resolution Notification', desc: 'Send summary updates when support tickets are marked resolved.' },
                { key: 'systemUpdates', label: 'System & Security Maintenance', desc: 'Receive maintenance window notices and backend health alerts.' }
              ].map((rule) => (
                <div key={rule.key} className="flex items-center justify-between p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl">
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">{rule.label}</span>
                    <span className="text-[11px] text-gray-500 block">{rule.desc}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const updatedRules = { ...notifyRules, [rule.key]: !notifyRules[rule.key] };
                      setNotifyRules(updatedRules);
                      savePreferences({ notifyRules: updatedRules });
                    }}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${notifyRules[rule.key] ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Appearance Settings</h3>
            <p className="text-xs text-gray-500 mt-0.5">Customize theme options and interface presentation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-gray-100">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800 block">Theme Preference</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'system', label: 'System', icon: Laptop }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = themeMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setThemeMode(item.id);
                        savePreferences({ themeMode: item.id });
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition ${
                        isSel ? 'border-blue-600 bg-blue-50/50 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM & ROLE ADMIN (IT STAFF ONLY) */}
      {isItStaff && activeTab === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">User Role & Access Management</h3>
                <p className="text-xs text-gray-500 mt-0.5">Manage employee access, assign administrative roles, and activate/suspend accounts.</p>
              </div>
              <button 
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" /> Add New User
              </button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              {isDataLoading ? (
                <div className="flex items-center justify-center p-8 text-xs text-gray-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Loading system users...
                </div>
              ) : systemUsers.length === 0 ? (
                <div className="text-center p-8 text-xs text-gray-500">
                  No registered system users found.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Role / Admin Rights</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {systemUsers.map((u) => {
                      const uid = u.id || u.user_id;
                      const userRoleLower = (u.role || '').toLowerCase();
                      const userEmailLower = (u.email || '').toLowerCase();
                      const isSeniorAdmin = userRoleLower.includes('senior it admin') || userEmailLower.includes('lawalzoheer');

                      return (
                        <tr key={uid} className="hover:bg-gray-50/80">
                          <td className="p-3.5 font-bold text-gray-800">
                            <div className="flex items-center gap-2.5">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-lg object-cover ring-1 ring-gray-200" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                                  {u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                                </div>
                              )}
                              <div>
                                <div>{u.name}</div>
                                <div className="text-[11px] font-normal text-gray-400">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {isSeniorAdmin ? (
                              <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-1.5 rounded-xl text-[11px] border border-purple-200 inline-flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Senior IT Admin (Protected)
                              </span>
                            ) : (
                              <select 
                                value={u.role || 'Employee'}
                                onChange={(e) => handleRoleChange(uid, e.target.value)}
                                className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-1.5 rounded-xl text-[11px] border border-blue-200 outline-none cursor-pointer hover:bg-blue-100 transition"
                              >
                                <option value="Employee">Employee / Staff</option>
                                <option value="IT Support">IT Support</option>
                                <option value="IT Engineer">IT Engineer</option>
                                <option value="System Admin">System Admin</option>
                                <option value="Senior IT Admin">Senior IT Admin</option>
                              </select>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase ${
                              u.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            {!isSeniorAdmin && (
                              <button 
                                onClick={() => toggleUserStatus(uid, u.status)}
                                className="text-xs font-bold text-gray-600 hover:text-blue-600 underline"
                              >
                                {u.status === 'Active' ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Ticket & SLA Settings */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Ticket Workflow & SLA Rules</h3>
              <p className="text-xs text-gray-500 mt-0.5">Configure default support assignment rules and automated SLA warnings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800">Default Ticket Priority</label>
                <select 
                  value={ticketSettings.defaultPriority} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setTicketSettings({ ...ticketSettings, defaultPriority: val });
                    saveSystemConfig({ defaultPriority: val });
                  }}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Urgent">Urgent Priority</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800">SLA Breach Warning (Minutes)</label>
                <input 
                  type="number" 
                  value={ticketSettings.slaWarningMinutes}
                  onChange={(e) => setTicketSettings({ ...ticketSettings, slaWarningMinutes: e.target.value })}
                  onBlur={() => saveSystemConfig({ slaWarningMinutes: ticketSettings.slaWarningMinutes })}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800">Auto-Assign Tickets</label>
                <button 
                  type="button"
                  onClick={() => {
                    const nextVal = !ticketSettings.autoAssign;
                    setTicketSettings({ ...ticketSettings, autoAssign: nextVal });
                    saveSystemConfig({ autoAssign: nextVal });
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl border text-xs font-semibold transition ${
                    ticketSettings.autoAssign ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <span>{ticketSettings.autoAssign ? 'Enabled (Round-Robin)' : 'Disabled (Manual)'}</span>
                  {ticketSettings.autoAssign ? <ToggleRight className="w-5 h-5 text-blue-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: DATA & MAINTENANCE (IT STAFF ONLY) */}
      {isItStaff && activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Data Maintenance & Backend Controls</h3>
              <p className="text-xs text-gray-500 mt-0.5">Execute automated backups, flush system cache, and export audit trails.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-2">
                <span className="text-xs font-bold text-gray-900 block">System Backup</span>
                <span className="text-[11px] text-gray-500 block">Create full database backup.</span>
                <button 
                  onClick={() => handleMaintenanceAction('backup', 'System Backup')}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Create Backup
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-2">
                <span className="text-xs font-bold text-gray-900 block">Flush Cache</span>
                <span className="text-[11px] text-gray-500 block">Clear application memory cache.</span>
                <button 
                  onClick={() => handleMaintenanceAction('clear-cache', 'Flush Cache')}
                  className="w-full px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Clear Cache
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-2">
                <span className="text-xs font-bold text-gray-900 block">System Diagnostics</span>
                <span className="text-[11px] text-gray-500 block">Run system health checks.</span>
                <button 
                  onClick={() => handleMaintenanceAction('diagnostics', 'Diagnostics')}
                  className="w-full px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition"
                >
                  Run Diagnostics
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Recent Security & Database Audit Logs</h3>
            {isDataLoading ? (
              <div className="flex items-center justify-center p-8 text-xs text-gray-500 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Loading audit logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center p-8 text-xs text-gray-500">
                No recent audit log entries.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200/80 rounded-2xl text-xs">
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <div>
                        <span className="font-bold text-gray-800">{log.action}</span>
                        <span className="text-[11px] text-gray-400 block">Executed by: {log.user || 'System'}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500">{new Date(log.time).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Add New System User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" 
                  placeholder="e.g. Jane Doe"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" 
                  placeholder="jane.doe@bergerpaints.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Role Privilege</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs outline-none cursor-pointer"
                >
                  <option value="Employee">Employee / Staff</option>
                  <option value="IT Support">IT Support</option>
                  <option value="IT Engineer">IT Engineer</option>
                  <option value="System Admin">System Admin</option>
                  <option value="Senior IT Admin">Senior IT Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-2xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-2xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-[11px] text-gray-400 font-medium border-t border-gray-100">
        © 2026 Berger Paints IT Support System. All rights reserved.
      </div>

    </div>
  );
}