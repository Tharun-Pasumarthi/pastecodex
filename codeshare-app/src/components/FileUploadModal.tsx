import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Image as ImageIcon, Shield, Check, AlertCircle, Flame } from 'lucide-react';
import type { AttachedMedia } from '../types';
import { uploadEncryptedMediaToFirebase } from '../utils/firebaseStorage';

interface FileUploadModalProps {
  codeshareId: string;
  isOpen: boolean;
  onClose: () => void;
  onAttachMedia: (media: AttachedMedia) => void;
  encryptionKey: string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  codeshareId,
  isOpen,
  onClose,
  onAttachMedia,
  encryptionKey,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encryptEnabled, setEncryptEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const validateAndSetFile = (file: File) => {
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

    if (!validMimes.includes(file.type) && !file.name.endsWith('.pdf')) {
      setError('Unsupported file type. Please select a PDF or Image (PNG, JPG, SVG, WEBP, GIF).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File is too large. Maximum supported file size is 25MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleAttach = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Encrypts locally with AES-GCM and pushes ciphertext blob to Firebase Cloud Storage
      const media = await uploadEncryptedMediaToFirebase(
        codeshareId,
        selectedFile,
        encryptionKey
      );
      onAttachMedia(media);
      setIsProcessing(false);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error encrypting and uploading file to Firebase';
      setError(message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={20} color="#f59e0b" />
            <h4 className="modal-title">Share PDF or Image (Firebase Encrypted)</h4>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Files are encrypted on your device with <strong>AES-GCM (256-bit)</strong> before being stored in Firebase Cloud Storage. The decryption key stays strictly in your link hash (<code style={{ color: '#10b981' }}>#key=...</code>) ensuring zero-knowledge privacy.
          </p>

          {error && (
            <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--border-medium)'}`,
              borderRadius: '10px',
              padding: '2rem 1.5rem',
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
              accept=".pdf,image/*"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />

            {selectedFile ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                {selectedFile.type.includes('pdf') || selectedFile.name.endsWith('.pdf') ? (
                  <FileText size={32} color="#ef4444" />
                ) : (
                  <ImageIcon size={32} color="#3b82f6" />
                )}
                <div style={{ textAlign: 'left' }}>
                  <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{selectedFile.name}</strong>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready to attach
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Upload size={22} />
                </div>
                <div style={{ fontWeight: 500, color: '#fff', fontSize: '0.95rem' }}>
                  Drag &amp; drop your PDF or Image here
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  or click to browse from your device (Max 25MB)
                </div>
              </div>
            )}
          </div>

          {/* Encryption Option */}
          <div className="switch-container">
            <div className="switch-label-wrap">
              <span className="switch-label-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={15} color="#10b981" />
                <span>End-to-End Encryption (AES-GCM)</span>
              </span>
              <span className="switch-label-desc">
                Payload is encrypted in your browser before creating the link. The key is in the URL hash.
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
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAttach}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? (
              <span>Encrypting &amp; Attaching...</span>
            ) : (
              <>
                <Check size={16} />
                <span>Attach to Codeshare</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
