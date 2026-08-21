import React, { useState, useRef } from 'react';
import { uploadFile } from '../lib/supabase';
import { Upload, X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const ALLOWED_EXTENSIONS = ['zip', 'pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'txt'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB limit for Supabase free tier

export default function UploadZone({ userId, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState({}); // Stores active uploads: { [id]: { name, progress, status, error } }
  const fileInputRef = useRef(null);

  const validateFileExtension = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  };

  const handleFiles = (files) => {
    const validFiles = Array.from(files).filter(file => {
      const isValidExt = validateFileExtension(file);
      if (!isValidExt) {
        alert(`File format not supported: "${file.name}". Supported formats: ZIP, PDF, DOCX, XLSX, PNG, JPG, TXT.`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`File too large: "${file.name}" exceeds the 50 MB limit per file.`);
        return false;
      }
      return true;
    });

    validFiles.forEach(startUpload);
  };

  const startUpload = (file) => {
    const uploadId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    setUploads(prev => ({
      ...prev,
      [uploadId]: {
        name: file.name,
        progress: 0,
        status: 'uploading',
        error: null
      }
    }));

    // Trigger Supabase upload utility
    uploadFile(file, userId, (progress) => {
      setUploads(prev => {
        if (!prev[uploadId]) return prev;
        return {
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            progress: progress
          }
        };
      });
    })
      .then((data) => {
        setUploads(prev => {
          if (!prev[uploadId]) return prev;
          return {
            ...prev,
            [uploadId]: {
              ...prev[uploadId],
              status: 'success',
              progress: 100
            }
          };
        });

        // Trigger confetti celebration on upload completion
        confetti({
          particleCount: 65,
          spread: 55,
          origin: { y: 0.85 }
        });

        // Inform parent component to refresh its database records list
        if (onUploadSuccess) onUploadSuccess();

        // Remove item after a short delay
        setTimeout(() => {
          setUploads(prev => {
            const updated = { ...prev };
            delete updated[uploadId];
            return updated;
          });
        }, 3500);
      })
      .catch((error) => {
        console.error("Supabase Storage upload failed: ", error);
        setUploads(prev => {
          if (!prev[uploadId]) return prev;
          return {
            ...prev,
            [uploadId]: {
              ...prev[uploadId],
              status: 'error',
              error: error.message || 'Failed to upload. Confirm storage limits and connection.'
            }
          };
        });
      });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current.click();
  };

  const removeUploadItem = (id) => {
    setUploads(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const activeUploadKeys = Object.keys(uploads);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInputClick}
        className={`glass rounded-xl p-8 border-2 border-dashed text-center cursor-pointer transition-all duration-300 relative group flex flex-col items-center justify-center min-h-[160px] ${
          dragActive 
            ? 'border-brand-500 bg-brand-500/5 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.01]' 
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/10 hover:bg-slate-900/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleChange}
        />
        
        <div className={`p-3 rounded-full border border-slate-800 bg-slate-900/40 text-slate-400 group-hover:text-brand-400 group-hover:border-brand-500/20 group-hover:bg-brand-500/5 transition-all duration-300 ${
          dragActive ? 'text-brand-400 border-brand-500/20 bg-brand-500/5 scale-110' : ''
        }`}>
          <Upload className="w-6 h-6 animate-pulse" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-200">
          {dragActive ? "Drop files to upload" : "Drag and drop your files here"}
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Or <span className="text-brand-400 font-medium group-hover:underline">browse files</span> from your device
        </p>
        
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-lg text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
          {ALLOWED_EXTENSIONS.map(ext => (
            <span key={ext} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
              .{ext}
            </span>
          ))}
        </div>
      </div>

      {/* Concurrent Uploads List */}
      {activeUploadKeys.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {activeUploadKeys.map(id => {
            const item = uploads[id];
            return (
              <div key={id} className="glass p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-4 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-semibold text-slate-200 truncate pr-4" title={item.name}>
                      {item.name}
                    </span>
                    <span className="font-medium text-slate-400 flex-shrink-0">
                      {item.status === 'uploading' && `${item.progress}%`}
                      {item.status === 'success' && (
                        <span className="text-green-400 flex items-center gap-1 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Finished</span>
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-red-400 flex items-center gap-1 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Error</span>
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/40">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === 'error' 
                          ? 'bg-red-500' 
                          : item.status === 'success' 
                          ? 'bg-green-500' 
                          : 'bg-gradient-to-r from-brand-600 to-indigo-500'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  {/* Error Message */}
                  {item.status === 'error' && (
                    <p className="text-[10px] text-red-300 mt-1 font-medium leading-none">
                      {item.error}
                    </p>
                  )}
                </div>

                {/* Cancel/Dismiss Action */}
                <button
                  type="button"
                  onClick={() => removeUploadItem(id)}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
