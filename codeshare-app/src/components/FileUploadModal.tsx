import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Image as ImageIcon, Shield, Check, AlertCircle, Trash2, Plus } from 'lucide-react';
import type { AttachedMedia } from '../types';
import { uploadEncryptedMediaToFirebase } from '../utils/firebaseStorage';

interface FileUploadModalProps {
  codeshareId: string;
  isOpen: boolean;
  onClose: () => void;
  onAttachMedia: (media: AttachedMedia) => void;
  onAttachMultipleMedia?: (mediaList: AttachedMedia[]) => void;
  attachedMediaList?: AttachedMedia[];
  onRemoveMedia?: (id: string) => void;
  encryptionKey: string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  codeshareId,
  isOpen,
  onClose,
  onAttachMedia,
  onAttachMultipleMedia,
  attachedMediaList = [],
  onRemoveMedia,
  encryptionKey,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [encryptEnabled, setEncryptEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndAddFiles = (files: FileList | File[]) => {
    setError(null);
    const validMimes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/svg+xml',
      'image/gif',
    ];

    const newValidFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImg = file.type.startsWith('image/') || validMimes.includes(file.type);

      if (!isPdf && !isImg) {
        setError(`"${file.name}" is unsupported. Please select PDF or Image files (PNG, JPG, SVG, WEBP, GIF).`);
        continue;
      }

      if (file.size > 25 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the maximum allowed size (25MB).`);
        continue;
      }

      // Avoid exact duplicates in current pending selection
      if (!pendingFiles.some((f) => f.name === file.name && f.size === file.size)) {
        newValidFiles.push(file);
      }
    }

    if (newValidFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...newValidFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    // reset value so re-selecting same file works
    if (e.target) e.target.value = '';
  };

  const handleRemovePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAttachAll = async () => {
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setUploadProgress({ current: 0, total: pendingFiles.length });

    try {
      const uploadedMedia: AttachedMedia[] = [];

      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        setUploadProgress({ current: i + 1, total: pendingFiles.length });

        const media = await uploadEncryptedMediaToFirebase(
          codeshareId,
          file,
          encryptionKey
        );
        uploadedMedia.push(media);
      }

      if (onAttachMultipleMedia) {
        onAttachMultipleMedia(uploadedMedia);
      } else if (uploadedMedia[0]) {
        onAttachMedia(uploadedMedia[0]);
      }

      setPendingFiles([]);
      setIsProcessing(false);
      setUploadProgress(null);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error encrypting and uploading files';
      setError(message);
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '580px', width: '94%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <Upload size={18} />
            </div>
            <div>
              <h4 className="modal-title" style={{ margin: 0, fontSize: '1.05rem' }}>
                Attach Multiple Files (PDF & Images)
              </h4>
              <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                Zero-knowledge encrypted client-side with AES-GCM (256-bit)
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Multiple File Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--border-medium)'}`,
              borderRadius: '10px',
              padding: '1.75rem 1.25rem',
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(37,99,235,0.08)' : 'var(--bg-input)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '1rem',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <Upload size={20} />
              </div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                Drag &amp; drop multiple PDFs or Images here
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                or click to select multiple files at once (Max 25MB each)
              </div>
            </div>
          </div>

          {/* Pending Files to Upload */}
          {pendingFiles.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Files ready to upload ({pendingFiles.length}):</span>
                <button
                  className="btn btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#60a5fa' }}
                >
                  <Plus size={12} /> Add More
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto' }}>
                {pendingFiles.map((file, idx) => (
                  <div
                    key={`${file.name}_${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                      {file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf') ? (
                        <FileText size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                      ) : (
                        <ImageIcon size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
                      )}
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => handleRemovePending(idx)}
                      title="Remove file"
                      style={{ color: '#ef4444', padding: '0.3rem' }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Currently Attached Files List */}
          {attachedMediaList.length > 0 && (
            <div style={{ marginBottom: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Currently Attached Files ({attachedMediaList.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '140px', overflowY: 'auto' }}>
                {attachedMediaList.map((media) => (
                  <div
                    key={media.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(16, 185, 129, 0.06)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                      {media.type === 'pdf' ? (
                        <FileText size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                      ) : (
                        <ImageIcon size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
                      )}
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {media.name}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#34d399' }}>
                          🔒 Encrypted • {(media.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    {onRemoveMedia && (
                      <button
                        className="btn-icon"
                        onClick={() => onRemoveMedia(media.id)}
                        title="Delete attached file"
                        style={{ color: '#ef4444', padding: '0.3rem' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Encryption Option */}
          <div className="switch-container">
            <div className="switch-label-wrap">
              <span className="switch-label-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={15} color="#10b981" />
                <span>Zero-Knowledge AES-GCM (256-bit) Encryption</span>
              </span>
              <span className="switch-label-desc">
                Files are encrypted inside your browser before uploading. Decryption keys stay in the URL fragment (#key=...).
              </span>
            </div>
            <div
              className={`toggle-switch ${encryptEnabled ? 'is-checked' : ''}`}
              onClick={() => setEncryptEnabled(!encryptEnabled)}
              role="switch"
              aria-checked={encryptEnabled}
            >
              <div className="toggle-handle" />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
            {attachedMediaList.length > 0 && pendingFiles.length === 0 ? 'Done' : 'Cancel'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAttachAll}
            disabled={pendingFiles.length === 0 || isProcessing}
          >
            {isProcessing ? (
              <span>
                Encrypting &amp; Uploading ({uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : ''})...
              </span>
            ) : (
              <>
                <Check size={16} />
                <span>
                  {pendingFiles.length > 1 ? `Attach All (${pendingFiles.length} files)` : 'Attach to Codeshare'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
