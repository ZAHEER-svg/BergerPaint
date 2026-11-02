import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, MoreVertical, UserCheck, UserX, Loader2, AlertCircle, RotateCcw, Building2, Shield } from 'lucide-react';

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

// Formats Base64 strings, relative server static paths (/uploads/...), or external URLs
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

export default function UsersPage({ user, isItStaff, searchQuery }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [localSearch, setLocalSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Employee');
  const [newDepartment, setNewDepartment] = useState('General Management');

  // Fetch users from backend with JWT authentication
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Attempt fetching from /api/settings/users first, falling back to /api/users
      let response = await fetch(buildUrl('/api/settings/users'), getAuthHeaders());
      if (!response.ok) {
        response = await fetch(buildUrl('/api/users'), getAuthHeaders());
      }

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch users.');
      }
      
      setUsers(result.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Extract unique departments and roles for dynamic filter dropdowns
  const filterOptions = useMemo(() => {
    const departments = new Set();
    const roles = new Set();

    users.forEach(u => {
      if (u.department) departments.add(u.department);
      if (u.role) roles.add(u.role);
    });

    return {
      departments: Array.from(departments),
      roles: Array.from(roles)
    };
  }, [users]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    try {
      setSubmitting(true);
      let response = await fetch(buildUrl('/api/settings/users'), getAuthHeaders({
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          role: newRole,
          department: newDepartment,
          status: 'Active'
        })
      }));

      if (!response.ok) {
        response = await fetch(buildUrl('/api/users'), getAuthHeaders({
          method: 'POST',
          body: JSON.stringify({
            name: newName,
            email: newEmail,
            role: newRole,
            department: newDepartment,
            status: 'Active'
          })
        }));
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create user.');
      }

      setUsers([result.data, ...users]);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      let response = await fetch(buildUrl(`/api/settings/users/${id}/status`), getAuthHeaders({
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      }));

      if (!response.ok) {
        response = await fetch(buildUrl(`/api/users/${id}/status`), getAuthHeaders({
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus })
        }));
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update user status.');
      }

      setUsers(users.map(u => (u.id === id || u.user_id === id) ? { ...u, status: nextStatus } : u));
    } catch (err) {
      alert(err.message);
    } finally {
      setActiveDropdown(null);
    }
  };

  const resetFilters = () => {
    setDepartmentFilter('All');
    setRoleFilter('All');
    setLocalSearch('');
  };

  const effectiveSearch = localSearch || searchQuery || '';
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(effectiveSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(effectiveSearch.toLowerCase())) ||
      (u.role && u.role.toLowerCase().includes(effectiveSearch.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(effectiveSearch.toLowerCase()));

    const matchesDepartment = departmentFilter === 'All' || u.department === departmentFilter;
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;

    return matchesSearch && matchesDepartment && matchesRole;
  });

  const hasActiveFilters = departmentFilter !== 'All' || roleFilter !== 'All' || localSearch !== '';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Users & Departments</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Manage user accounts, corporate departments, and access roles registered across the platform.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 border border-gray-200 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, role..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 pl-10 pr-4 py-2 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Department Filter */}
          <select 
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer"
          >
            <option value="All">Department: All</option>
            {filterOptions.departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer"
          >
            <option value="All">Role: All</option>
            {filterOptions.roles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button 
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-100 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        <div className="text-xs font-semibold text-gray-500">
          Showing <span className="text-blue-600 font-bold">{filteredUsers.length}</span> of {users.length} users
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading database users: {error}</span>
          <button onClick={fetchUsers} className="ml-auto underline font-semibold">Retry</button>
        </div>
      )}

      {/* Users Table Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="text-xs text-gray-500 font-medium">Syncing with database...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Department</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Last Active</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400 font-normal">
                      No users found matching your search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const userId = u.id || u.user_id;
                    const rawAvatar = u.profile_picture || u.profilePic || u.avatar || u.avatarUrl;
                    const avatarUrl = formatAvatarUrl(rawAvatar);

                    return (
                      <tr key={userId} className="hover:bg-gray-50/50 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {avatarUrl ? (
                              <img 
                                src={avatarUrl} 
                                alt={u.name} 
                                className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100 shadow-sm" 
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-gray-100">
                                {u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                              </div>
                            )}
                            <span className="font-semibold text-gray-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600 font-normal">{u.email}</td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md font-semibold text-[11px]">
                            <Building2 className="w-3 h-3 text-blue-500" />
                            {u.department || 'General Management'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-md font-semibold text-[11px]">
                            <Shield className="w-3 h-3 text-gray-500" />
                            {u.role || 'Employee'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide ${
                            u.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' 
                              : 'bg-rose-50 text-rose-600 border border-rose-200/60'
                          }`}>
                            {u.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-500 font-normal">{u.lastActive || 'Just now'}</td>
                        <td className="py-4 px-6 text-right relative">
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === userId ? null : userId)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Action Dropdown Menu */}
                          {activeDropdown === userId && (
                            <div className="absolute right-6 top-12 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 text-left">
                              <button 
                                onClick={() => toggleStatus(userId, u.status)}
                                className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                {u.status === 'Active' ? <UserX className="w-3.5 h-3.5 text-rose-500" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
                                {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-base font-bold text-gray-900">Add New System User</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Alex Turner"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. a.turner@bergerpaints.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                  <input 
                    type="text" 
                    placeholder="e.g. IT Department"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                  <select 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Employee">Employee</option>
                    <option value="IT Engineer">IT Engineer</option>
                    <option value="IT Support">IT Support</option>
                    <option value="System Admin">System Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}