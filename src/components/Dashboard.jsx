import React, { useState, useEffect, useRef } from 'react';
import { signOut, fetchUserFiles, deleteFile, toggleStarFile, fetchStorageBreakdown, createAdminUser, SUPER_ADMIN_EMAIL } from '../lib/supabase';
import {
  LogOut,
  Grid,
  List,
  Search,
  HardDrive,
  FolderOpen,
  Loader2,
  FileCheck,
  MoreVertical,
  Star,
  Maximize,
  Minimize,
  RefreshCw,
  Users,
  UserCheck,
  UserPlus,
  Crown,
  X,
  CheckCircle
} from 'lucide-react';
import UploadZone from './UploadZone';
import FileCard, { formatBytes } from './FileCard';
import FilePreviewModal from './FilePreviewModal';

// Default storage quota of 1 GB (1024 MB) for Supabase Free Tier
const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

export default function Dashboard({ user }) {
  const [files, setFiles] = useState([]);
  const [storageBreakdown, setStorageBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGridView, setIsGridView] = useState(true);
  const [filterStarredOnly, setFilterStarredOnly] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Super Admin Create User Modal state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserSuccess, setCreateUserSuccess] = useState('');
  const [createUserError, setCreateUserError] = useState('');

  const headerMenuRef = useRef(null);

  const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL || user.email?.toLowerCase().includes('vedant');

  const loadFiles = async () => {
    setLoading(true);
    try {
      const userFiles = await fetchUserFiles(user.id);
      setFiles(userFiles || []);

      const breakdownData = await fetchStorageBreakdown(user);
      setStorageBreakdown(breakdownData || []);
    } catch (err) {
      console.error("Supabase load files error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [user.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target)) {
        setHeaderMenuOpen(false);
      }
    };
    if (headerMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [headerMenuOpen]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Failed logging out: ", err);
    }
  };

  const handleDeleteFile = async (file) => {
    setDeletingId(file.id);
    try {
      await deleteFile(file.id, file.storage_path);
      await loadFiles();
    } catch (err) {
      console.error("Error deleting file:", err);
      alert(`Failed to delete file: ${err.message || JSON.stringify(err)}`);
      loadFiles();
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStar = async (file) => {
    const targetId = file.id;
    const currentStarred = !!file.starred;
    setFiles(prev =>
      prev.map(f => (f.id === targetId ? { ...f, starred: !currentStarred } : f))
    );

    try {
      await toggleStarFile(targetId, currentStarred);
    } catch (err) {
      console.warn("Failed to persist star status to DB:", err);
    }
  };

  const toggleFullscreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        console.warn("Fullscreen request error:", err);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(err => {
        console.warn("Fullscreen exit error:", err);
      });
    }
    setHeaderMenuOpen(false);
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setCreateUserError('');
    setCreateUserSuccess('');

    if (!newUserEmail || !newUserPassword) {
      setCreateUserError('Please enter a valid user email/username and password.');
      return;
    }

    if (newUserPassword.length < 6) {
      setCreateUserError('Password must be at least 6 characters long.');
      return;
    }

    setCreateUserLoading(true);
    try {
      await createAdminUser(newUserEmail, newUserPassword);
      setCreateUserSuccess(`User "${newUserEmail}" created successfully.`);
      setNewUserEmail('');
      setNewUserPassword('');
      await loadFiles();
    } catch (err) {
      console.error("Create user error:", err);
      const msg = err.message || '';
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setCreateUserError(`User "${newUserEmail}" is already registered.`);
      } else {
        setCreateUserError(msg || "Failed to create user account.");
      }
    } finally {
      setCreateUserLoading(false);
    }
  };

  const totalSizeBytes = files.reduce((acc, file) => acc + (file.size || 0), 0);
  const storagePercentage = Math.min((totalSizeBytes / STORAGE_QUOTA_BYTES) * 100, 100);

  const totalClusterBytes = storageBreakdown.reduce((acc, item) => acc + Number(item.total_bytes || 0), 0);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStar = filterStarredOnly ? !!file.starred : true;
    return matchesSearch && matchesStar;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <FolderOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            V-Cloud
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-300">
            {isSuperAdmin ? <Crown className="w-4 h-4 text-amber-400" /> : <UserCheck className="w-4 h-4 text-emerald-400" />}
            <span>{isSuperAdmin ? 'VEDANT' : user.email}</span>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 backdrop-blur-md text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-medium active:scale-95 shadow-sm"
              title="Create New User Account"
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Create User</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-red-800/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all flex items-center gap-2 text-xs font-medium active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* THREE-DOTS MENU BUTTON */}
          <div className="relative" ref={headerMenuRef}>
            <button
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
              title="Dashboard Quick Menu"
              aria-label="Header Menu"
              className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center shadow-md active:scale-95 ${
                headerMenuOpen
                  ? 'bg-brand-600 border-brand-500 text-white ring-2 ring-brand-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-brand-400 hover:text-white'
              }`}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {headerMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 glass rounded-xl border border-slate-700 shadow-2xl p-1.5 backdrop-blur-xl bg-slate-950/95 space-y-1 text-left">
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      setShowCreateUserModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Create User</span>
                  </button>
                )}

                <button
                  onClick={toggleFullscreenMode}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4 text-brand-400" />}
                  <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}</span>
                </button>

                <button
                  onClick={() => {
                    setFilterStarredOnly(!filterStarredOnly);
                    setHeaderMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
                >
                  <Star className={`w-4 h-4 ${filterStarredOnly ? 'text-amber-400 fill-amber-400' : 'text-amber-400'}`} />
                  <span>{filterStarredOnly ? "Show All Files" : "Show Favorites Only"}</span>
                </button>

                <button
                  onClick={() => {
                    loadFiles();
                    setHeaderMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span>Refresh Storage</span>
                </button>

                <button
                  onClick={() => {
                    setIsGridView(!isGridView);
                    setHeaderMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
                >
                  {isGridView ? <List className="w-4 h-4 text-indigo-400" /> : <Grid className="w-4 h-4 text-indigo-400" />}
                  <span>{isGridView ? 'List Layout' : 'Grid Layout'}</span>
                </button>

                <div className="border-t border-slate-800/80 my-1" />

                <button
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side: Upload & Usage Stats Cockpit */}
        <section className="lg:col-span-4 space-y-6">

          {/* Current Logged-in Admin Storage Quota Card */}
          <div className="glass rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <HardDrive className="w-4.5 h-4.5 text-brand-400" />
                <h2 className="text-sm font-bold">Storage Footprint</h2>
              </div>
              <span className="text-xs text-slate-500 font-semibold">{files.length} Files</span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/40">
                <div
                  className="bg-gradient-to-r from-brand-500 to-violet-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>{formatBytes(totalSizeBytes)} used</span>
                <span>{formatBytes(STORAGE_QUOTA_BYTES)} limit</span>
              </div>
            </div>
          </div>

          {/* Multi-User Storage Allocation Breakdown */}
          <div className="glass rounded-xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-400" />
                <span>Users Storage Breakdown</span>
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {storageBreakdown.length || 1} User{storageBreakdown.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3 pt-1 max-h-60 overflow-y-auto pr-1">
              {storageBreakdown.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                  <span className="truncate">{isSuperAdmin ? 'VEDANT' : user.email}</span>
                  <span className="font-mono text-slate-300">{formatBytes(totalSizeBytes)}</span>
                </div>
              ) : (
                storageBreakdown.map((item, idx) => {
                  const isCurrentUser = item.user_id === user.id;
                  const userTotal = Number(item.total_bytes || 0);
                  const percent = totalClusterBytes > 0 ? Math.round((userTotal / totalClusterBytes) * 100) : 0;

                  return (
                    <div key={item.user_id || idx} className={`p-3 rounded-xl border transition-all ${
                      isCurrentUser 
                        ? 'bg-brand-500/10 border-brand-500/30' 
                        : 'bg-slate-900/50 border-slate-800/80'
                    }`}>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="truncate pr-2 flex items-center gap-1.5 text-slate-200" title={item.user_email}>
                          <span className={`w-2 h-2 rounded-full ${isCurrentUser ? 'bg-brand-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span>{item.user_email}</span>
                        </span>
                        <span className="text-slate-300 font-mono text-[11px] flex-shrink-0">
                          {formatBytes(userTotal)}
                        </span>
                      </div>

                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/60 mb-1">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCurrentUser ? 'bg-gradient-to-r from-brand-500 to-indigo-500' : 'bg-slate-600'
                          }`}
                          style={{ width: `${Math.max(percent, 5)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>{item.file_count || 0} file{(item.file_count || 0) !== 1 ? 's' : ''}</span>
                        <span>{percent}% share</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isSuperAdmin && (
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="w-full mt-2 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Create New User</span>
              </button>
            )}
          </div>

          {/* Upload Widget */}
          <div className="glass rounded-xl p-5 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <FileCheck className="w-4.5 h-4.5 text-indigo-400" />
              <span>Upload Files</span>
            </h2>
            <UploadZone userId={user.id} onUploadSuccess={loadFiles} />
          </div>
        </section>

        {/* Right Side: File Explorer */}
        <section className="lg:col-span-8 flex flex-col space-y-4 min-w-0">

          {/* Controls Bar */}
          <div className="glass rounded-xl p-3.5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">

            {/* Search & Star Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search files..."
                  className="w-full bg-slate-900/50 hover:bg-slate-900/80 focus:bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                />
              </div>

              <button
                onClick={() => setFilterStarredOnly(!filterStarredOnly)}
                title={filterStarredOnly ? "Show All Files" : "Filter Starred Only"}
                className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${
                  filterStarredOnly
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Star className={`w-4 h-4 ${filterStarredOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span className="hidden sm:inline">Favorites</span>
              </button>
            </div>

            {/* View Style Switcher */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="bg-slate-900/60 border border-slate-800 p-1 rounded-xl flex items-center">
                <button
                  onClick={() => setIsGridView(true)}
                  className={`p-1.5 rounded-lg transition-all ${isGridView
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                    }`}
                  title="Grid Layout"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsGridView(false)}
                  className={`p-1.5 rounded-lg transition-all ${!isGridView
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                    }`}
                  title="List Layout"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Files Explorer Grid/List */}
          <div className="flex-1 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                <span className="text-xs font-semibold text-slate-400">Loading files...</span>
              </div>
            ) : filteredFiles.length === 0 ? (
              // Empty State UI
              <div className="glass rounded-xl border border-slate-800 p-12 text-center flex flex-col items-center justify-center h-full min-h-[350px]">
                <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 mb-4 animate-pulse">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-200">
                  {searchTerm || filterStarredOnly ? "No files match filter" : "No files uploaded"}
                </h3>
                {(searchTerm || filterStarredOnly) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStarredOnly(false);
                    }}
                    className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              // File List Content
              <div className={
                isGridView
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                  : "flex flex-col gap-3"
              }>
                {filteredFiles.map(file => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onDelete={handleDeleteFile}
                    onToggleStar={handleToggleStar}
                    onPreview={(targetFile) => setPreviewFile(targetFile)}
                    isGridView={isGridView}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* SUPER ADMIN CREATE USER MODAL */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none">
          <div className="glass border border-slate-700/90 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => {
                setShowCreateUserModal(false);
                setCreateUserError('');
                setCreateUserSuccess('');
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Create New User</h3>
                <p className="text-xs text-slate-400">Super Admin Authorization (VEDANT)</p>
              </div>
            </div>

            {createUserError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs flex items-start gap-2">
                <span>⚠️</span>
                <p className="flex-1">{createUserError}</p>
              </div>
            )}

            {createUserSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="flex-1">{createUserSuccess}</p>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Email or Username
                </label>
                <input
                  type="text"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@college.edu"
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
                  disabled={createUserLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
                  disabled={createUserLoading}
                />
              </div>

              <button
                type="submit"
                disabled={createUserLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 border border-emerald-300/40 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {createUserLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto py-3 text-center border-t border-slate-900 bg-slate-950 text-[10px] font-medium text-slate-600">
        V-Cloud
      </footer>
    </div>
  );
}
