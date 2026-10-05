import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadFile, getPreviewUrl } from '../lib/supabase';
import { 
  FileArchive, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  File, 
  Download, 
  Trash2, 
  Star,
  Eye,
  Clock,
  HardDrive,
  MoreVertical
} from 'lucide-react';

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getFileStyle = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  switch (ext) {
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return {
        icon: FileArchive,
        color: 'text-amber-400 bg-amber-400/10 border-amber-500/25',
        label: 'Archive'
      };
    case 'pdf':
      return {
        icon: FileText,
        color: 'text-rose-400 bg-rose-400/10 border-rose-500/25',
        label: 'PDF Document'
      };
    case 'doc':
    case 'docx':
      return {
        icon: FileText,
        color: 'text-sky-400 bg-sky-400/10 border-sky-500/25',
        label: 'Word Document'
      };
    case 'xls':
    case 'xlsx':
    case 'csv':
      return {
        icon: FileSpreadsheet,
        color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/25',
        label: 'Spreadsheet'
      };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
    case 'gif':
    case 'svg':
      return {
        icon: FileImage,
        color: 'text-violet-400 bg-violet-400/10 border-violet-500/25',
        label: 'Image file'
      };
    case 'txt':
    case 'md':
      return {
        icon: FileText,
        color: 'text-slate-400 bg-slate-400/10 border-slate-500/25',
        label: 'Text File'
      };
    default:
      return {
        icon: File,
        color: 'text-brand-400 bg-brand-400/10 border-brand-500/25',
        label: 'Document'
      };
  }
};

export default function FileCard({ file, onDelete, onToggleStar, onPreview, isGridView }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const fileStyle = getFileStyle(file.name);
  const IconComponent = fileStyle.icon;

  // Close 3-dots menu on click/tap outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      onDelete(file);
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadFile(file.storage_path, file.name);
    } catch (err) {
      console.error("Signed download link generation failed:", err);
      alert("Failed to initiate secure download. Please check your network connection.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Three Dots Dropdown Component
  const renderThreeDotsMenu = () => (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        aria-label="Actions Menu"
        title="Three dots menu - Actions"
        className={`p-2.5 sm:p-2.5 rounded-xl border transition-all duration-200 active:scale-90 flex items-center justify-center shadow-lg ${
          menuOpen 
            ? 'bg-brand-600 border-brand-500 text-white ring-2 ring-brand-500/40' 
            : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-brand-400 hover:text-white'
        }`}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-52 glass rounded-xl border border-slate-700 shadow-2xl p-1.5 backdrop-blur-2xl bg-slate-950/98 space-y-1 text-left"
          >
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
              <span>File Actions</span>
              <span className="text-brand-400 font-mono text-[9px] bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">Menu</span>
            </div>

            {/* Action 1: Preview File */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                if (onPreview) onPreview(file);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/80 text-slate-200 hover:text-white text-xs font-medium transition-colors text-left"
            >
              <Eye className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>Preview File</span>
            </button>

            {/* Action 2: Download File */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/80 text-slate-200 hover:text-white text-xs font-medium transition-colors text-left disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{isDownloading ? "Generating link..." : "Download File"}</span>
            </button>

            {/* Action 3: Star / Favorite */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                if (onToggleStar) onToggleStar(file);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/80 text-slate-200 hover:text-white text-xs font-medium transition-colors text-left"
            >
              <Star className={`w-4 h-4 flex-shrink-0 ${file.starred ? 'text-amber-400 fill-amber-400' : 'text-amber-400'}`} />
              <span>{file.starred ? "Remove Favorite" : "Add to Favorites"}</span>
            </button>

            <div className="border-t border-slate-800/80 my-1"></div>

            {/* Action 4: DELETE FILE BUTTON */}
            <button
              type="button"
              onClick={handleDeleteClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:text-white text-xs font-bold transition-all text-left shadow-sm active:scale-95 cursor-pointer mt-1"
            >
              <Trash2 className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>Delete File</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // GRID VIEW LAYOUT
  if (isGridView) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`glass glass-hover rounded-xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between h-52 select-none relative ${
          menuOpen ? 'z-40 border-brand-500/50 ring-1 ring-brand-500/30' : 'z-10'
        }`}
      >
        {/* Top bar: ONLY Icon/Star indicator and the 3-Dots Button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-3 rounded-xl border ${fileStyle.color} flex items-center justify-center shadow-inner`}>
              <IconComponent className="w-6 h-6" />
            </div>

            {file.starred && (
              <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400" title="Starred Favorite">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
              </span>
            )}
          </div>

          {/* THREE DOTS MENU BUTTON */}
          {renderThreeDotsMenu()}
        </div>

        {/* Center File Info */}
        <div className="mt-3 flex-1 min-w-0">
          <h3 
            className="text-sm font-semibold text-slate-100 hover:text-brand-400 transition-colors truncate cursor-pointer"
            title={file.name}
            onClick={(e) => { e.stopPropagation(); if (onPreview) onPreview(file); }}
          >
            {file.name}
          </h3>
          <span className="inline-block mt-1 text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            {fileStyle.label}
          </span>
        </div>

        {/* Bottom Metadata bar */}
        <div className="mt-3 pt-3 border-t border-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1 min-w-0">
            <Clock className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
            <span className="truncate" title={formatDate(file.created_at)}>
              {new Date(file.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 font-medium text-slate-300 bg-slate-900/40 px-2 py-0.5 rounded border border-slate-800/40">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatBytes(file.size)}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // LIST VIEW LAYOUT
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.15 }}
      className={`glass rounded-xl p-3 sm:p-3.5 border border-slate-800 hover:border-slate-700/80 flex items-center justify-between gap-4 transition-all select-none relative ${
        menuOpen ? 'z-40 border-brand-500/50 ring-1 ring-brand-500/30' : 'z-10'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Color-coded Icon Box */}
        <div className={`p-2.5 rounded-xl border ${fileStyle.color} flex items-center justify-center flex-shrink-0 shadow-inner`}>
          <IconComponent className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 
              className="text-sm font-semibold text-slate-100 truncate cursor-pointer hover:text-brand-400 transition-colors"
              title={file.name}
              onClick={(e) => { e.stopPropagation(); if (onPreview) onPreview(file); }}
            >
              {file.name}
            </h3>
            {file.starred && (
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" title="Starred Favorite" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
            <span className="text-[10px] tracking-wide font-medium uppercase px-1.5 py-0.1 rounded bg-slate-900 border border-slate-800 text-slate-500">
              {fileStyle.label}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatDate(file.created_at)}</span>
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatBytes(file.size)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* THREE DOTS MENU BUTTON IN LIST VIEW */}
      <div className="flex items-center flex-shrink-0">
        {renderThreeDotsMenu()}
      </div>
    </motion.div>
  );
}

export { formatBytes, formatDate, getPreviewUrl, downloadFile };
