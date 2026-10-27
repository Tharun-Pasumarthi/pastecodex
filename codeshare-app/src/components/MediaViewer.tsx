import React, { useState, useEffect, useMemo } from 'react';
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
  Plus,
  Files,
  LayoutGrid,
  Maximize2,
} from 'lucide-react';

interface MediaViewerProps {
  media?: AttachedMedia | null;
  mediaList?: AttachedMedia[];
  activeMediaId?: string | null;
  onSelectMedia?: (id: string) => void;
  onRemove: (mediaId?: string) => void;
  onDownload: (media?: AttachedMedia) => void;
  onOpenFileUpload?: () => void;
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
  mediaList = [],
  activeMediaId,
  onSelectMedia,
  onRemove,
  onDownload,
  onOpenFileUpload,
}) => {
  // Normalize current media to view
  const allMedia = useMemo(() => {
    if (mediaList.length > 0) return mediaList;
    if (media) return [media];
    return [];
  }, [mediaList, media]);

  const currentMedia = useMemo(() => {
    if (activeMediaId) {
      const found = allMedia.find((m) => m.id === activeMediaId);
      if (found) return found;
    }
    return media || allMedia[0] || null;
  }, [allMedia, activeMediaId, media]);

  const [viewMode, setViewMode] = useState<'focus' | 'grid'>('focus');
  const [zoom, setZoom] = useState(1);
  const [blobUrl, setBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!currentMedia?.dataUrl) {
      setBlobUrl('');
      return;
    }
    try {
      const blob = dataUrlToBlob(currentMedia.dataUrl);
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch {
      setBlobUrl(currentMedia.dataUrl);
    }
  }, [currentMedia?.dataUrl]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleOpenExternal = (item?: AttachedMedia) => {
    const target = item || currentMedia;
    if (!target) return;
    const url = target.dataUrl;
    window.open(url, '_blank');
  };

  if (allMedia.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#121418',
          color: 'var(--text-muted)',
        }}
      >
        <Files size={48} style={{ opacity: 0.4, marginBottom: '1rem' }} />
        <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
          No attached files
        </h3>
        <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Attach multiple PDFs or Images to this encrypted room.
        </p>
        {onOpenFileUpload && (
          <button className="btn btn-primary btn-sm" onClick={onOpenFileUpload}>
            <Plus size={14} /> Attach Files
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="media-viewer-container"
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#121418',
        overflow: 'hidden',
      }}
    >
      {/* File Selector Tabs when multiple files are attached */}
      <div
        className="media-tabs-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#16191f',
          borderBottom: '1px solid var(--border-light)',
          padding: '0.35rem 0.75rem',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              marginRight: '0.35rem',
              whiteSpace: 'nowrap',
            }}
          >
            Files ({allMedia.length}):
          </span>

          {allMedia.map((item) => {
            const isActive = viewMode === 'focus' && item.id === currentMedia?.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setViewMode('focus');
                  if (onSelectMedia) onSelectMedia(item.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  border: isActive
                    ? '1px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid transparent',
                  backgroundColor: isActive
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'var(--bg-tertiary)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
                title={item.name}
              >
                {item.type === 'pdf' ? (
                  <FileText size={14} color="#ef4444" />
                ) : (
                  <ImageIcon size={14} color="#3b82f6" />
                )}
                <span
                  style={{
                    maxWidth: '140px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.name}
                </span>
              </button>
            );
          })}

          {onOpenFileUpload && (
            <button
              onClick={onOpenFileUpload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                border: '1px dashed var(--border-medium)',
                backgroundColor: 'transparent',
                color: '#60a5fa',
                fontSize: '0.75rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Add more files"
            >
              <Plus size={13} /> Add
            </button>
          )}
        </div>

        {/* View Mode Switcher: Focus vs Grid */}
        {allMedia.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid var(--border-light)',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setViewMode('focus')}
              style={{
                padding: '0.25rem 0.55rem',
                fontSize: '0.75rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: viewMode === 'focus' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'focus' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              title="Focus single file view"
            >
              <Maximize2 size={12} />
              <span className="nav-btn-text">Single</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.25rem 0.55rem',
                fontSize: '0.75rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: viewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              title="View all files side-by-side in grid"
            >
              <LayoutGrid size={12} />
              <span className="nav-btn-text">View All ({allMedia.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* MULTI-FILE GRID VIEW */}
      {viewMode === 'grid' && allMedia.length > 1 ? (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.25rem',
            alignContent: 'start',
            backgroundColor: '#101216',
          }}
        >
          {allMedia.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-tertiary)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    overflow: 'hidden',
                    maxWidth: '190px',
                  }}
                >
                  {item.type === 'pdf' ? (
                    <FileText size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                  ) : (
                    <ImageIcon size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#fff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-dim)',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {formatFileSize(item.size)}
                </span>
              </div>

              {/* Card Preview Body */}
              <div
                style={{
                  height: '220px',
                  backgroundColor: item.type === 'image' ? '#181a1e' : '#22252a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (onSelectMedia) onSelectMedia(item.id);
                  setViewMode('focus');
                }}
                title="Click to focus this file"
              >
                {item.type === 'image' ? (
                  <img
                    src={item.dataUrl}
                    alt={item.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <iframe
                    src={item.dataUrl}
                    title={item.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      pointerEvents: 'none', // Allows clicking card to open focus view
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Maximize2 size={11} /> Click to expand
                </div>
              </div>

              {/* Card Footer Actions */}
              <div
                style={{
                  padding: '0.5rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      if (onSelectMedia) onSelectMedia(item.id);
                      setViewMode('focus');
                    }}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    <Maximize2 size={12} /> Focus
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenExternal(item)}
                    style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                    title="Pop out in new tab"
                  >
                    <ExternalLink size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => onDownload(item)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    title="Download file"
                  >
                    <Download size={12} />
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ color: '#f87171', padding: '0.25rem 0.45rem' }}
                    onClick={() => onRemove(item.id)}
                    title="Delete file"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* SINGLE FILE FOCUS VIEW */
        <>
          {currentMedia && (
            <>
              {/* Media Active Toolbar */}
              <div
                className="media-top-toolbar"
                style={{
                  height: '46px',
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 1rem',
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  {currentMedia.type === 'pdf' ? (
                    <div
                      style={{
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={18} />
                      <strong
                        style={{
                          color: '#fff',
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px',
                        }}
                      >
                        {currentMedia.name}
                      </strong>
                    </div>
                  ) : (
                    <div
                      style={{
                        color: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        flexShrink: 0,
                      }}
                    >
                      <ImageIcon size={18} />
                      <strong
                        style={{
                          color: '#fff',
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px',
                        }}
                      >
                        {currentMedia.name}
                      </strong>
                    </div>
                  )}

                  <span
                    style={{
                      fontSize: '0.725rem',
                      color: 'var(--text-dim)',
                      background: 'var(--bg-tertiary)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-light)',
                      flexShrink: 0,
                    }}
                  >
                    {formatFileSize(currentMedia.size)}
                  </span>

                  {currentMedia.isEncrypted && (
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: '#34d399',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      <ShieldCheck size={12} />
                      <span>AES-256 Encrypted</span>
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    flexShrink: 0,
                  }}
                >
                  {currentMedia.type === 'image' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '6px',
                        padding: '0.15rem',
                        border: '1px solid var(--border-light)',
                        marginRight: '0.25rem',
                      }}
                    >
                      <button
                        className="btn-icon"
                        style={{ width: '26px', height: '26px' }}
                        onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                        title="Zoom in"
                      >
                        <ZoomIn size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ width: '26px', height: '26px' }}
                        onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                        title="Zoom out"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ width: '26px', height: '26px' }}
                        onClick={() => setZoom(1)}
                        title="Reset zoom"
                      >
                        <RotateCcw size={13} />
                      </button>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          color: 'var(--text-muted)',
                          padding: '0 0.3rem',
                          minWidth: '36px',
                          textAlign: 'center',
                        }}
                      >
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>
                  )}

                  {onOpenFileUpload && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={onOpenFileUpload}
                      title="Attach more files"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Plus size={13} />
                      <span className="nav-btn-text">Add File</span>
                    </button>
                  )}

                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenExternal(currentMedia)}
                    title="Open in new window"
                  >
                    <ExternalLink size={13} />
                    <span className="nav-btn-text">Pop out</span>
                  </button>

                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => onDownload(currentMedia)}
                    title="Download file"
                  >
                    <Download size={13} />
                    <span className="nav-btn-text">Download</span>
                  </button>

                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ color: '#f87171' }}
                    onClick={() => onRemove(currentMedia.id)}
                    title="Delete this file"
                  >
                    <Trash2 size={13} />
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
                  backgroundColor:
                    currentMedia.type === 'image' ? '#181a1e' : '#2a2e35',
                  backgroundImage:
                    currentMedia.type === 'image'
                      ? 'linear-gradient(45deg, #14161a 25%, transparent 25%), linear-gradient(-45deg, #14161a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #14161a 75%), linear-gradient(-45deg, transparent 75%, #14161a 75%)'
                      : 'none',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                }}
              >
                {currentMedia.type === 'pdf' ? (
                  <iframe
                    src={blobUrl || currentMedia.dataUrl}
                    title={currentMedia.name}
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
                      src={currentMedia.dataUrl}
                      alt={currentMedia.name}
                      style={{
                        maxWidth: '90vw',
                        maxHeight: '75vh',
                        borderRadius: '8px',
                        boxShadow: '0 20px 30px rgba(0,0,0,0.6)',
                        border: '1px solid var(--border-medium)',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
