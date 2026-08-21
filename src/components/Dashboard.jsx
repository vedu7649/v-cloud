import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  signOut, 
  fetchUserFiles, 
  deleteFile,
  getPreviewUrl,
  toggleStarFile
} from '../lib/supabase';
import { 
  LogOut, 
  Grid, 
  List, 
  Search, 
  HardDrive, 
  FolderOpen, 
  Loader2, 
  FileCheck,
  Star,
  Eye,
  X,
  ExternalLink,
  Download
} from 'lucide-react';
import UploadZone from './UploadZone';
import FileCard, { formatBytes } from './FileCard';

// Default storage quota of 1 GB (1024 MB) for Supabase Free Tier
const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024; 

export default function Dashboard({ user }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGridView, setIsGridView] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  
  // Starring & Previewing state
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fetch files from PostgreSQL
  const loadFiles = async () => {
    try {
      const userFiles = await fetchUserFiles(user.id);
      setFiles(userFiles || []);
    } catch (err) {
      console.error("Supabase load files error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [user.id]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Failed logging out: ", err);
    }
  };

  const handleDeleteFile = async (file) => {
    // Show standard confirm box
    const confirmed = window.confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(file.id);
    try {
      await deleteFile(file.id, file.storage_path);
      // Reload lists
      await loadFiles();
    } catch (err) {
      console.error("Error deleting file:", err);
      alert(`Failed to delete file: ${err.message || JSON.stringify(err)}`);
      await loadFiles();
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStar = async (file) => {
    try {
      await toggleStarFile(file.id, file.starred || false);
      await loadFiles();
    } catch (err) {
      console.error("Failed to star file:", err);
      alert("Could not update star status. Please ensure you executed the SQL migration in your Supabase SQL Editor:\n\nALTER TABLE public.files ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT false NOT NULL;");
    }
  };

  const handlePreview = async (file) => {
    setPreviewFile(file);
    setLoadingPreview(true);
    try {
      const url = await getPreviewUrl(file.storage_path);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Failed to fetch preview link:", err);
      alert("Failed to load secure preview link.");
      setPreviewFile(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Compute storage usage stats
  const totalSizeBytes = files.reduce((acc, file) => acc + (file.size || 0), 0);
  const storagePercentage = Math.min((totalSizeBytes / STORAGE_QUOTA_BYTES) * 100, 100);

  // Client-side search & favorite filtration
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStar = showStarredOnly ? file.starred : true;
    return matchesSearch && matchesStar;
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Premium Header */}
      <header className="glass sticky top-0 z-40 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/10">
            <FolderOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">V-Cloud</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-300">{user.email}</span>
            <span className="text-[10px] text-slate-500">Authenticated Session</span>
          </div>
          
          <button
            onClick={handleLogout}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-red-800/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all flex items-center gap-2 text-xs font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Upload & Usage Stats Cockpit */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Storage Quota Card */}
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

            {/* Quota warning */}
            {storagePercentage > 85 && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-lg text-[10px] font-semibold leading-relaxed">
                ⚠️ Running out of storage space! Delete files to free up quota.
              </div>
            )}
          </div>

          {/* Upload Widget */}
          <div className="glass rounded-xl p-5 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <FileCheck className="w-4.5 h-4.5 text-indigo-400" />
              <span>Upload College Files</span>
            </h2>
            <UploadZone userId={user.id} onUploadSuccess={loadFiles} />
          </div>
        </section>

        {/* Right Side: File Explorer */}
        <section className="lg:col-span-8 flex flex-col space-y-4 min-w-0">
          
          {/* Controls Bar */}
          <div className="glass rounded-xl p-3.5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Search Box & Starred toggle group */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative w-full sm:w-72">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Quick search college files..."
                  className="w-full bg-slate-900/50 hover:bg-slate-900/80 focus:bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                />
              </div>

              {/* Favorites Starred Only Toggle */}
              <button
                onClick={() => setShowStarredOnly(!showStarredOnly)}
                className={`w-full sm:w-auto py-2.5 px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${
                  showStarredOnly 
                    ? 'bg-amber-500/10 border-amber-500/35 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.08)]' 
                    : 'bg-slate-900/55 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={showStarredOnly ? "Show All Files" : "Show Starred Only"}
              >
                <Star className="w-3.5 h-3.5" fill={showStarredOnly ? "currentColor" : "none"} />
                <span>Favorites</span>
              </button>
            </div>

            {/* View Style Switcher */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:inline">Layout:</span>
              <div className="bg-slate-900/60 border border-slate-800 p-1 rounded-xl flex items-center">
                <button
                  onClick={() => setIsGridView(true)}
                  className={`p-1.5 rounded-lg transition-all ${
                    isGridView 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Grid Layout"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsGridView(false)}
                  className={`p-1.5 rounded-lg transition-all ${
                    !isGridView 
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
                <span className="text-xs font-semibold text-slate-400">Syncing file records...</span>
              </div>
            ) : filteredFiles.length === 0 ? (
              // Empty State UI
              <div className="glass rounded-xl border border-slate-800 p-12 text-center flex flex-col items-center justify-center h-full min-h-[350px]">
                <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 mb-4 animate-pulse">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-200">
                  {searchTerm 
                    ? "No files match search" 
                    : showStarredOnly 
                    ? "No favorite files found" 
                    : "Your cloud terminal is empty"}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto leading-relaxed">
                  {searchTerm 
                    ? `We couldn't find any file matches for "${searchTerm}".` 
                    : showStarredOnly 
                    ? "You haven't starred any files yet. Click the star icon on any file to add it here." 
                    : "No college ZIPs, PDF syllabus, images or documents detected. Drop a file in the uploader on the left to start."}
                </p>
                {(searchTerm || showStarredOnly) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setShowStarredOnly(false);
                    }}
                    className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors"
                  >
                    Reset Filters
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
                    onPreview={handlePreview}
                    isGridView={isGridView}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            {/* Click backdrop to close */}
            <div className="absolute inset-0" onClick={() => { setPreviewFile(null); setPreviewUrl(''); }} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl glass rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col max-h-[85vh] z-10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
                <div className="min-w-0 pr-4">
                  <h3 className="text-sm font-bold text-slate-200 truncate" title={previewFile.name}>
                    Preview: {previewFile.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Size: {formatBytes(previewFile.size)} &bull; Uploaded: {new Date(previewFile.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in new tab"
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  
                  <button
                    onClick={() => { setPreviewFile(null); setPreviewUrl(''); }}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center min-h-[300px] bg-slate-900/20">
                {loadingPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    <span className="text-xs text-slate-400">Loading secure preview...</span>
                  </div>
                ) : previewUrl ? (
                  // Conditional rendering based on file extension
                  (() => {
                    const ext = previewFile.name.split('.').pop().toLowerCase();
                    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
                      return (
                        <img
                          src={previewUrl}
                          alt={previewFile.name}
                          className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg border border-slate-800"
                        />
                      );
                    } else if (ext === 'pdf') {
                      return (
                        <iframe
                          src={`${previewUrl}#toolbar=0`}
                          title="PDF Preview"
                          className="w-full h-[65vh] rounded-lg border border-slate-800 bg-white"
                        />
                      );
                    } else if (['txt', 'md'].includes(ext)) {
                      return (
                        <iframe
                          src={previewUrl}
                          title="Text Preview"
                          className="w-full h-[60vh] rounded-lg border border-slate-800 bg-slate-950 text-slate-200 p-4 font-mono text-xs overflow-auto"
                        />
                      );
                    } else {
                      return (
                        <div className="text-center max-w-sm py-12">
                          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mx-auto mb-4 animate-pulse">
                            <FolderOpen className="w-8 h-8" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-200">No Online Preview Available</h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            College files such as ZIP archives, Word docs, or Excel sheets cannot be previewed natively in the browser. 
                          </p>
                          
                          <button
                            onClick={() => {
                              setPreviewFile(null);
                              setPreviewUrl('');
                              downloadFile(previewFile.storage_path, previewFile.name);
                            }}
                            className="mt-5 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/10 active:scale-95 flex items-center justify-center gap-1.5 mx-auto"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download to View</span>
                          </button>
                        </div>
                      );
                    }
                  })()
                ) : (
                  <div className="text-red-400 text-xs font-semibold">
                    Failed to load preview URL.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Footer */}
      <footer className="mt-auto py-4 text-center border-t border-slate-900 bg-slate-950 text-[10px] font-medium tracking-wide text-slate-500">
        Personal Vault v1.0.0 &bull; Secure User Storage Platform &bull; Made with React & Supabase
      </footer>
    </div>
  );
}
