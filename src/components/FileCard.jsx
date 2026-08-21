import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { downloadFile } from '../lib/supabase';
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
  HardDrive
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
  const fileStyle = getFileStyle(file.name);
  const IconComponent = fileStyle.icon;

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(file);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
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

  if (isGridView) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="glass glass-hover rounded-xl p-5 border border-slate-800 flex flex-col justify-between h-48 select-none group relative overflow-hidden"
      >
        {/* Top bar with Icon, Star status, and Actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-3 rounded-lg border ${fileStyle.color} flex items-center justify-center shadow-inner`}>
              <IconComponent className="w-6 h-6" />
            </div>
            
            {/* Star toggle button */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStar(file); }}
              title={file.starred ? "Remove Favorite" : "Add Favorite"}
              className={`p-2 rounded-lg border transition-all duration-200 active:scale-90 ${
                file.starred 
                  ? 'bg-amber-500/10 border-amber-500/35 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                  : 'bg-slate-900/40 hover:bg-slate-900 border-slate-800 text-slate-500 hover:text-amber-400'
              }`}
            >
              <Star className="w-4 h-4" fill={file.starred ? "currentColor" : "none"} />
            </button>
          </div>
          
          {/* Hover actions group */}
          <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(file); }}
              title="Preview File"
              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              title={isDownloading ? "Generating..." : "Download File"}
              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteClick}
              title="Delete File"
              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center File Info */}
        <div className="mt-4 flex-1 min-w-0">
          <h3 
            className="text-sm font-semibold text-slate-100 hover:text-brand-400 transition-colors truncate"
            title={file.name}
          >
            {file.name}
          </h3>
          <span className="inline-block mt-1 text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            {fileStyle.label}
          </span>
        </div>

        {/* Bottom Metadata bar */}
        <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between text-xs text-slate-400">
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
      className="glass rounded-xl p-3 border border-slate-800 hover:border-slate-700/80 flex items-center justify-between gap-4 group transition-colors select-none"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Star Button in list */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStar(file); }}
          title={file.starred ? "Remove Favorite" : "Add Favorite"}
          className={`p-1.5 rounded-lg border transition-all duration-200 active:scale-90 flex-shrink-0 ${
            file.starred 
              ? 'bg-amber-500/10 border-amber-500/35 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]' 
              : 'bg-slate-900/40 hover:bg-slate-900 border-slate-800 text-slate-500 hover:text-amber-400'
          }`}
        >
          <Star className="w-4 h-4" fill={file.starred ? "currentColor" : "none"} />
        </button>

        {/* Color-coded Icon Box */}
        <div className={`p-2 rounded-lg border ${fileStyle.color} flex items-center justify-center flex-shrink-0 shadow-inner`}>
          <IconComponent className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 
            className="text-sm font-semibold text-slate-100 truncate pr-4"
            title={file.name}
          >
            {file.name}
          </h3>
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

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(file); }}
          className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Preview</span>
        </button>
        
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{isDownloading ? "..." : "Download"}</span>
        </button>
        
        <button
          onClick={handleDeleteClick}
          className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-red-400 transition-all flex items-center gap-1.5 text-xs"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </motion.div>
  );
}
export { formatBytes, formatDate };
