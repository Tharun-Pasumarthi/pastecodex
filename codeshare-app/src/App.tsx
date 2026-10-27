import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { EditorWorkspace } from './components/EditorWorkspace';
import { Sidebar } from './components/Sidebar';
import { ShareModal } from './components/ShareModal';
import { FileUploadModal } from './components/FileUploadModal';
import { MediaViewer } from './components/MediaViewer';
import { SavedModal } from './components/SavedModal';
import { Home } from './components/Home';
import { Login } from './components/Login';
import { Register } from './components/Register';
import type { EditorSettings, Collaborator, User, AttachedMedia, ActiveTab, ExpirationOption } from './types';
import { generateCodeshareId, getExtensionForMode } from './utils/slug';
import {
  generateEncryptionKey,
  generateShareableUrl,
  parseHashParams,
  unpackDocumentFromHashToken,
} from './utils/crypto';
import { fetchAndDecryptMediaFromFirebase, deleteMediaFromFirebase } from './utils/firebaseStorage';
import { saveDocument, fetchDocument, subscribeToRoomSync, type DocumentSyncData } from './utils/documentSync';
import { Check, Info } from 'lucide-react';

export function App() {
  // Navigation State
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [currentQuery, setCurrentQuery] = useState<string>(() => {
    return window.location.search || '';
  });

  // Unique tab identifier for peer message filtering
  const tabIdRef = useRef<string>('tab_' + Math.random().toString(36).substr(2, 9));
  const isApplyingRemoteUpdateRef = useRef<boolean>(false);

  // User State (persisted across reloads so session never expires unexpectedly)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('codeshare_current_user');
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: '',
      email: '',
      isAnonymous: true,
      isPro: false,
      savedCodeshares: [],
    };
  });

  // Editor & Codeshare Session State
  const [codeshareId, setCodeshareId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string>('Oct 27 10:45 AM');
  const [content, setContent] = useState<string>('');
  const [viewOnly, setViewOnly] = useState<boolean>(false);
  const [activePanel, setActivePanel] = useState<'settings' | 'about' | null>(null);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState<boolean>(false);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);

  // In-app Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' = 'success') => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage({ text, type });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Optional Link Expiration State ('never' = permanent by default)
  const [expiration, setExpiration] = useState<ExpirationOption>('never');

  // Encryption & Attached Media State (PDF / Images)
  const [encryptionKey, setEncryptionKey] = useState<string>(() => generateEncryptionKey());
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('code');

  const [settings, setSettings] = useState<EditorSettings>({
    modeName: 'javascript',
    tabSize: 2,
    theme: 'monokai',
    keymap: 'default',
  });

  const [collaborators] = useState<Collaborator[]>([
    { id: 'me', name: 'You', color: '#3b82f6', isMe: true },
  ]);

  // Keep fresh mutable references for subscription callbacks
  const codeshareIdRef = useRef(codeshareId);
  codeshareIdRef.current = codeshareId;
  const contentRef = useRef(content);
  contentRef.current = content;
  const docTitleRef = useRef(docTitle);
  docTitleRef.current = docTitle;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const expirationRef = useRef(expiration);
  expirationRef.current = expiration;
  const encryptionKeyRef = useRef(encryptionKey);
  encryptionKeyRef.current = encryptionKey;
  const attachedMediaRef = useRef(attachedMedia);
  attachedMediaRef.current = attachedMedia;

  // Ensure documents are synchronously persisted even when the user closes the browser/tab
  useEffect(() => {
    const handleImmediateFlush = () => {
      if (!codeshareIdRef.current) return;
      saveDocument({
        id: codeshareIdRef.current,
        title: docTitleRef.current,
        content: contentRef.current,
        settings: settingsRef.current,
        expiration: expirationRef.current,
        encryptionKey: encryptionKeyRef.current,
        attachedMedia: attachedMediaRef.current,
        timestamp: Date.now(),
        senderId: tabIdRef.current,
      });
    };

    window.addEventListener('beforeunload', handleImmediateFlush);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleImmediateFlush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleImmediateFlush);
      document.removeEventListener('visibilitychange', handleImmediateFlush);
    };
  }, []);

  // Process and unpack zero-knowledge URL hash fragments (#key=...&d=...)
  const processUrlHash = useCallback(async (hashStr: string) => {
    if (!hashStr) return;
    const { key, docToken } = parseHashParams(hashStr);
    if (key) {
      setEncryptionKey(key);
    }
    if (docToken && key) {
      const unpacked = await unpackDocumentFromHashToken<{
        c?: string;
        t?: string;
        m?: string;
        med?: AttachedMedia;
      }>(docToken, key);
      if (unpacked) {
        if (typeof unpacked.c === 'string') {
          setContent(unpacked.c);
        }
        if (unpacked.t) {
          setDocTitle(unpacked.t);
        }
        if (unpacked.m) {
          setSettings((prev) => ({ ...prev, modeName: unpacked.m as any }));
        }
        if (unpacked.med) {
          setAttachedMedia(unpacked.med);
        }
      }
    }
  }, []);

  // Robust URL navigation that handles path, query, and hash fragments independently
  const navigate = useCallback((pathWithQueryAndHash: string) => {
    const hashIndex = pathWithQueryAndHash.indexOf('#');
    let hash = '';
    let pathAndQuery = pathWithQueryAndHash;
    if (hashIndex !== -1) {
      hash = pathWithQueryAndHash.slice(hashIndex);
      pathAndQuery = pathWithQueryAndHash.slice(0, hashIndex);
    }
    const [path, query = ''] = pathAndQuery.split('?');
    window.history.pushState({}, '', pathWithQueryAndHash);
    setCurrentPath(path);
    setCurrentQuery(query ? `?${query}` : '');
    if (hash) {
      processUrlHash(hash);
    }
  }, [processUrlHash]);

  // Listen to browser popstate (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setCurrentQuery(window.location.search || '');
      if (window.location.hash) {
        processUrlHash(window.location.hash);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [processUrlHash]);

  // Parse URL hash on initial load
  useEffect(() => {
    if (window.location.hash) {
      processUrlHash(window.location.hash);
    }
  }, [processUrlHash]);

  // Dedicated handler to reliably create a fresh new codeshare session
  const handleCreateNewCodeshare = useCallback(() => {
    const newSlug = generateCodeshareId();
    const newKey = generateEncryptionKey();
    const now = new Date();
    const formatted = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    // Reset editor state
    setCodeshareId(newSlug);
    setDocTitle(formatted);
    setContent('');
    setAttachedMedia(null);
    setActiveTab('code');
    setExpiration('never');
    setViewOnly(false);
    setActivePanel(null);
    setIsShareOpen(false);
    setIsFileUploadOpen(false);
    setEncryptionKey(newKey);

    // Save initial document record immediately
    saveDocument({
      id: newSlug,
      title: formatted,
      content: '',
      settings: {
        modeName: 'javascript',
        tabSize: 2,
        theme: 'monokai',
        keymap: 'default',
      },
      expiration: 'never',
      encryptionKey: newKey,
      timestamp: Date.now(),
      senderId: tabIdRef.current,
    });

    navigate(`/${newSlug}#key=${newKey}`);
    showToast('Created new PasteCodex room!', 'info');
  }, [navigate, showToast]);

  // Route handling & document restoration
  useEffect(() => {
    if (currentPath === '/new') {
      handleCreateNewCodeshare();
      return;
    }

    // Check if path is a codeshare slug (e.g. /5NxYxV)
    const slugMatch = currentPath.match(/^\/([a-zA-Z0-9_-]{5,8})$/);
    if (slugMatch) {
      const slug = slugMatch[1];
      if (slug !== 'login' && slug !== 'register') {
        setCodeshareId(slug);

        // Fetch latest document from server relay / local cache
        fetchDocument(slug).then((docData) => {
          if (docData) {
            if (docData.title) setDocTitle(docData.title);
            if (typeof docData.content === 'string') setContent(docData.content);
            if (docData.settings) setSettings(docData.settings);
            if (docData.expiration) setExpiration(docData.expiration);
            if (docData.attachedMedia) setAttachedMedia(docData.attachedMedia);
            if (docData.encryptionKey && !window.location.hash.startsWith('#key=')) {
              setEncryptionKey(docData.encryptionKey);
            }
          } else {
            // First time opening this slug
            const now = new Date();
            const formatted = now.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });
            setDocTitle(formatted);
          }
        });

        // Also check if there's attached media in local storage for this session
        try {
          const cachedMedia = localStorage.getItem(`codeshare_media_${slug}`);
          if (cachedMedia) {
            const parsed = JSON.parse(cachedMedia) as AttachedMedia;
            setAttachedMedia(parsed);
          }
        } catch {
          // ignore
        }

        return;
      }
    }

    setCodeshareId(null);
  }, [currentPath, handleCreateNewCodeshare]);

  // Real-time bidirectional cross-tab & cross-browser synchronization
  useEffect(() => {
    if (!codeshareId) return;

    const unsubscribe = subscribeToRoomSync(
      codeshareId,
      tabIdRef.current,
      () => ({
        id: codeshareId,
        title: docTitleRef.current,
        content: contentRef.current,
        settings: settingsRef.current,
        expiration: expirationRef.current,
        encryptionKey: encryptionKeyRef.current,
        attachedMedia: attachedMediaRef.current,
        timestamp: Date.now(),
        senderId: tabIdRef.current,
      }),
      (remoteData) => {
        isApplyingRemoteUpdateRef.current = true;
        if (remoteData.content !== contentRef.current) {
          setContent(remoteData.content);
        }
        if (remoteData.title && remoteData.title !== docTitleRef.current) {
          setDocTitle(remoteData.title);
        }
        if (remoteData.settings) {
          setSettings(remoteData.settings);
        }
        if (remoteData.expiration) {
          setExpiration(remoteData.expiration);
        }
        if (remoteData.attachedMedia !== undefined) {
          setAttachedMedia(remoteData.attachedMedia);
        }
        window.setTimeout(() => {
          isApplyingRemoteUpdateRef.current = false;
        }, 50);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [codeshareId]);

  // Debounced auto-save to local storage, server relay, and real-time broadcast
  useEffect(() => {
    if (!codeshareId) return;
    if (isApplyingRemoteUpdateRef.current) return;

    const timeoutId = window.setTimeout(() => {
      const docData: DocumentSyncData = {
        id: codeshareId,
        title: docTitle,
        content,
        settings,
        expiration,
        encryptionKey,
        attachedMedia,
        timestamp: Date.now(),
        senderId: tabIdRef.current,
      };
      saveDocument(docData);
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [codeshareId, docTitle, content, settings, expiration, encryptionKey, attachedMedia]);

  // Handle Expiration updates (optional expiration)
  const handleUpdateExpiration = (exp: ExpirationOption) => {
    setExpiration(exp);
    if (codeshareId) {
      try {
        localStorage.setItem(`codeshare_exp_${codeshareId}`, exp);
      } catch {
        // ignore
      }
    }
  };

  // Handle Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem('codeshare_current_user');
    } catch {
      // ignore
    }
    setCurrentUser({
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: '',
      email: '',
      isAnonymous: true,
      isPro: false,
      savedCodeshares: [],
    });
    showToast('Logged out successfully.', 'info');
  };

  // Automatically fetch & decrypt media from Firebase if attached
  useEffect(() => {
    if (!codeshareId || !encryptionKey) return;
    let isMounted = true;
    fetchAndDecryptMediaFromFirebase(codeshareId, encryptionKey).then((fbMedia) => {
      if (isMounted && fbMedia) {
        setAttachedMedia(fbMedia);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [codeshareId, encryptionKey]);

  // Save attached media to session cache
  const handleAttachMedia = (media: AttachedMedia) => {
    setAttachedMedia(media);
    setActiveTab(media.type);
    if (codeshareId) {
      try {
        localStorage.setItem(`codeshare_media_${codeshareId}`, JSON.stringify(media));
      } catch {
        // quota exceeded or storage disabled
      }
    }
    showToast(`Attached ${media.type.toUpperCase()} file to encrypted share!`);
  };

  const handleRemoveMedia = () => {
    if (codeshareId) {
      deleteMediaFromFirebase(codeshareId);
      try {
        localStorage.removeItem(`codeshare_media_${codeshareId}`);
      } catch {
        // ignore
      }
    }
    setAttachedMedia(null);
    setActiveTab('code');
    showToast('Attached file removed.');
  };

  // Handle download
  const handleDownload = () => {
    if (activeTab !== 'code' && attachedMedia) {
      // Download attached PDF or image
      const link = document.createElement('a');
      link.href = attachedMedia.dataUrl;
      link.download = attachedMedia.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Download code text
    const ext = getExtensionForMode(settings.modeName);
    const fileName = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || codeshareId || 'codeshare'}.${ext}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${fileName}`);
  };

  // Handle Save Codeshare action
  const handleSaveCodeshare = () => {
    if (!codeshareId) return;

    // Ensure current content is safely persisted in local document store
    saveDocument({
      id: codeshareId,
      title: docTitle,
      content,
      settings,
      expiration,
      encryptionKey,
      attachedMedia,
      timestamp: Date.now(),
      senderId: tabIdRef.current,
    });

    if (currentUser && !currentUser.isAnonymous) {
      if (!currentUser.savedCodeshares.includes(codeshareId)) {
        const updatedUser = {
          ...currentUser,
          savedCodeshares: [codeshareId, ...currentUser.savedCodeshares],
        };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('codeshare_current_user', JSON.stringify(updatedUser));
        } catch {
          // ignore
        }
        showToast(`PasteCodex "${docTitle || codeshareId}" saved to your account!`);
      } else {
        showToast(`PasteCodex "${docTitle || codeshareId}" is already saved in your library.`);
      }
    } else {
      // User is anonymous - prompt to register/login with return link so code is preserved
      showToast('Please log in or sign up to permanently save snippets to your library.', 'info');
      navigate(`/register?saveCodeshare=${codeshareId}`);
    }
  };

  // Remove a codeshare from saved library
  const handleRemoveSavedCodeshare = (id: string) => {
    if (!currentUser || currentUser.isAnonymous) return;
    const updatedUser = {
      ...currentUser,
      savedCodeshares: currentUser.savedCodeshares.filter((item) => item !== id),
    };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('codeshare_current_user', JSON.stringify(updatedUser));
    } catch {
      // ignore
    }
    showToast('Snippet removed from your saved library.', 'info');
  };

  // Open a saved codeshare
  const handleOpenSavedCodeshare = (id: string, key?: string) => {
    setIsSavedModalOpen(false);
    if (key) {
      setEncryptionKey(key);
    }
    // Pre-populate state immediately so that user sees content immediately
    fetchDocument(id).then((docData) => {
      if (docData) {
        if (docData.title) setDocTitle(docData.title);
        if (typeof docData.content === 'string') setContent(docData.content);
        if (docData.settings) setSettings(docData.settings);
        if (docData.expiration) setExpiration(docData.expiration);
        if (docData.attachedMedia) setAttachedMedia(docData.attachedMedia);
        if (docData.encryptionKey && !key) {
          setEncryptionKey(docData.encryptionKey);
        }
      }
    });
    navigate(`/${id}${key ? `#key=${key}` : ''}`);
  };

  // Check if current codeshare is saved in user's library
  const isCurrentDocSaved = Boolean(
    codeshareId &&
    currentUser &&
    !currentUser.isAnonymous &&
    currentUser.savedCodeshares.includes(codeshareId)
  );

  // Parse saveCodeshare query param
  const queryParams = new URLSearchParams(currentQuery);
  const saveCodeshareId = queryParams.get('saveCodeshare') || undefined;

  // Active clean share URL with zero-knowledge encryption key in URL fragment (~75 chars)
  const shareUrl = codeshareId
    ? generateShareableUrl(codeshareId, encryptionKey)
    : '';

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: toastMessage.type === 'success' ? '#10b981' : '#3b82f6',
            color: '#fff',
            padding: '0.65rem 1.15rem',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {toastMessage.type === 'success' ? <Check size={16} /> : <Info size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <Navbar
        currentPath={currentPath}
        codeshareId={codeshareId || undefined}
        docTitle={docTitle}
        viewOnly={viewOnly}
        onNavigate={navigate}
        onOpenShare={() => setIsShareOpen(true)}
        onSaveCodeshare={handleSaveCodeshare}
        onOpenSavedLibrary={() => setIsSavedModalOpen(true)}
        onNewCodeshare={handleCreateNewCodeshare}
        currentUser={currentUser}
        collaborators={collaborators}
        attachedMedia={attachedMedia}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenFileUpload={() => setIsFileUploadOpen(true)}
        expiration={expiration}
        onLogout={handleLogout}
        shareUrl={shareUrl}
        isSaved={isCurrentDocSaved}
      />

      {/* View routing */}
      {currentPath === '/' && (
        <Home
          onStartNew={handleCreateNewCodeshare}
          onNavigate={navigate}
        />
      )}

      {currentPath === '/login' && (
        <Login
          onNavigate={navigate}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            try {
              localStorage.setItem('codeshare_current_user', JSON.stringify(user));
            } catch {
              // ignore
            }
            showToast(`Welcome back, ${user.name || user.email}!`);
          }}
          saveCodeshareId={saveCodeshareId}
        />
      )}

      {currentPath === '/register' && (
        <Register
          onNavigate={navigate}
          onRegisterSuccess={(user) => {
            setCurrentUser(user);
            try {
              localStorage.setItem('codeshare_current_user', JSON.stringify(user));
            } catch {
              // ignore
            }
            showToast(`Account created! Welcome, ${user.name}!`);
          }}
          saveCodeshareId={saveCodeshareId}
        />
      )}

      {/* Editor & Media View */}
      {codeshareId && (
        <div className="editor-layout">
          {activeTab !== 'code' && attachedMedia ? (
            <MediaViewer
              media={attachedMedia}
              onRemove={handleRemoveMedia}
              onDownload={handleDownload}
            />
          ) : (
            <EditorWorkspace
              content={content}
              onChange={setContent}
              settings={settings}
              viewOnly={viewOnly}
              collaborators={collaborators}
            />
          )}

          <Sidebar
            settings={settings}
            title={docTitle}
            onUpdateTitle={setDocTitle}
            onUpdateSettings={setSettings}
            onDownload={handleDownload}
            onNewCodeshare={handleCreateNewCodeshare}
            activePanel={activePanel}
            onTogglePanel={(p) => setActivePanel(activePanel === p ? null : p)}
            onClosePanel={() => setActivePanel(null)}
            attachedMedia={attachedMedia}
            onOpenFileUpload={() => setIsFileUploadOpen(true)}
          />

          <ShareModal
            codeshareId={codeshareId}
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            viewOnly={viewOnly}
            onToggleViewOnly={setViewOnly}
            collaborators={collaborators}
            encryptionKey={encryptionKey}
            attachedMedia={attachedMedia}
            expiration={expiration}
            onUpdateExpiration={handleUpdateExpiration}
          />

          <FileUploadModal
            codeshareId={codeshareId || ''}
            isOpen={isFileUploadOpen}
            onClose={() => setIsFileUploadOpen(false)}
            onAttachMedia={handleAttachMedia}
            encryptionKey={encryptionKey}
          />

          <SavedModal
            isOpen={isSavedModalOpen}
            onClose={() => setIsSavedModalOpen(false)}
            currentUser={currentUser}
            onOpenCodeshare={handleOpenSavedCodeshare}
            onRemoveSaved={handleRemoveSavedCodeshare}
            onNewCodeshare={handleCreateNewCodeshare}
          />
        </div>
      )}
    </div>
  );
}

export default App;
