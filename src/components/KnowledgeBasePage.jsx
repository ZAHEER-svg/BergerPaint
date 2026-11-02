import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Search, Plus, Filter, MoreVertical, ChevronLeft, ChevronRight, 
  PlayCircle, Monitor, Code, Globe, Users as UsersIcon, Mail, Shield, FileText, 
  ChevronDown, X, Trash2, Edit, Check, AlertTriangle, CheckCircle2,
  Zap, Image as ImageIcon, Pin, Sparkles, ExternalLink, UploadCloud, Link, RefreshCw,
  ZoomIn, Maximize2
} from 'lucide-react';

export default function KnowledgeBasePage({ 
  user = { id: 1, name: 'John Davis', email: 'john.davis@bergerpaints.com', role: 'admin' },
  isItStaff: propIsItStaff,
  searchQuery: propSearchQuery
}) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeSubTab, setActiveSubTab] = useState('manage'); // 'browse' | 'manage'
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [selectedArticleForView, setSelectedArticleForView] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  
  // Data States
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload & Drag-and-Drop States
  const fileInputRef = useRef(null);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
  const [isDragging, setIsDragging] = useState(false);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  // Delete Modal & Toast States
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'article' | 'category', id: string|number, name: string }
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    status: 'Published',
    is_quick_info: false,
    image_url: '',
    summary: '',
    content: ''
  });

  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : internalSearchQuery;

  // Determine admin/IT staff privileges
  const isItStaff = propIsItStaff !== undefined ? propIsItStaff : (
    user.email?.toLowerCase().includes('it') || 
    user.email?.toLowerCase().includes('admin') || 
    user.email?.toLowerCase().endsWith('@bergerpaints.com') || 
    user.role === 'admin'
  );

  // Helper function to trigger toast messages
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  // Helper function to format view counts
  const formatViews = (count) => {
    const num = Number(count) || 0;
    return `${num} ${num === 1 ? 'view' : 'views'}`;
  };

  // Icon mapping helper
  const getCategoryIcon = (categoryName) => {
    switch (categoryName?.toLowerCase()) {
      case 'getting started': return PlayCircle;
      case 'hardware': return Monitor;
      case 'software': return Code;
      case 'network': return Globe;
      case 'accounts & access': return UsersIcon;
      case 'email & collaboration': return Mail;
      case 'security': return Shield;
      default: return FileText;
    }
  };

  // Fetch Articles & Categories on Mount / Role Change
  useEffect(() => {
    fetchData();
  }, [isItStaff]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, artRes] = await Promise.all([
        fetch(`/api/kb/categories?isStaff=${isItStaff}`),
        fetch(`/api/kb/articles?isStaff=${isItStaff}`)
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
        if (catData.length > 0) {
          setFormData(prev => ({
            ...prev,
            category: prev.category || catData[0].name
          }));
        }
      }

      if (artRes.ok) {
        const artData = await artRes.json();
        setArticles(artData);
      }
    } catch (err) {
      console.error("Error fetching knowledge base data:", err);
      showToast('Error fetching knowledge base data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Image Upload File Processing
  const handleProcessFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP, GIF).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds the 5MB limit.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, image_url: event.target.result }));
      showToast('Image uploaded successfully.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleProcessFile(file);
  };

  // Drag-and-Drop Event Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Open Editor for New Article
  const handleNewArticle = () => {
    setEditingArticleId(null);
    setUploadMode('file');
    setFormData({
      title: '',
      category: categories[0]?.name || '',
      status: 'Published',
      is_quick_info: false,
      image_url: '',
      summary: '',
      content: ''
    });
    setShowEditor(true);
  };

  // Open Editor for Existing Article
  const handleEditArticle = (article) => {
    setEditingArticleId(article.id);
    setUploadMode(article.image_url?.startsWith('data:') || !article.image_url ? 'file' : 'url');
    setFormData({
      title: article.title || '',
      category: article.category || (categories[0]?.name || ''),
      status: article.status || 'Published',
      is_quick_info: Boolean(article.is_quick_info),
      image_url: article.image_url || '',
      summary: article.summary || '',
      content: article.content || ''
    });
    setShowEditor(true);
  };

  // Save Article (Create or Update)
  const handleSaveArticle = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast('Please enter an article title.', 'error');
      return;
    }
    if (!formData.category) {
      showToast('Please select a valid category.', 'error');
      return;
    }
    if (!formData.content.trim()) {
      showToast('Please enter article content.', 'error');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      status: formData.status,
      is_quick_info: formData.is_quick_info,
      image_url: formData.image_url.trim(),
      summary: formData.summary.trim(),
      content: formData.content.trim(),
      author_id: user.id || 1
    };

    try {
      const url = editingArticleId ? `/api/kb/articles/${editingArticleId}` : '/api/kb/articles';
      const method = editingArticleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowEditor(false);
        showToast(editingArticleId ? 'Article updated successfully.' : 'Article created successfully.', 'success');
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Failed to save article: ${errData.error || errData.message || 'Server error'}`, 'error');
      }
    } catch (err) {
      console.error("Failed to save article:", err);
      showToast('Network error connecting to backend server.', 'error');
    }
  };

  // Trigger Delete Modals
  const triggerDeleteArticle = (article) => {
    setDeleteTarget({ type: 'article', id: article.id, name: article.title });
  };

  const triggerDeleteCategory = (id, name) => {
    setDeleteTarget({ type: 'category', id, name });
  };

  // Execute Deletion
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { type, id, name } = deleteTarget;

    try {
      if (type === 'article') {
        const res = await fetch(`/api/kb/articles/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Article deleted successfully.', 'success');
          fetchData();
        } else {
          showToast('Failed to delete article.', 'error');
        }
      } else if (type === 'category') {
        const res = await fetch(`/api/kb/categories/${id}`, { method: 'DELETE' });

        if (res.ok) {
          if (selectedCategory === name) {
            setSelectedCategory('All');
          }
          showToast(`Category "${name}" deleted successfully.`, 'success');
          fetchData();
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(`Failed to delete category: ${errData.error || errData.message || res.statusText}`, 'error');
        }
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
      showToast('Network error connecting to backend server.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Open Modal for Creating Category
  const handleOpenAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryNameInput('');
    setShowCategoryModal(true);
  };

  // Open Modal for Editing Category
  const handleOpenEditCategory = (cat) => {
    setEditingCategoryId(cat.id || cat.name);
    setCategoryNameInput(cat.name);
    setShowCategoryModal(true);
  };

  // Save Category (Create or Update)
  const handleSaveCategory = async () => {
    if (!categoryNameInput.trim()) {
      showToast('Please enter a category name.', 'error');
      return;
    }

    try {
      const url = editingCategoryId ? `/api/kb/categories/${editingCategoryId}` : '/api/kb/categories';
      const method = editingCategoryId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryNameInput.trim() })
      });

      if (res.ok) {
        const newCatName = categoryNameInput.trim();
        setCategoryNameInput('');
        setEditingCategoryId(null);
        setShowCategoryModal(false);
        setFormData(prev => ({ ...prev, category: newCatName }));
        showToast(editingCategoryId ? 'Category updated successfully.' : 'Category created successfully.', 'success');
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Failed to save category: ${errData.error || errData.message || 'Server error'}`, 'error');
      }
    } catch (err) {
      console.error("Failed to save category:", err);
      showToast('Network error while saving category.', 'error');
    }
  };

  // View Article Details
  const handleViewArticle = async (article) => {
    const nextViews = (Number(article.views) || 0) + 1;
    const updatedArticle = { ...article, views: nextViews };

    setSelectedArticleForView(updatedArticle);
    setArticles(prevArticles => 
      prevArticles.map(a => a.id === article.id ? updatedArticle : a)
    );

    try {
      const res = await fetch(`/api/kb/articles/${article.id}/view`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id || null, userEmail: user.email || null })
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && typeof data.views === 'number') {
          const syncedArticle = { ...article, views: data.views };
          setSelectedArticleForView(syncedArticle);
          setArticles(prevArticles => 
            prevArticles.map(a => a.id === article.id ? syncedArticle : a)
          );
        }
      }
    } catch (err) {
      console.error("Failed to increment views:", err);
    }
  };

  // Filter Articles
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (article.category && article.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter Quick Info Articles
  const quickInfos = articles.filter(a => a.is_quick_info && a.status === 'Published');

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto font-sans relative">
      
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Knowledge Base</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">Find step-by-step guides, visual diagrams, quick info, and IT policies.</p>
        </div>

        {/* Top Actions for IT Staff */}
        {isItStaff && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-white border border-gray-200 pl-4 pr-9 py-2.5 rounded-2xl text-xs font-semibold text-gray-700 shadow-sm cursor-pointer hover:border-gray-300 outline-none"
              >
                <option value="All">All Categories</option>
                {categories.map((cat, idx) => (
                  <option key={cat.id || idx} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button 
              onClick={handleNewArticle}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition"
            >
              <Plus className="w-3.5 h-3.5" /> New Article / Quick Info
            </button>
          </div>
        )}
      </div>

      {/* IT Staff Navigation Tabs */}
      {isItStaff && (
        <div className="flex border-b border-gray-200 gap-8 text-xs font-semibold">
          <button 
            onClick={() => { setActiveSubTab('manage'); setShowEditor(false); }}
            className={`pb-3 border-b-2 transition ${activeSubTab === 'manage' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Manage Knowledge Base
          </button>
          <button 
            onClick={() => setActiveSubTab('browse')}
            className={`pb-3 border-b-2 transition ${activeSubTab === 'browse' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            User View Preview
          </button>
        </div>
      )}

      {/* ================= STANDARD USER VIEW ================= */}
      {(!isItStaff || activeSubTab === 'browse') && (
        <div className="space-y-6">

          {/* QUICK INFOS & ANNOUNCEMENTS BANNER */}
          {quickInfos.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border border-amber-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20">
                    <Zap className="w-4 h-4 fill-current animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Quick Info & Notice Board</h2>
                    <p className="text-[11px] text-gray-500 font-medium">Important announcements and urgent troubleshooting guides.</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                  {quickInfos.length} Active Notice{quickInfos.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickInfos.map((info) => (
                  <div 
                    key={info.id}
                    onClick={() => handleViewArticle(info)}
                    className="bg-white/90 backdrop-blur-sm border border-amber-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition cursor-pointer flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      {info.image_url && (
                        <div className="h-32 w-full mb-3 rounded-xl overflow-hidden bg-gray-100 border border-gray-200/60 relative">
                          <img 
                            src={info.image_url} 
                            alt={info.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 shrink-0">
                          Quick Info
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium truncate">{info.category}</span>
                      </div>
                      <h3 className="text-xs font-extrabold text-gray-900 group-hover:text-blue-600 transition mt-1.5 line-clamp-1">
                        {info.title}
                      </h3>
                      <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                        {info.summary || info.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px] text-gray-400 font-medium">
                      <span>By {info.author || 'IT Support'}</span>
                      <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-1">
                        View Solution <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIN CATEGORIES & ARTICLES GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Categories Sidebar */}
            <div className="lg:col-span-4 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-900">Categories</h2>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold transition ${
                    selectedCategory === 'All' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${selectedCategory === 'All' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span>All Categories</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                    {articles.length}
                  </span>
                </button>

                {categories.map((cat, idx) => {
                  const IconComponent = getCategoryIcon(cat.name);
                  return (
                    <button
                      key={cat.id || idx}
                      onClick={() => setSelectedCategory(cat.name === selectedCategory ? 'All' : cat.name)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold transition ${
                        selectedCategory === cat.name ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${selectedCategory === cat.name ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span>{cat.name}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedCategory === cat.name ? 'bg-blue-200/60 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {cat.article_count || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Articles List */}
            <div className="lg:col-span-8 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-900">
                {selectedCategory === 'All' ? 'Articles & Solvers' : `${selectedCategory} Solutions`}
              </h2>
              
              {loading ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading knowledge base articles...</div>
              ) : filteredArticles.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">No articles found matching your search.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredArticles.map((article) => (
                    <div 
                      key={article.id} 
                      onClick={() => handleViewArticle(article)}
                      className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4 hover:bg-gray-50/80 p-3 rounded-2xl transition cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5">
                        {article.image_url ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 mt-0.5">
                            <img src={article.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-gray-900 hover:text-blue-600 transition">{article.title}</h3>
                            {article.is_quick_info && (
                              <span className="px-2 py-0.2 bg-amber-100 text-amber-700 text-[9px] font-black rounded-md">
                                Quick Info
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{article.summary || article.content}</p>
                          <span className="text-[10px] text-gray-400 font-medium mt-1 block">{article.category} • By {article.author || 'IT Support'}</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 shrink-0 pt-1">
                        {formatViews(article.views)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= IT STAFF MANAGEMENT VIEW ================= */}
      {isItStaff && activeSubTab === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Categories Management */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Categories</h3>
              <button 
                onClick={handleOpenAddCategory}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                + New Category
              </button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition ${
                  selectedCategory === 'All' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>All Categories</span>
                <span className="text-gray-400 text-[11px] font-medium">{articles.length}</span>
              </button>
              {categories.map((cat, idx) => {
                const IconComponent = getCategoryIcon(cat.name);
                return (
                  <div 
                    key={cat.id || idx} 
                    className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition ${
                      selectedCategory === cat.name ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCategory(cat.name === selectedCategory ? 'All' : cat.name)}
                      className="flex items-center gap-2.5 truncate flex-1 text-left"
                    >
                      <IconComponent className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </button>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-gray-400 text-[11px] font-medium mr-1">{cat.article_count || 0}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenEditCategory(cat); }} 
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-blue-600 transition"
                        title="Edit Category"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); triggerDeleteCategory(cat.id, cat.name); }} 
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-gray-500 hover:text-red-600 transition"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: Articles Table */}
          <div className={`${showEditor ? 'lg:col-span-5' : 'lg:col-span-9'} bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden transition-all duration-300`}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900">Articles & Solvers ({filteredArticles.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold bg-gray-50/50">
                    <th className="py-4 px-4 font-medium">Title</th>
                    <th className="py-4 px-2 font-medium">Category</th>
                    <th className="py-4 px-2 font-medium">Type</th>
                    <th className="py-4 px-2 font-medium">Status</th>
                    <th className="py-4 px-2 font-medium">Views</th>
                    <th className="py-4 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredArticles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-4 px-4 font-semibold text-blue-600 max-w-[200px] truncate">
                        <div className="flex items-center gap-2">
                          {article.image_url && <ImageIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                          <span onClick={() => handleViewArticle(article)} className="cursor-pointer hover:underline truncate">
                            {article.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-gray-600">{article.category}</td>
                      <td className="py-4 px-2">
                        {article.is_quick_info ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-black text-[9px] rounded-md flex items-center gap-1 w-max">
                            <Zap className="w-2.5 h-2.5 fill-current" /> Quick Info
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">Standard</span>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          article.status === 'Published' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {article.status}
                        </span>
                      </td>
                      <td className="py-4 px-2 font-medium text-gray-600">{formatViews(article.views)}</td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEditArticle(article)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => triggerDeleteArticle(article)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Editor Drawer */}
          {showEditor && (
            <div className="lg:col-span-4 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-xs font-bold text-gray-900">{editingArticleId ? 'Edit Article' : 'Add New Article'}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Publish solutions or quick info announcements.</p>
                </div>
                <button onClick={() => setShowEditor(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-xl transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveArticle} className="space-y-3 text-xs">
                
                {/* Pin as Quick Info Banner Switch */}
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="font-bold text-amber-900 text-xs">Pin as Quick Info Notice?</p>
                      <p className="text-[10px] text-amber-700">Display prominently on user home banner.</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={formData.is_quick_info}
                    onChange={(e) => setFormData({ ...formData, is_quick_info: e.target.checked })}
                    className="w-4 h-4 accent-amber-600 cursor-pointer"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Title *</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. How to connect to Berger WiFi" 
                    required
                    className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-medium text-gray-800" 
                  />
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Category *</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-medium text-gray-800 cursor-pointer"
                  >
                    <option value="" disabled>-- Select Category --</option>
                    {categories.map((cat, idx) => (
                      <option key={cat.id || idx} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Status *</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                    className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-medium text-gray-800 cursor-pointer"
                  >
                    <option value="Published">🟢 Published</option>
                    <option value="Draft">🟡 Draft</option>
                  </select>
                </div>

                {/* PREMIUM IMAGE / DIAGRAM UPLOADER */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-gray-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Image / Diagram
                    </label>
                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px] font-medium">
                      <button
                        type="button"
                        onClick={() => setUploadMode('file')}
                        className={`px-2 py-0.5 rounded-md transition ${uploadMode === 'file' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('url')}
                        className={`px-2 py-0.5 rounded-md transition ${uploadMode === 'url' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        Image URL
                      </button>
                    </div>
                  </div>

                  {uploadMode === 'file' ? (
                    <div>
                      {formData.image_url ? (
                        /* Attached Image Preview Card */
                        <div className="relative rounded-2xl border border-gray-200 overflow-hidden bg-gray-50 group shadow-sm">
                          <img 
                            src={formData.image_url} 
                            alt="Uploaded Attachment" 
                            className="w-full h-36 object-cover" 
                          />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-[2px]">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 bg-white/90 hover:bg-white text-gray-800 text-[11px] font-semibold rounded-xl shadow transition flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3 h-3 text-blue-600" /> Change
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, image_url: '' })}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-xl shadow transition flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-emerald-500/90 backdrop-blur-md text-white text-[9px] font-bold rounded-md flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Attached
                          </div>
                        </div>
                      ) : (
                        /* Drag and Drop Zone */
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-1.5 ${
                            isDragging 
                              ? 'border-blue-500 bg-blue-50/70 scale-[1.01] shadow-inner' 
                              : 'border-gray-200 bg-gray-50/60 hover:bg-gray-100/70 hover:border-gray-300'
                          }`}
                        >
                          <div className="p-2.5 bg-white border border-gray-200/80 rounded-2xl shadow-sm text-blue-600">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">
                              Click to upload <span className="font-normal text-gray-500">or drag and drop</span>
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WEBP or GIF (Max 5MB)</p>
                          </div>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  ) : (
                    /* Image URL Input */
                    <div className="space-y-2">
                      <div className="relative">
                        <input 
                          type="url" 
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          placeholder="https://images.example.com/guide-screenshot.png" 
                          className="w-full bg-white border border-gray-200 pl-8 pr-3 py-2 rounded-xl outline-none focus:border-blue-500 font-medium text-gray-800 text-xs" 
                        />
                        <Link className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                      {formData.image_url && (
                        <div className="h-28 w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50 relative">
                          <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Summary / Headline</label>
                  <textarea 
                    rows={2} 
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Brief 1-sentence summary..." 
                    className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl outline-none focus:border-blue-500 text-gray-700 resize-none font-medium" 
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Content / Resolution Steps *</label>
                  <textarea 
                    rows={6} 
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Detailed instructions describing how to solve..." 
                    required
                    className="w-full bg-white p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-gray-700 text-xs resize-none font-sans" 
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowEditor(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition">
                    Save Article
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ================= FULL ARTICLE / QUICK INFO READING MODAL (EXPANDED & WIDENED) ================= */}
      {selectedArticleForView && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl xl:max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 relative my-auto">
            
            {/* Header / Meta Bar */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                    {selectedArticleForView.category}
                  </span>
                  {selectedArticleForView.is_quick_info && (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                      <Zap className="w-3.5 h-3.5 fill-current" /> Quick Info
                    </span>
                  )}
                  <span className="text-xs text-gray-400 font-medium ml-auto sm:ml-0">
                    {formatViews(selectedArticleForView.views)}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-snug">
                  {selectedArticleForView.title}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  Published by <span className="text-gray-700 font-semibold">{selectedArticleForView.author || 'IT Support'}</span>
                </p>
              </div>

              <button 
                onClick={() => setSelectedArticleForView(null)} 
                className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-2xl transition shrink-0"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Body Grid / Stack */}
            <div className="space-y-6">
              
              {/* Illustrated Image / Diagram Attachment with High Visibility */}
              {selectedArticleForView.image_url && (
                <div className="group relative rounded-3xl overflow-hidden border border-gray-200/80 bg-slate-900/5 shadow-sm transition hover:shadow-md">
                  <div className="w-full max-h-[480px] min-h-[220px] flex items-center justify-center p-2 bg-slate-950/5">
                    <img 
                      src={selectedArticleForView.image_url} 
                      alt={selectedArticleForView.title} 
                      onClick={() => setLightboxImage(selectedArticleForView.image_url)}
                      className="w-full max-h-[460px] object-contain rounded-2xl cursor-zoom-in transition duration-300 group-hover:scale-[1.01]"
                    />
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      onClick={() => setLightboxImage(selectedArticleForView.image_url)}
                      className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> Expand Image
                    </button>
                  </div>
                </div>
              )}

              {/* Summary Highlight Card */}
              {selectedArticleForView.summary && (
                <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-100/80 rounded-2xl text-xs sm:text-sm font-semibold text-blue-950 leading-relaxed shadow-sm">
                  <div className="text-[10px] uppercase font-black text-blue-600 tracking-wider mb-1">Summary Overview</div>
                  {selectedArticleForView.summary}
                </div>
              )}

              {/* Main Body Text */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-gray-400">Detailed Instructions & Solution</h3>
                <div className="p-5 bg-gray-50/60 border border-gray-100 rounded-2xl text-xs sm:text-sm text-gray-800 leading-relaxed font-sans whitespace-pre-line">
                  {selectedArticleForView.content}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Berger Paints Knowledge Base</span>
              <button 
                onClick={() => setSelectedArticleForView(null)} 
                className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-semibold hover:bg-gray-800 transition shadow-sm"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= LIGHTBOX / FULL-SCREEN IMAGE MODAL ================= */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-7xl max-h-[92vh] w-full h-full flex items-center justify-center p-2">
            <img 
              src={lightboxImage} 
              alt="Expanded View" 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition backdrop-blur-md"
              title="Close Fullscreen View"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* ================= CREATE / EDIT CATEGORY MODAL ================= */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900">
              {editingCategoryId ? 'Edit Category' : 'Add New Category'}
            </h3>
            <input 
              type="text" 
              value={categoryNameInput}
              onChange={(e) => setCategoryNameInput(e.target.value)}
              placeholder="Category Name" 
              className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategoryId(null);
                  setCategoryNameInput('');
                }} 
                className="px-4 py-2 text-xs border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCategory} 
                className="px-4 py-2 text-xs bg-blue-600 text-white rounded-xl font-semibold shadow-md shadow-blue-600/25 hover:bg-blue-700"
              >
                {editingCategoryId ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Delete {deleteTarget.type === 'category' ? 'Category' : 'Article'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteTarget.name}"</span>?
                </p>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 bg-gray-50 p-3 rounded-2xl border border-gray-100 leading-relaxed">
              {deleteTarget.type === 'category'
                ? 'This action cannot be undone. Articles attached to this category will remain, but will no longer be grouped under it.'
                : 'This action cannot be undone. The article will be permanently removed from the knowledge base.'}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs bg-red-600 text-white rounded-xl font-semibold shadow-md shadow-red-600/25 hover:bg-red-700 transition"
              >
                Delete {deleteTarget.type === 'category' ? 'Category' : 'Article'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOAST NOTIFICATION ================= */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-800 transition-all">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{toast.message}</span>
          <button 
            onClick={() => setToast(prev => ({ ...prev, show: false }))}
            className="text-gray-400 hover:text-white ml-2 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-[11px] text-gray-400 font-medium">
        © 2026 Berger Paints IT Support. All rights reserved.
      </div>

    </div>
  );
}