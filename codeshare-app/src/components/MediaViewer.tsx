import React, { useState, useEffect } from 'react';
import type { AttachedMedia } from '../types';
import {
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

interface MediaViewerProps {
  media: AttachedMedia;
  onRemove: () => void;
  onDownload: () => void;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(parts[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  media,
  onRemove,
  onDownload,
}) => {
  const [zoom, setZoom] = useState(1);
  const [blobUrl, setBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!media.dataUrl) return;
    try {
      const blob = dataUrlToBlob(media.dataUrl);
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch {
      setBlobUrl(media.dataUrl);
    }
  }, [media.dataUrl]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleOpenExternal = () => {
    const targetUrl = blobUrl || media.dataUrl;
    window.open(targetUrl, '_blank');
  };

  return (
    <div className="media-viewer-container" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: '#121418', overflow: 'hidden' }}>
      {/* Media Top Toolbar */}
      <div
        className="media-top-toolbar"
        style={{
          height: '46px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {media.type === 'pdf' ? (
            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={18} />
              <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{media.name}</strong>
            </div>
          ) : (
            <div style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ImageIcon size={18} />
              <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{media.name}</strong>
            </div>
          )}

          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              background: 'var(--bg-tertiary)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--border-light)',
            }}
          >
            {formatFileSize(media.size)}
          </span>

          {media.isEncrypted && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.15rem 0.55rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontWeight: 500,
              }}
            >
              <ShieldCheck size={12} />
              <span>AES-256 Encrypted • Firebase Cloud</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {media.type === 'image' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '6px',
                padding: '0.15rem',
                border: '1px solid var(--border-light)',
                marginRight: '0.5rem',
              }}
            >
              <button
                className="btn-icon"
                style={{ width: '28px', height: '28px' }}
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                title="Zoom in"
              >
                <ZoomIn size={14} />
              </button>
              <button
                className="btn-icon"
                style={{ width: '28px', height: '28px' }}
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                title="Zoom out"
              >
                <ZoomOut size={14} />
              </button>
              <button
                className="btn-icon"
                style={{ width: '28px', height: '28px' }}
                onClick={() => setZoom(1)}
                title="Reset zoom"
              >
                <RotateCcw size={14} />
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 0.4rem', minWidth: '40px', textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </span>
            </div>
          )}

          <button
            className="btn btn-sm btn-secondary"
            onClick={handleOpenExternal}
            title="Open in new window"
          >
            <ExternalLink size={14} />
            <span>Pop out</span>
          </button>

          <button
            className="btn btn-sm btn-primary"
            onClick={onDownload}
            title="Download file"
          >
            <Download size={14} />
            <span>Download</span>
          </button>

          <button
            className="btn btn-sm btn-secondary"
            style={{ color: '#f87171' }}
            onClick={onRemove}
            title="Remove attachment"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Media Canvas */}
      <div
        style={{
          flex: 1,
          height: 'calc(100% - 46px)',
          overflow: 'auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: media.type === 'image' ? '#181a1e' : '#2a2e35',
          backgroundImage:
            media.type === 'image'
              ? 'linear-gradient(45deg, #14161a 25%, transparent 25%), linear-gradient(-45deg, #14161a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #14161a 75%), linear-gradient(-45deg, transparent 75%, #14161a 75%)'
              : 'none',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      >
        {media.type === 'pdf' ? (
          <iframe
            src={blobUrl || media.dataUrl}
            title={media.name}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#fff',
            }}
          />
        ) : (
          <div
            style={{
              padding: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s ease-out',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={media.dataUrl}
              alt={media.name}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                borderRadius: '8px',
                boxShadow: '0 20px 30px rgba(0,0,0,0.6)',
                border: '1px solid var(--border-medium)',
                objectFit: 'contain',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
