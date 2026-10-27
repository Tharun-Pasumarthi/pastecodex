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
import type { EditorSettings, Collaborator, User, AttachedMedia, ActiveTab, ExpirationOption, TextCell } from './types';
import { generateCodeshareId, getExtensionForMode } from './utils/slug';
import { createDefaultCell } from './utils/cellUtils';
import {
  addDeviceSavedSession,
  removeDeviceSavedSession,
  saveAccountSessions,
  getAllAccessibleSessions,
} from './utils/sessionManager';
import {
  generateEncryptionKey,
  generateShareableUrl,
  parseHashParams,
  unpackDocumentFromHashToken,
} from './utils/crypto';
import {
  fetchAndDecryptMediaFromFirebase,
  fetchAndDecryptAllMediaFromFirebase,
  deleteMediaFromFirebase,
} from './utils/firebaseStorage';
import {
  saveDocument,
  fetchDocument,
  subscribeToRoomSync,
  onSyncStatusChange,
  type DocumentSyncData,
} from './utils/documentSync';
import { ChatDrawer } from './components/ChatDrawer';
import {
  type ChatMessage,
  getLocalChatMessages,
  sendChatMessage,
  subscribeToChatMessages,
} from './utils/chatSync';
import { downloadAttachedMediaFile, downloadCodeText } from './utils/fileDownload';
import { getCachedMediaForRoom } from './utils/indexedDbStorage';
import { formatFriendlyTimestamp } from './utils/dateUtils';
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
  const [tabId] = useState<string>(() => 'tab_' + Math.random().toString(36).substring(2, 11));
  const tabIdRef = useRef<string>(tabId);
  const isApplyingRemoteUpdateRef = useRef<boolean>(false);

  // User State (persisted across reloads so session never expires unexpectedly)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('codeshare_current_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.savedCodeshares = getAllAccessibleSessions(parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
    const deviceSessions = getAllAccessibleSessions(null);
    return {
      id: 'usr_' + Math.random().toString(36).substring(2, 11),
      name: '',
      email: '',
      isAnonymous: true,
      isPro: false,
      savedCodeshares: deviceSessions,
    };
  });

  // Editor & Codeshare Session State
  const [codeshareId, setCodeshareId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string>(() => formatFriendlyTimestamp());
  const [content, setContent] = useState<string>('');
  const [cells, setCells] = useState<TextCell[]>(() => [createDefaultCell('code', 'javascript', '')]);
  const cellsRef = useRef<TextCell[]>(cells);
  const [viewOnly, setViewOnly] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search || '');
    return (
      params.get('v') === '1' ||
      params.get('view') === '1' ||
      params.get('viewOnly') === 'true' ||
      params.get('readonly') === '1'
    );
  });
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
  const [attachedMediaList, setAttachedMediaList] = useState<AttachedMedia[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('code');

  // Live Instant Save Status Feedback
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Collaborator Real-time Chat State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  useEffect(() => {
    return onSyncStatusChange((saving) => {
      setIsSyncing(saving);
    });
  }, []);

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
  const contentRef = useRef(content);
  const docTitleRef = useRef(docTitle);
  const viewOnlyRef = useRef(viewOnly);
  const settingsRef = useRef(settings);
  const expirationRef = useRef(expiration);
  const encryptionKeyRef = useRef(encryptionKey);
  const attachedMediaRef = useRef(attachedMedia);
  const attachedMediaListRef = useRef(attachedMediaList);

  useEffect(() => {
    codeshareIdRef.current = codeshareId;
    contentRef.current = content;
    cellsRef.current = cells;
    docTitleRef.current = docTitle;
    viewOnlyRef.current = viewOnly;
    settingsRef.current = settings;
    expirationRef.current = expiration;
    encryptionKeyRef.current = encryptionKey;
    attachedMediaRef.current = attachedMedia;
    attachedMediaListRef.current = attachedMediaList;
  }, [codeshareId, content, cells, docTitle, viewOnly, settings, expiration, encryptionKey, attachedMedia, attachedMediaList]);

  // Document loaded state to prevent initial empty state from overwriting saved documents
  const [isDocLoaded, setIsDocLoaded] = useState<boolean>(false);
  const isDocLoadedRef = useRef<boolean>(false);

  // Ensure documents are synchronously persisted even when the user closes the browser/tab
  useEffect(() => {
    const handleImmediateFlush = () => {
      // Never flush if document hasn't loaded or id is missing
      if (!codeshareIdRef.current || !isDocLoadedRef.current) return;
      saveDocument({
        id: codeshareIdRef.current,
        title: docTitleRef.current,
        content: contentRef.current,
        cells: cellsRef.current,
        viewOnly: viewOnlyRef.current,
        settings: settingsRef.current,
        expiration: expirationRef.current,
        encryptionKey: encryptionKeyRef.current,
        attachedMedia: attachedMediaRef.current,
        attachedMediaList: attachedMediaListRef.current,
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

  // Keep view-only mode synchronized with URL query params (?v=1)
  useEffect(() => {
    const params = new URLSearchParams(currentQuery);
    const isReadOnly =
      params.get('v') === '1' ||
      params.get('view') === '1' ||
      params.get('viewOnly') === 'true' ||
      params.get('readonly') === '1';
    if (isReadOnly) {
      setViewOnly(true);
      viewOnlyRef.current = true;
    }
  }, [currentQuery]);

  const handleToggleViewOnly = useCallback((newVal: boolean) => {
    setViewOnly(newVal);
    viewOnlyRef.current = newVal;

    if (codeshareIdRef.current) {
      const searchParams = new URLSearchParams(window.location.search || '');
      if (newVal) {
        searchParams.set('v', '1');
      } else {
        searchParams.delete('v');
        searchParams.delete('view');
        searchParams.delete('viewOnly');
        searchParams.delete('readonly');
      }
      const q = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const hash = window.location.hash || '';
      window.history.replaceState(null, '', `/${codeshareIdRef.current}${q}${hash}`);
      setCurrentQuery(q);

      if (isDocLoadedRef.current) {
        saveDocument({
          id: codeshareIdRef.current,
          title: docTitleRef.current,
          content: contentRef.current,
          cells: cellsRef.current,
          viewOnly: newVal,
          settings: settingsRef.current,
          expiration: expirationRef.current,
          encryptionKey: encryptionKeyRef.current,
          attachedMedia: attachedMediaRef.current,
          attachedMediaList: attachedMediaListRef.current,
          timestamp: Date.now(),
          senderId: tabIdRef.current,
        });
      }
    }

    showToast(newVal ? 'View-only mode activated: editing locked' : 'Editing unlocked', 'info');
  }, [showToast]);

  // Dedicated handler to reliably create a fresh new codeshare session
  const handleCreateNewCodeshare = useCallback(() => {
    const newSlug = generateCodeshareId();
    const newKey = generateEncryptionKey();
    const formatted = formatFriendlyTimestamp();
    const initialCells = [createDefaultCell('code', 'javascript', '', 'Main Code')];

    // Reset editor state
    setCodeshareId(newSlug);
    setDocTitle(formatted);
    setContent('');
    setCells(initialCells);
    cellsRef.current = initialCells;
    setAttachedMedia(null);
    setAttachedMediaList([]);
    setActiveTab('code');
    setExpiration('never');
    setViewOnly(false);
    viewOnlyRef.current = false;
    setActivePanel(null);
    setIsShareOpen(false);
    setIsFileUploadOpen(false);
    setEncryptionKey(newKey);
    setIsDocLoaded(true);
    isDocLoadedRef.current = true;

    // Clear ?v=1 if present
    setCurrentQuery('');

    // Save initial document record immediately
    saveDocument({
      id: newSlug,
      title: formatted,
      content: '',
      cells: initialCells,
      viewOnly: false,
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
        setIsDocLoaded(false);
        isDocLoadedRef.current = false;

        // 1. Immediately check IndexedDB for any cached media files (0ms instant)
        getCachedMediaForRoom(slug).then((localMedia) => {
          if (localMedia.length > 0) {
            setAttachedMediaList(localMedia);
            setAttachedMedia(localMedia[0]);
          }
        });

        // 2. Fetch latest document from Firestore / local cache
        fetchDocument(slug).then((docData) => {
          if (docData) {
            if (docData.title) setDocTitle(docData.title);
            if (typeof docData.content === 'string') setContent(docData.content);
            if (docData.cells && Array.isArray(docData.cells) && docData.cells.length > 0) {
              setCells(docData.cells);
              cellsRef.current = docData.cells;
            } else if (typeof docData.content === 'string') {
              const defaultCells = [
                createDefaultCell('code', docData.settings?.modeName || 'javascript', docData.content, 'Main Code'),
              ];
              setCells(defaultCells);
              cellsRef.current = defaultCells;
            }
            if (docData.settings) setSettings(docData.settings);
            if (docData.expiration) setExpiration(docData.expiration);

            // Record this visited session in local device history
            addDeviceSavedSession(slug);

            // Merge media list without losing in-memory decrypted blobs
            if (docData.attachedMediaList && docData.attachedMediaList.length > 0) {
              setAttachedMediaList((prev) => {
                return docData.attachedMediaList!.map((m) => {
                  const existing = prev.find((p) => p.id === m.id);
                  return existing && existing.dataUrl ? existing : m;
                });
              });
              if (!attachedMediaRef.current && docData.attachedMediaList[0]) {
                setAttachedMedia(docData.attachedMediaList[0]);
              }
            } else if (docData.attachedMedia) {
              setAttachedMedia(docData.attachedMedia);
              setAttachedMediaList([docData.attachedMedia]);
            }

            // Restore view-only state from document or current URL query
            const searchParams = new URLSearchParams(window.location.search || '');
            const urlReadOnly =
              searchParams.get('v') === '1' ||
              searchParams.get('view') === '1' ||
              searchParams.get('viewOnly') === 'true' ||
              searchParams.get('readonly') === '1';
            const effectiveViewOnly = Boolean(docData.viewOnly || urlReadOnly);
            setViewOnly(effectiveViewOnly);
            viewOnlyRef.current = effectiveViewOnly;

            // Restore encryption key and sync to URL hash if missing
            const effectiveKey = docData.encryptionKey || encryptionKeyRef.current;
            if (docData.encryptionKey) {
              setEncryptionKey(docData.encryptionKey);
            }
            if (effectiveKey && !window.location.hash.includes('key=')) {
              window.history.replaceState(null, '', `/${slug}#key=${effectiveKey}`);
            }
          } else {
            // First time opening this slug
            setDocTitle(formatFriendlyTimestamp());
            const initialCells = [createDefaultCell('code', 'javascript', '', 'Main Code')];
            setCells(initialCells);
            cellsRef.current = initialCells;
            addDeviceSavedSession(slug);
            const searchParams = new URLSearchParams(window.location.search || '');
            const urlReadOnly =
              searchParams.get('v') === '1' ||
              searchParams.get('view') === '1' ||
              searchParams.get('viewOnly') === 'true' ||
              searchParams.get('readonly') === '1';
            setViewOnly(urlReadOnly);
            viewOnlyRef.current = urlReadOnly;
          }

          // Mark document as safely loaded so auto-save can engage
          setIsDocLoaded(true);
          isDocLoadedRef.current = true;
        });

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
      () => {
        if (!isDocLoadedRef.current) return null;
        return {
          id: codeshareId,
          title: docTitleRef.current,
          content: contentRef.current,
          cells: cellsRef.current,
          viewOnly: viewOnlyRef.current,
          settings: settingsRef.current,
          expiration: expirationRef.current,
          encryptionKey: encryptionKeyRef.current,
          attachedMedia: attachedMediaRef.current,
          attachedMediaList: attachedMediaListRef.current,
          timestamp: Date.now(),
          senderId: tabIdRef.current,
        };
      },
      (remoteData) => {
        isApplyingRemoteUpdateRef.current = true;
        if (remoteData.content !== contentRef.current) {
          setContent(remoteData.content);
        }
        if (remoteData.cells && Array.isArray(remoteData.cells) && remoteData.cells.length > 0) {
          setCells(remoteData.cells);
          cellsRef.current = remoteData.cells;
        }
        if (remoteData.title && remoteData.title !== docTitleRef.current) {
          setDocTitle(remoteData.title);
        }
        if (typeof remoteData.viewOnly === 'boolean') {
          const searchParams = new URLSearchParams(window.location.search || '');
          const urlReadOnly =
            searchParams.get('v') === '1' ||
            searchParams.get('view') === '1' ||
            searchParams.get('viewOnly') === 'true' ||
            searchParams.get('readonly') === '1';
          const effective = remoteData.viewOnly || urlReadOnly;
          setViewOnly(effective);
          viewOnlyRef.current = effective;
        }
        if (remoteData.settings) {
          setSettings(remoteData.settings);
        }
        if (remoteData.expiration) {
          setExpiration(remoteData.expiration);
        }
        if (remoteData.attachedMediaList !== undefined) {
          setAttachedMediaList((prevList) => {
            const incoming = remoteData.attachedMediaList || [];
            return incoming.map((item) => {
              const existing = prevList.find((p) => p.id === item.id);
              if (existing && existing.dataUrl) {
                return { ...item, dataUrl: existing.dataUrl };
              }
              return item;
            });
          });
          if (remoteData.attachedMediaList.length > 0) {
            setAttachedMedia((prev) => {
              if (prev && prev.dataUrl) return prev;
              return remoteData.attachedMediaList![0];
            });
          }
        } else if (remoteData.attachedMedia !== undefined) {
          setAttachedMedia(remoteData.attachedMedia);
          if (remoteData.attachedMedia) {
            setAttachedMediaList([remoteData.attachedMedia]);
          } else {
            setAttachedMediaList([]);
          }
        }
        window.setTimeout(() => {
          isApplyingRemoteUpdateRef.current = false;
        }, 40);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [codeshareId]);

  // Real-time Collaborator Chat subscription (waits for document & encryption key to load)
  useEffect(() => {
    if (!codeshareId || !encryptionKey || !isDocLoaded) return;
    const initial = getLocalChatMessages(codeshareId);
    setChatMessages(initial);

    const unsub = subscribeToChatMessages(
      codeshareId,
      tabIdRef.current,
      encryptionKey,
      (messages) => {
        setChatMessages(messages);
        if (!isChatOpen) {
          setUnreadChatCount((prev) => prev + 1);
        }
      }
    );

    return () => {
      unsub();
    };
  }, [codeshareId, encryptionKey, isDocLoaded, isChatOpen]);

  const handleSendChatMessage = useCallback((text: string) => {
    if (!codeshareId || !text.trim()) return;
    const senderName = currentUser?.name || (currentUser?.isAnonymous ? 'Collaborator' : currentUser?.email) || 'Developer';
    const newMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      senderId: tabIdRef.current,
      senderName,
      senderColor: '#3b82f6',
      text: text.trim(),
      timestamp: Date.now(),
      status: 'sent',
    };
    // 0ms optimistic immediate update
    setChatMessages((prev) => [...prev, newMsg]);
    sendChatMessage(codeshareId, newMsg, encryptionKey);
  }, [codeshareId, encryptionKey, currentUser]);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      if (!prev) setUnreadChatCount(0);
      return !prev;
    });
  }, []);

  // Fast responsive auto-save with coalescing (only active after document has loaded)
  useEffect(() => {
    if (!codeshareId || !isDocLoaded) return;
    if (isApplyingRemoteUpdateRef.current) return;

    const timeoutId = window.setTimeout(() => {
      const docData: DocumentSyncData = {
        id: codeshareId,
        title: docTitle,
        content,
        cells,
        viewOnly,
        settings,
        expiration,
        encryptionKey,
        attachedMedia,
        attachedMediaList,
        timestamp: Date.now(),
        senderId: tabIdRef.current,
      };
      saveDocument(docData);
    }, 40);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [codeshareId, isDocLoaded, docTitle, content, cells, viewOnly, settings, expiration, encryptionKey, attachedMedia, attachedMediaList]);

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

  // Handle Logout (Preserve saved sessions across logouts)
  const handleLogout = () => {
    if (currentUser?.email && currentUser.savedCodeshares.length > 0) {
      saveAccountSessions(currentUser.email, currentUser.savedCodeshares);
    }
    const retainedSessions = getAllAccessibleSessions(currentUser);
    retainedSessions.forEach((id) => addDeviceSavedSession(id));
    try {
      localStorage.removeItem('codeshare_current_user');
    } catch {
      // ignore
    }
    setCurrentUser({
      id: 'usr_' + Math.random().toString(36).substring(2, 11),
      name: '',
      email: '',
      isAnonymous: true,
      isPro: false,
      savedCodeshares: retainedSessions,
    });
    showToast('Logged out. Saved sessions preserved in your device library.', 'info');
  };

  // Automatically fetch & decrypt media from Firebase if attached
  useEffect(() => {
    if (!codeshareId || !encryptionKey) return;
    let isMounted = true;

    if (attachedMediaList.length > 0) {
      fetchAndDecryptAllMediaFromFirebase(codeshareId, encryptionKey, attachedMediaList).then((fullList) => {
        if (isMounted && fullList.length > 0) {
          setAttachedMediaList(fullList);
          if (fullList[0]) setAttachedMedia(fullList[0]);
        }
      });
    } else {
      fetchAndDecryptMediaFromFirebase(codeshareId, encryptionKey).then((fbMedia) => {
        if (isMounted && fbMedia) {
          setAttachedMedia(fbMedia);
          setAttachedMediaList([fbMedia]);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [codeshareId, encryptionKey, attachedMediaList.length]);

  // Save attached media to session cache
  const handleAttachMultipleMedia = (newMediaList: AttachedMedia[]) => {
    setAttachedMediaList((prev) => {
      const combined = [...prev, ...newMediaList];
      if (codeshareId) {
        try {
          localStorage.setItem(`codeshare_media_list_${codeshareId}`, JSON.stringify(combined));
        } catch {
          // ignore
        }
      }
      return combined;
    });
    if (newMediaList[0]) {
      setAttachedMedia(newMediaList[0]);
      setActiveTab(newMediaList[0].id);
    }
    showToast(`Attached ${newMediaList.length} file(s) to encrypted share!`);
  };

  const handleAttachMedia = (media: AttachedMedia) => {
    handleAttachMultipleMedia([media]);
  };

  const handleRemoveMedia = (mediaId?: string) => {
    if (codeshareId) {
      deleteMediaFromFirebase(codeshareId, mediaId);
    }
    setAttachedMediaList((prev) => {
      const filtered = mediaId ? prev.filter((m) => m.id !== mediaId) : [];
      if (codeshareId) {
        try {
          localStorage.setItem(`codeshare_media_list_${codeshareId}`, JSON.stringify(filtered));
        } catch {
          // ignore
        }
      }
      if (filtered.length > 0) {
        setAttachedMedia(filtered[0]);
        setActiveTab(filtered[0].id);
      } else {
        setAttachedMedia(null);
        setActiveTab('code');
      }
      return filtered;
    });
    showToast('Attached file removed.');
  };

  // Handle robust download
  const handleDownload = async (media?: AttachedMedia) => {
    const targetMedia = media || (activeTab !== 'code' ? attachedMediaList.find((m) => m.id === activeTab) : null) || attachedMedia;
    if (media || (activeTab !== 'code' && targetMedia)) {
      if (!targetMedia) return;
      try {
        let fileToDownload = targetMedia;
        // If dataUrl is missing in memory, fetch/decrypt from cache or cloud
        if (!fileToDownload.dataUrl || fileToDownload.dataUrl.length < 50) {
          showToast('Preparing download...', 'info');
          const decrypted = await fetchAndDecryptMediaFromFirebase(codeshareId || '', encryptionKey, targetMedia.id);
          if (decrypted && decrypted.dataUrl) {
            fileToDownload = decrypted;
          }
        }
        await downloadAttachedMediaFile(fileToDownload);
        showToast(`Downloaded ${fileToDownload.name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error downloading file';
        showToast(msg, 'info');
      }
      return;
    }

    // Download code text
    try {
      const ext = getExtensionForMode(settings.modeName);
      const fileName = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || codeshareId || 'codeshare'}.${ext}`;
      downloadCodeText(content, fileName);
      showToast(`Downloaded ${fileName}`);
    } catch {
      showToast('Error downloading code file', 'info');
    }
  };

  // Handle Save Codeshare action
  const handleSaveCodeshare = () => {
    if (!codeshareId) return;

    // Ensure current content & cells are safely persisted in local document store
    saveDocument({
      id: codeshareId,
      title: docTitle,
      content,
      cells,
      viewOnly,
      settings,
      expiration,
      encryptionKey,
      attachedMedia,
      attachedMediaList,
      timestamp: Date.now(),
      senderId: tabIdRef.current,
    });

    addDeviceSavedSession(codeshareId);

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
        if (currentUser.email) {
          saveAccountSessions(currentUser.email, updatedUser.savedCodeshares);
        }
        showToast(`PasteCodex "${docTitle || codeshareId}" saved to your account!`);
      } else {
        showToast(`PasteCodex "${docTitle || codeshareId}" is already saved in your library.`);
      }
    } else {
      // User is guest - saved locally to device library
      const deviceSessions = getAllAccessibleSessions(currentUser);
      if (!deviceSessions.includes(codeshareId)) {
        addDeviceSavedSession(codeshareId);
      }
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              savedCodeshares: Array.from(new Set([codeshareId, ...prev.savedCodeshares])),
            }
          : null
      );
      showToast(`PasteCodex "${docTitle || codeshareId}" saved to your device library!`);
    }
  };

  // Remove a codeshare from saved library
  const handleRemoveSavedCodeshare = (id: string) => {
    removeDeviceSavedSession(id);
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        savedCodeshares: currentUser.savedCodeshares.filter((item) => item !== id),
      };
      setCurrentUser(updatedUser);
      if (!currentUser.isAnonymous) {
        try {
          localStorage.setItem('codeshare_current_user', JSON.stringify(updatedUser));
        } catch {
          // ignore
        }
        if (currentUser.email) {
          saveAccountSessions(currentUser.email, updatedUser.savedCodeshares);
        }
      }
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
        if (docData.attachedMediaList && docData.attachedMediaList.length > 0) {
          setAttachedMediaList(docData.attachedMediaList);
          setAttachedMedia(docData.attachedMediaList[0]);
        } else if (docData.attachedMedia) {
          setAttachedMedia(docData.attachedMedia);
          setAttachedMediaList([docData.attachedMedia]);
        }
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
    ? generateShareableUrl(codeshareId, encryptionKey, viewOnly)
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
        attachedMediaList={attachedMediaList}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenFileUpload={() => setIsFileUploadOpen(true)}
        expiration={expiration}
        onLogout={handleLogout}
        shareUrl={shareUrl}
        isSaved={isCurrentDocSaved}
        isSyncing={isSyncing}
        onToggleChat={handleToggleChat}
        isChatOpen={isChatOpen}
        unreadChatCount={unreadChatCount}
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
          {activeTab !== 'code' && (attachedMediaList.length > 0 || attachedMedia) ? (
            <MediaViewer
              media={attachedMedia}
              mediaList={attachedMediaList}
              activeMediaId={activeTab !== 'code' ? activeTab : (attachedMediaList[0]?.id || null)}
              onSelectMedia={(id) => setActiveTab(id)}
              onRemove={handleRemoveMedia}
              onDownload={handleDownload}
              onOpenFileUpload={() => setIsFileUploadOpen(true)}
            />
          ) : (
            <EditorWorkspace
              content={content}
              onChange={(val) => {
                if (viewOnly) return;
                setContent(val);
              }}
              cells={cells}
              onUpdateCells={setCells}
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
            viewOnly={viewOnly}
            onToggleViewOnly={handleToggleViewOnly}
            attachedMedia={attachedMedia}
            attachedMediaList={attachedMediaList}
            onOpenFileUpload={() => setIsFileUploadOpen(true)}
            onToggleChat={handleToggleChat}
            isChatOpen={isChatOpen}
            unreadChatCount={unreadChatCount}
          />

          <ChatDrawer
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            messages={chatMessages}
            onSendMessage={handleSendChatMessage}
            mySenderId={tabId}
            mySenderName={currentUser?.name || 'You'}
          />

          <ShareModal
            codeshareId={codeshareId}
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            viewOnly={viewOnly}
            onToggleViewOnly={handleToggleViewOnly}
            collaborators={collaborators}
            encryptionKey={encryptionKey}
            attachedMedia={attachedMedia}
            attachedMediaList={attachedMediaList}
            expiration={expiration}
            onUpdateExpiration={handleUpdateExpiration}
          />

          <FileUploadModal
            codeshareId={codeshareId || ''}
            isOpen={isFileUploadOpen}
            onClose={() => setIsFileUploadOpen(false)}
            onAttachMedia={handleAttachMedia}
            onAttachMultipleMedia={handleAttachMultipleMedia}
            attachedMediaList={attachedMediaList}
            onRemoveMedia={handleRemoveMedia}
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
