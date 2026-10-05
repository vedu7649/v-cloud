import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ExternalLink, FileText, Loader2, Maximize2, Minimize2, HardDrive, Clock } from 'lucide-react';
import { downloadFile, getPreviewUrl, formatDate, formatBytes } from './FileCard';

export default function FilePreviewModal({ file, onClose }) {
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  const ext = file.name.split('.').pop().toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';
  const isText = ['txt', 'md', 'json', 'js', 'html', 'css', 'py', 'csv', 'sql', 'log'].includes(ext);

  useEffect(() => {
    let isMounted = true;
    async function loadPreview() {
      setLoading(true);
      setError(null);
      try {
        const url = await getPreviewUrl(file.storage_path);
        if (!isMounted) return;
        setSignedUrl(url);

        if (isText) {
          const res = await fetch(url);
          const text = await res.text();
          if (isMounted) setTextContent(text);
        }
      } catch (err) {
        console.error("Preview load error:", err);
        if (isMounted) setError("Failed to generate preview URL. " + (err.message || ''));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (file) {
      loadPreview();
    }
    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleDownloadClick = async () => {
    setIsDownloading(true);
    try {
      await downloadFile(file.storage_path, file.name);
    } catch (err) {
      alert("Download failed: " + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`glass border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full transition-all ${
            isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-4xl max-h-[90vh] h-[85vh]'
          }`}
        >
          {/* Header Bar */}
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 truncate" title={file.name}>
                  {file.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1 font-mono">
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    {formatBytes(file.size)}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {formatDate(file.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons for Big Screens */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50"
                title="Download file"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">{isDownloading ? 'Downloading...' : 'Download'}</span>
              </button>

              {signedUrl && (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs hidden sm:flex"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-all active:scale-95"
                title="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Content Viewer Area */}
          <div className="flex-1 bg-slate-950/60 p-4 sm:p-6 overflow-auto flex items-center justify-center min-h-0 relative">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                <span className="text-xs font-semibold text-slate-400">Loading College File Preview...</span>
              </div>
            ) : error ? (
              <div className="text-center max-w-md p-6 glass rounded-2xl border border-red-500/30">
                <p className="text-sm font-semibold text-red-300">{error}</p>
                <button
                  onClick={handleDownloadClick}
                  className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-medium"
                >
                  Direct Download File
                </button>
              </div>
            ) : isImage ? (
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src={signedUrl}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-800"
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={signedUrl}
                title={file.name}
                className="w-full h-full rounded-xl border border-slate-800 bg-white"
              />
            ) : isText ? (
              <pre className="w-full h-full overflow-auto p-4 bg-slate-900/90 text-slate-200 rounded-xl font-mono text-xs border border-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                {textContent}
              </pre>
            ) : (
              // Binary / Archive / Office Documents fallback preview card
              <div className="text-center max-w-md p-8 glass rounded-2xl border border-slate-800 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-200">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Direct inline preview is not supported for <span className="font-mono text-brand-400 uppercase">.{ext}</span> files. You can download or open it using an external application.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={handleDownloadClick}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all"
                  >
                    Download File ({formatBytes(file.size)})
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
