import React from 'react';

/**
 * FirebaseConfigModal is deprecated as credentials are now securely managed
 * via environment variables (.env) and never exposed in the client UI.
 */
export const FirebaseConfigModal: React.FC<{ isOpen?: boolean; onClose?: () => void }> = () => null;
