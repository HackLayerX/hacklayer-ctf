const { contextBridge, ipcRenderer } = require('electron');

// Minimal, secure API surface — no node access, no secrets, no file system
contextBridge.exposeInMainWorld('ctfAPI', {
    // API calls (proxied + HMAC signed in main process)
    request: (endpoint, method, body, token) =>
        ipcRenderer.invoke('api-request', { endpoint, method, body, token }),

    // Kiosk mode
    enableKiosk: () => ipcRenderer.invoke('enable-kiosk'),
    disableKiosk: () => ipcRenderer.invoke('disable-kiosk'),

    // Navigation (allowlisted pages only)
    navigate: (page) => ipcRenderer.invoke('navigate', page),

    // Security
    reportViolation: (type) => ipcRenderer.invoke('security-violation', type),
    securityCheck: () => ipcRenderer.invoke('security-check'),
    verifyAdminPassword: (pw) => ipcRenderer.invoke('verify-admin-password', pw),

    // Session management
    setSession: (sessionId, token) => ipcRenderer.invoke('set-session', { sessionId, token }),
    clearSession: () => ipcRenderer.invoke('clear-session'),

    // Exit
    exitApp: () => ipcRenderer.invoke('exit-app'),

    // Config (no secrets)
    getConfig: () => ipcRenderer.invoke('get-config'),

    // Events from main process (use once + re-register pattern to prevent listener leak)
    onExitPrompt: (callback) => {
        ipcRenderer.removeAllListeners('show-exit-prompt');
        ipcRenderer.on('show-exit-prompt', callback);
    },
    onSecurityViolation: (callback) => {
        ipcRenderer.removeAllListeners('security-violation-detected');
        ipcRenderer.on('security-violation-detected', (_, type) => callback(type));
    },
    onHeartbeatFailed: (callback) => {
        ipcRenderer.removeAllListeners('heartbeat-failed');
        ipcRenderer.on('heartbeat-failed', (_, count) => callback(count));
    },
    onTokenRefreshed: (callback) => {
        ipcRenderer.removeAllListeners('token-refreshed');
        ipcRenderer.on('token-refreshed', (_, token) => callback(token));
    },
    onServerAnnouncement: (callback) => {
        ipcRenderer.removeAllListeners('server-announcement');
        ipcRenderer.on('server-announcement', (_, msg) => callback(msg));
    },
    onServerMaintenance: (callback) => {
        ipcRenderer.removeAllListeners('server-maintenance');
        ipcRenderer.on('server-maintenance', callback);
    },

    // Auto-update
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateAvailable: (callback) => {
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.on('update-available', (_, version) => callback(version));
    },
    onUpdateProgress: (callback) => {
        ipcRenderer.removeAllListeners('update-progress');
        ipcRenderer.on('update-progress', (_, percent) => callback(percent));
    },
    onUpdateDownloaded: (callback) => {
        ipcRenderer.removeAllListeners('update-downloaded');
        ipcRenderer.on('update-downloaded', (_, version) => callback(version));
    },
});
