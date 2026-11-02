import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Laptop, Settings as SettingsGear, Lock, MoreVertical, 
  ChevronLeft, ChevronRight, Filter, Plus, Download, Info, Edit3, X, Save, RefreshCw, CheckCircle, RotateCcw, AlertTriangle, ShieldCheck, Server, Globe, Check, Activity, HardDrive, Cpu, Calendar, Wrench, AlertCircle
} from 'lucide-react';

export default function AssetsPage({ 
  user = { name: 'John Davis', email: 'john.davis@bergerpaints.com', role: 'user' },
  isItStaff: propIsItStaff,
  searchQuery: propSearchQuery
}) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [hardwareStatusFilter, setHardwareStatusFilter] = useState('All');

  // API State & Data
  const [assets, setAssets] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Modal State for User Self-Reporting / Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    device_name: '',
    type: 'Laptop',
    asset_tag: '',
    serial_number: '',
    hostname: '',
    domain_name: 'BERGERPAINTS.LOCAL',
    os_version: '',
    ram_gb: '',
    cpu_model: '',
    disk_free_gb: '',
    location: 'Head Office - 3rd Floor',
    status: 'In Use'
  });

  // Admin Specific Edit Modal State for Underlying Issues & Dates
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedAssetForAdmin, setSelectedAssetForAdmin] = useState(null);
  const [adminFormData, setAdminFormData] = useState({
    underlying_issues: '',
    is_functional: true,
    assured_date: '',
    last_checked_date: '',
    last_fixed_date: ''
  });

  // Fallback search state
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : internalSearchQuery;

  // Safe user evaluation & role determination
  const safeUser = user || {};
  const userEmail = safeUser.email || '';
  const userName = safeUser.name || '';
  const userRole = safeUser.role || 'user';

  // Determine admin privileges safely
  const isItStaff = propIsItStaff !== undefined ? propIsItStaff : (
    userEmail.toLowerCase().includes('it') || 
    userEmail.toLowerCase().includes('admin') || 
    userRole === 'admin'
  );

  // 1. FETCH ASSETS AND ISSUES FROM BACKEND API
  const fetchAssetsData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setApiError(null);
    try {
      const activeRole = isItStaff ? 'admin' : userRole;
      const queryParams = new URLSearchParams({
        email: userEmail,
        role: activeRole
      }).toString();

      const [assetsRes, issuesRes] = await Promise.all([
        fetch(`/api/assets?${queryParams}`),
        fetch('/api/assets/issues').catch(() => null)
      ]);

      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setAssets(Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []));
      } else {
        const errText = await assetsRes.text();
        setApiError(`HTTP ${assetsRes.status}: ${errText}`);
        setAssets([]);
      }

      if (issuesRes && issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setIssues(Array.isArray(issuesData) ? issuesData : []);
      } else {
        setIssues([]);
      }
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to fetch assets data:', error);
      setApiError(error.message || 'Network fetch error');
      setAssets([]);
      setIssues([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userEmail, userRole, isItStaff]);

  // Initial Data Fetch
  useEffect(() => {
    fetchAssetsData();
  }, [fetchAssetsData]);

  const safeAssets = Array.isArray(assets) ? assets : [];

  // Extract unique filter dropdown options dynamically
  const filterOptions = useMemo(() => {
    const types = new Set();
    const statuses = new Set();
    const locations = new Set();
    const owners = new Set();
    const hardwareStatuses = new Set();

    safeAssets.forEach(asset => {
      if (asset.type) types.add(asset.type);
      if (asset.status) statuses.add(asset.status);
      if (asset.location) locations.add(asset.location);
      if (asset.hardware_status) hardwareStatuses.add(asset.hardware_status);
      const ownerName = asset.owner || asset.owner_name;
      if (ownerName) owners.add(ownerName);
    });

    return {
      types: Array.from(types),
      statuses: Array.from(statuses),
      locations: Array.from(locations),
      owners: Array.from(owners),
      hardwareStatuses: Array.from(hardwareStatuses)
    };
  }, [safeAssets]);

  // Evaluate current user's matched workstation asset
  const myAsset = safeAssets.find(a => 
    (a.owner_email && userEmail && a.owner_email.toLowerCase() === userEmail.toLowerCase()) || 
    (a.owner && userName && a.owner.toLowerCase() === userName.toLowerCase()) ||
    (a.owner_name && userName && a.owner_name.toLowerCase() === userName.toLowerCase())
  ) || (safeAssets.length > 0 && !isItStaff ? safeAssets[0] : null);

  // Populate modal with existing asset details OR clean blank fields
  const handleOpenModal = () => {
    if (myAsset) {
      setFormData({
        device_name: myAsset.name || myAsset.device_name || '',
        type: myAsset.type || 'Laptop',
        asset_tag: myAsset.tag || myAsset.asset_tag || '',
        serial_number: myAsset.serial_number || '',
        hostname: myAsset.hostname || '',
        domain_name: myAsset.domain_name || 'BERGERPAINTS.LOCAL',
        os_version: myAsset.os_version || '',
        ram_gb: myAsset.ram_gb || '',
        cpu_model: myAsset.cpu_model || '',
        disk_free_gb: myAsset.disk_free_gb || '',
        location: myAsset.location || 'Head Office - 3rd Floor',
        status: myAsset.status || 'In Use'
      });
    } else {
      setFormData({
        device_name: '',
        type: 'Laptop',
        asset_tag: '',
        serial_number: '',
        hostname: '',
        domain_name: 'BERGERPAINTS.LOCAL',
        os_version: '',
        ram_gb: '',
        cpu_model: '',
        disk_free_gb: '',
        location: 'Head Office - 3rd Floor',
        status: 'In Use'
      });
    }
    setIsModalOpen(true);
  };

  // Open Admin Details Modal for underlying issues & lifecycle dates
  const handleOpenAdminModal = (asset) => {
    setSelectedAssetForAdmin(asset);
    setAdminFormData({
      underlying_issues: asset.underlying_issues || '',
      is_functional: asset.is_functional !== undefined ? asset.is_functional : true,
      assured_date: asset.assured_date ? asset.assured_date.slice(0, 10) : '',
      last_checked_date: asset.last_checked_date ? asset.last_checked_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      last_fixed_date: asset.last_fixed_date ? asset.last_fixed_date.slice(0, 10) : ''
    });
    setIsAdminModalOpen(true);
  };

  // Submit self-reported asset data to backend
  const handleSaveAsset = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedbackMessage('');

    const payload = {
      ...formData,
      owner_name: userName,
      owner_email: userEmail,
    };

    try {
      const response = await fetch('/api/assets/self-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setFeedbackMessage('Workstation details saved successfully!');
        await fetchAssetsData(false);
        setTimeout(() => {
          setIsModalOpen(false);
          setFeedbackMessage('');
        }, 1200);
      } else {
        setFeedbackMessage('Failed to save workstation details on server.');
      }
    } catch (err) {
      console.error('Error submitting asset update:', err);
      setFeedbackMessage('Network error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Submit Admin-specific underlying issues & date tracking details
  const handleSaveAdminDetails = async (e) => {
    e.preventDefault();
    if (!selectedAssetForAdmin) return;
    setSaving(true);
    setFeedbackMessage('');

    const assetId = selectedAssetForAdmin.asset_id || selectedAssetForAdmin.id;

    try {
      const response = await fetch(`/api/assets/${assetId}/admin-details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminFormData)
      });

      if (response.ok) {
        setFeedbackMessage('Admin maintenance & issue log updated!');
        await fetchAssetsData(true);
        setTimeout(() => {
          setIsAdminModalOpen(false);
          setFeedbackMessage('');
        }, 1200);
      } else {
        setFeedbackMessage('Failed to update admin asset details.');
      }
    } catch (err) {
      console.error('Error saving admin details:', err);
      setFeedbackMessage('Network error occurred.');
    } finally {
      setSaving(false);
    }
  };

  // Admin action to verify and update hardware health
  const handleVerifyHardware = async (assetId, newStatus) => {
    try {
      const res = await fetch(`/api/assets/${assetId}/health`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hardware_status: newStatus })
      });
      if (res.ok) {
        await fetchAssetsData(true);
      }
    } catch (err) {
      console.error('Error verifying hardware status:', err);
    }
  };

  // Filter assets dynamically
  const filteredAssets = safeAssets.filter(asset => {
    const assetName = asset.name || asset.device_name || '';
    const assetTag = asset.tag || asset.asset_tag || '';
    const assetOwner = asset.owner || asset.owner_name || '';
    const assetLocation = asset.location || '';
    const assetHostname = asset.hostname || '';

    const matchesSearch = 
      assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assetOwner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assetLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assetHostname.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'All' || asset.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || asset.status === statusFilter;
    const matchesLocation = locationFilter === 'All' || assetLocation === locationFilter;
    const matchesOwner = ownerFilter === 'All' || assetOwner === ownerFilter;
    const matchesHardwareStatus = hardwareStatusFilter === 'All' || (asset.hardware_status || 'Pending Verification') === hardwareStatusFilter;

    return matchesSearch && matchesType && matchesStatus && matchesLocation && matchesOwner && matchesHardwareStatus;
  });

  const resetFilters = () => {
    setTypeFilter('All');
    setStatusFilter('All');
    setLocationFilter('All');
    setOwnerFilter('All');
    setHardwareStatusFilter('All');
  };

  // Export filtered assets to CSV format
  const handleExportCSV = () => {
    if (filteredAssets.length === 0) {
      alert('No assets available to export.');
      return;
    }

    const headers = ['Asset Tag', 'System Name', 'Hostname', 'Domain', 'Type', 'OS Version', 'RAM (GB)', 'CPU Model', 'Functionality', 'Underlying Issues', 'Assured Date', 'Last Checked', 'Last Fixed', 'Hardware Health', 'Owner', 'Location'];
    const rows = filteredAssets.map(asset => [
      `"${asset.asset_tag || asset.tag || ''}"`,
      `"${asset.name || asset.device_name || ''}"`,
      `"${asset.hostname || ''}"`,
      `"${asset.domain_name || ''}"`,
      `"${asset.type || ''}"`,
      `"${asset.os_version || ''}"`,
      `"${asset.ram_gb || ''}"`,
      `"${asset.cpu_model || ''}"`,
      `"${asset.is_functional !== false ? 'Functional' : 'Faulty / Needs Repair'}"`,
      `"${(asset.underlying_issues || 'None').replace(/"/g, '""')}"`,
      `"${asset.assured_date ? asset.assured_date.slice(0, 10) : 'N/A'}"`,
      `"${asset.last_checked_date ? asset.last_checked_date.slice(0, 10) : 'N/A'}"`,
      `"${asset.last_fixed_date ? asset.last_fixed_date.slice(0, 10) : 'N/A'}"`,
      `"${asset.hardware_status || 'Pending Verification'}"`,
      `"${asset.owner || asset.owner_name || 'Unassigned'}"`,
      `"${asset.location || 'Head Office'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `berger_assets_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = typeFilter !== 'All' || statusFilter !== 'All' || locationFilter !== 'All' || ownerFilter !== 'All' || hardwareStatusFilter !== 'All';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {isItStaff ? 'Assets & Hardware Inventory' : 'My Workstation Details'}
            </h1>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
              <ShieldCheck className="w-3 h-3" /> Manual Register Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isItStaff ? 'Manage corporate computer assets, domain hostnames, hardware specifications, underlying issues, and lifecycle maintenance dates.' : 'View and update your assigned hardware specifications, computer hostname, domain, and IT asset tag.'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {lastSyncTime && (
            <span className="text-[11px] text-gray-400 font-medium hidden sm:inline-block">
              Updated {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <button 
            onClick={() => fetchAssetsData(false)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 font-medium text-xs transition disabled:opacity-50 cursor-pointer"
            title="Refresh Assets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ================= REGULAR USER VIEW (WORKSTATION DETAILS) ================= */}
      {!isItStaff && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Your Workstation Profile</h2>
                <p className="text-xs text-gray-500 mt-0.5">Hardware specifications and domain registration on file with Berger Paints IT.</p>
              </div>
              <button 
                onClick={handleOpenModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-sm cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> 
                {myAsset ? 'Update Workstation Specs' : 'Register Workstation'}
              </button>
            </div>

            {myAsset ? (
              <div className="border border-gray-200 rounded-2xl p-6 space-y-6 bg-white shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                      <Laptop className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-gray-400">System Model / Device Name</span>
                      <div className="text-base font-bold text-gray-900 mt-0.5">
                        {myAsset.name || myAsset.device_name || 'Corporate Workstation'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      myAsset.is_functional !== false 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {myAsset.is_functional !== false ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {myAsset.is_functional !== false ? 'System Functional' : 'Needs Repair'}
                    </span>
                    <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      myAsset.hardware_status === 'Verified Clean' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : myAsset.hardware_status === 'Warning'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      <ShieldCheck className="w-3.5 h-3.5" /> 
                      {myAsset.hardware_status || 'Pending Verification'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100 text-xs">
                  <div>
                    <span className="text-gray-400 font-medium block">Asset Tag</span>
                    <span className="font-bold text-blue-600 mt-1 block">{myAsset.asset_tag || myAsset.tag || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Hostname</span>
                    <span className="font-semibold text-gray-800 mt-1 block flex items-center gap-1">
                      <Server className="w-3 h-3 text-gray-400" /> {myAsset.hostname || 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Domain Name</span>
                    <span className="font-semibold text-gray-800 mt-1 block flex items-center gap-1">
                      <Globe className="w-3 h-3 text-gray-400" /> {myAsset.domain_name || 'BERGERPAINTS.LOCAL'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Operating System</span>
                    <span className="font-semibold text-gray-800 mt-1 block">{myAsset.os_version || 'Windows 11 Pro'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">RAM & CPU Specs</span>
                    <span className="font-semibold text-gray-800 mt-1 block flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-gray-400" />
                      {myAsset.ram_gb ? `${myAsset.ram_gb} GB RAM` : 'N/A'} / {myAsset.cpu_model || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Location</span>
                    <span className="font-semibold text-gray-800 mt-1 block">{myAsset.location || 'Head Office'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Underlying Issues</span>
                    <span className="font-semibold text-amber-600 mt-1 block truncate">{myAsset.underlying_issues || 'None reported'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Last Checked / Fixed</span>
                    <span className="font-semibold text-gray-800 mt-1 block">
                      {myAsset.last_checked_date ? myAsset.last_checked_date.slice(0, 10) : 'Recently'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50/50">
                <Laptop className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-gray-800">No Workstation Registered</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  You don't have a computer asset registered in the system yet. Click below to enter your workstation details manually.
                </p>
                <button 
                  onClick={handleOpenModal}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                >
                  + Register Workstation Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= IT ADMIN VIEW ================= */}
      {isItStaff && (
        <div className="space-y-6">
          
          {/* Filters & Actions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-2xl text-xs font-bold text-gray-600">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <span>Filters</span>
              </div>

              {/* Type Filter */}
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white border border-gray-200 px-3 py-2 rounded-2xl text-xs font-semibold text-gray-700 shadow-sm cursor-pointer outline-none"
              >
                <option value="All">Type: All</option>
                {filterOptions.types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              {/* Hardware Status Filter */}
              <select 
                value={hardwareStatusFilter}
                onChange={(e) => setHardwareStatusFilter(e.target.value)}
                className="bg-white border border-gray-200 px-3 py-2 rounded-2xl text-xs font-semibold text-gray-700 shadow-sm cursor-pointer outline-none"
              >
                <option value="All">Hardware Health: All</option>
                {filterOptions.hardwareStatuses.map(status => (
                  <option key={status} value={status}>Health: {status}</option>
                ))}
              </select>

              {/* Location Filter */}
              <select 
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="bg-white border border-gray-200 px-3 py-2 rounded-2xl text-xs font-semibold text-gray-700 shadow-sm cursor-pointer outline-none"
              >
                <option value="All">Location: All</option>
                {filterOptions.locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              {hasActiveFilters && (
                <button 
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs font-bold hover:bg-red-100 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-2xl text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" /> Export CSV
              </button>
              <button 
                onClick={handleOpenModal}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-2xl text-xs font-semibold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Asset
              </button>
            </div>
          </div>

          {/* Admin Assets Table */}
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold bg-gray-50/50">
                    <th className="py-4 px-5 font-medium">Asset Tag & Device</th>
                    <th className="py-4 px-4 font-medium">Functionality & Issues</th>
                    <th className="py-4 px-4 font-medium">Lifecycle Dates (Assured / Checked / Fixed)</th>
                    <th className="py-4 px-4 font-medium">Hardware Health</th>
                    <th className="py-4 px-4 font-medium">Assigned Owner</th>
                    <th className="py-4 px-5 font-medium text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredAssets.length > 0 ? (
                    filteredAssets.map((asset, idx) => (
                      <tr key={asset.asset_id || idx} className="hover:bg-gray-50/80 transition align-top">
                        <td className="py-4 px-5">
                          <div className="font-bold text-blue-600">{asset.asset_tag || asset.tag || 'N/A'}</div>
                          <div className="font-semibold text-gray-900 mt-0.5">{asset.hostname || asset.name || asset.device_name || 'Workstation'}</div>
                          <div className="text-[11px] text-gray-400">{asset.location || 'Head Office'}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              asset.is_functional !== false 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {asset.is_functional !== false ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              {asset.is_functional !== false ? 'Functional' : 'Faulty'}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-600 font-medium max-w-xs truncate" title={asset.underlying_issues}>
                            {asset.underlying_issues ? (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block mt-1">
                                <strong>Issue:</strong> {asset.underlying_issues}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">No underlying issues reported</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[11px] space-y-0.5">
                          <div><span className="text-gray-400">Assured:</span> <span className="font-medium text-gray-800">{asset.assured_date ? asset.assured_date.slice(0, 10) : 'Not set'}</span></div>
                          <div><span className="text-gray-400">Checked:</span> <span className="font-medium text-gray-800">{asset.last_checked_date ? asset.last_checked_date.slice(0, 10) : 'N/A'}</span></div>
                          <div><span className="text-gray-400">Fixed:</span> <span className="font-medium text-gray-800">{asset.last_fixed_date ? asset.last_fixed_date.slice(0, 10) : 'N/A'}</span></div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${
                            asset.hardware_status === 'Verified Clean'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : asset.hardware_status === 'Warning'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {asset.hardware_status || 'Pending Verification'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-medium text-gray-800">
                          {asset.owner || asset.owner_name || 'Unassigned'}
                        </td>
                        <td className="py-4 px-5 text-right space-y-1">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => handleOpenAdminModal(asset)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
                              title="Edit Admin Issues & Dates"
                            >
                              <Wrench className="w-3 h-3" /> Edit Info
                            </button>
                          </div>
                          <div className="flex items-center justify-end gap-1 pt-1">
                            <button 
                              onClick={() => handleVerifyHardware(asset.asset_id || asset.id, 'Verified Clean')}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-semibold hover:bg-emerald-700 transition cursor-pointer"
                            >
                              Clean
                            </button>
                            <button 
                              onClick={() => handleVerifyHardware(asset.asset_id || asset.id, 'Warning')}
                              className="px-2 py-0.5 bg-amber-500 text-white rounded text-[9px] font-semibold hover:bg-amber-600 transition cursor-pointer"
                            >
                              Warn
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">
                        No assets found matching your search or filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= WORKSTATION USER MANUAL MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {myAsset ? 'Edit Workstation Specs' : 'Register Workstation Details'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Enter or update computer hostname, domain, and hardware specs.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedbackMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> {feedbackMessage}
              </div>
            )}

            <form onSubmit={handleSaveAsset} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Device / Model Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. HP ProBook 450 G8"
                    value={formData.device_name}
                    onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Asset Tag</label>
                  <input 
                    type="text"
                    placeholder="e.g. BERGER-A-1024"
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Hostname (PC Name)</label>
                  <input 
                    type="text"
                    placeholder="e.g. TENI-PC"
                    value={formData.hostname}
                    onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Domain Name</label>
                  <input 
                    type="text"
                    value={formData.domain_name}
                    onChange={(e) => setFormData({ ...formData, domain_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">RAM (GB)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 16"
                    value={formData.ram_gb}
                    onChange={(e) => setFormData({ ...formData, ram_gb: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">CPU Model</label>
                  <input 
                    type="text"
                    placeholder="e.g. Intel Core i5"
                    value={formData.cpu_model}
                    onChange={(e) => setFormData({ ...formData, cpu_model: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Operating System</label>
                  <input 
                    type="text"
                    placeholder="e.g. Windows 11 Pro"
                    value={formData.os_version}
                    onChange={(e) => setFormData({ ...formData, os_version: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Workstation Location</label>
                  <select 
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium bg-white"
                  >
                    <option value="Head Office - 1st Floor">Head Office - 1st Floor</option>
                    <option value="Head Office - 2nd Floor">Head Office - 2nd Floor</option>
                    <option value="Head Office - 3rd Floor">Head Office - 3rd Floor</option>
                    <option value="Factory / Warehouse">Factory / Warehouse</option>
                    <option value="Remote / Home">Remote / Home Workstation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Serial Number (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. 5CG123456X"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Workstation Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADMIN MAINTENANCE & ISSUES MODAL ================= */}
      {isAdminModalOpen && selectedAssetForAdmin && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Admin Maintenance & Issue Log</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Asset: <span className="font-semibold text-blue-600">{selectedAssetForAdmin.asset_tag || selectedAssetForAdmin.tag}</span> ({selectedAssetForAdmin.hostname || selectedAssetForAdmin.name})
                </p>
              </div>
              <button 
                onClick={() => setIsAdminModalOpen(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedbackMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> {feedbackMessage}
              </div>
            )}

            <form onSubmit={handleSaveAdminDetails} className="space-y-4 text-xs">
              
              {/* Functionality Toggle */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">System Functional Status</label>
                <div className="flex items-center gap-4">
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold cursor-pointer transition ${
                    adminFormData.is_functional ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    <input 
                      type="radio" 
                      name="is_functional" 
                      checked={adminFormData.is_functional}
                      onChange={() => setAdminFormData({ ...adminFormData, is_functional: true })}
                      className="accent-emerald-600"
                    />
                    <span>Fully Functional</span>
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold cursor-pointer transition ${
                    !adminFormData.is_functional ? 'bg-red-50 border-red-300 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    <input 
                      type="radio" 
                      name="is_functional" 
                      checked={!adminFormData.is_functional}
                      onChange={() => setAdminFormData({ ...adminFormData, is_functional: false })}
                      className="accent-red-600"
                    />
                    <span>Faulty / Needs Repair</span>
                  </label>
                </div>
              </div>

              {/* Underlying Issues */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Underlying Issues / Fault Description</label>
                <textarea 
                  rows={3}
                  placeholder="Describe any hardware defects, battery degradation, intermittent network faults, or pending fixes..."
                  value={adminFormData.underlying_issues}
                  onChange={(e) => setAdminFormData({ ...adminFormData, underlying_issues: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium resize-none"
                />
              </div>

              {/* Dating System */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date Assured (OK)</label>
                  <input 
                    type="date"
                    value={adminFormData.assured_date}
                    onChange={(e) => setAdminFormData({ ...adminFormData, assured_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Last Checked Date</label>
                  <input 
                    type="date"
                    value={adminFormData.last_checked_date}
                    onChange={(e) => setAdminFormData({ ...adminFormData, last_checked_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Last Fixed Date</label>
                  <input 
                    type="date"
                    value={adminFormData.last_fixed_date}
                    onChange={(e) => setAdminFormData({ ...adminFormData, last_fixed_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-medium text-[11px]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Maintenance Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-[11px] text-gray-400 font-medium">
        © 2026 Berger Paints IT Support. All rights reserved.
      </div>
    </div>
  );
}