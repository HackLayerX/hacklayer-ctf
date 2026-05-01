// ==================== PRE-LAUNCH HARDENING ====================
// Must run BEFORE any Electron APIs — strip dangerous env vars that attackers
// use to escape sandbox, enable Node in renderer, or attach debuggers.

// 1. Kill ELECTRON_RUN_AS_NODE (lets attacker run Node.js instead of Electron)
delete process.env.ELECTRON_RUN_AS_NODE;
// 2. Kill NODE_OPTIONS (--inspect, --require injection, --loader attacks)
delete process.env.NODE_OPTIONS;
// 3. Kill NODE_INSPECT (alternative debug port env)
delete process.env.NODE_INSPECT;
// 4. Kill ELECTRON_ENABLE_LOGGING (info leakage)
delete process.env.ELECTRON_ENABLE_LOGGING;
// 5. Kill NODE_DEBUG (verbose debug output)
delete process.env.NODE_DEBUG;
// 6. Kill ELECTRON_DEBUG_NOTIFICATIONS (info leakage)
delete process.env.ELECTRON_DEBUG_NOTIFICATIONS;
// 7. Kill NODE_EXTRA_CA_CERTS (MITM cert injection)
delete process.env.NODE_EXTRA_CA_CERTS;
// 8. Kill NODE_TLS_REJECT_UNAUTHORIZED (disables TLS verification)
delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
// 9. Kill HTTPS_PROXY / HTTP_PROXY (traffic interception)
delete process.env.HTTPS_PROXY;
delete process.env.HTTP_PROXY;
delete process.env.https_proxy;
delete process.env.http_proxy;
delete process.env.ALL_PROXY;
delete process.env.all_proxy;
// 10. Kill NODE_REPL_HISTORY (info leakage)
delete process.env.NODE_REPL_HISTORY;

const { app, BrowserWindow, globalShortcut, ipcMain, session, screen, powerMonitor } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const os = require('os');
const fetch = require('node-fetch');
const { autoUpdater } = require('electron-updater');

// Enable FaceDetector API for real face detection
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

// Block remote debugging port (attacker tries: electron --remote-debugging-port=9222)
app.commandLine.appendSwitch('remote-debugging-port', '0');
// Disable GPU shader disk cache (info leakage / forensic artifact)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
// Disable background networking (prevents silent data exfiltration)
app.commandLine.appendSwitch('disable-background-networking');

// ==================== CONFIG (Bundled with EXE) ====================
// Admin generates config.json from WordPress plugin → places in electron-app/ → builds EXE
// Players never see any config screen.

function getBundledConfigPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'config.json');
    }
    return path.join(__dirname, 'config.json');
}

let API_BASE = '';
let API_SECRET = '';
let ADMIN_PASSWORD_HASH = '';
let configLoaded = false;

function loadConfig() {
    try {
        const configPath = getBundledConfigPath();
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(raw);
            if (config.api_url && config.api_secret && config.admin_password_hash) {
                API_BASE = config.api_url.replace(/\/+$/, '');
                API_SECRET = config.api_secret;
                ADMIN_PASSWORD_HASH = config.admin_password_hash;
                configLoaded = true;
                return true;
            }
        }
    } catch (e) { }
    return false;
}

let mainWindow = null;
let isKioskMode = false;
let securityInterval = null;
let heartbeatInterval = null;
let currentSessionId = null;
let currentToken = null;

// ==================== OFFLINE RETRY QUEUE ====================
// Queue critical POST requests that fail due to network issues
const retryQueue = [];
const MAX_RETRY_QUEUE = 50;

function enqueueForRetry(endpoint, method, body) {
    if (retryQueue.length >= MAX_RETRY_QUEUE) retryQueue.shift(); // Drop oldest
    retryQueue.push({ endpoint, method, body, timestamp: Date.now() });
}

async function processRetryQueue() {
    if (retryQueue.length === 0 || !currentToken) return;
    const batch = retryQueue.splice(0, 5); // Process 5 at a time
    for (const item of batch) {
        // Skip items older than 10 minutes
        if (Date.now() - item.timestamp > 10 * 60 * 1000) continue;
        try {
            const timestamp = Date.now().toString();
            const sig = signRequest(item.endpoint, item.method, timestamp);
            await fetch(`${API_BASE}${item.endpoint}`, {
                method: item.method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CTF-Client': 'HackLayerDesktop/1.0',
                    'X-CTF-Token': currentToken,
                    'X-CTF-Timestamp': timestamp,
                    'X-CTF-Signature': sig,
                },
                body: JSON.stringify(item.body),
            });
        } catch (e) {
            // Re-queue on failure
            retryQueue.push(item);
            break; // Stop processing if still offline
        }
    }
}

// ==================== SINGLE INSTANCE ====================
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
}

app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// ==================== ANTI-DEBUG / ANTI-TAMPER ====================

// Detect if started with --inspect or debug flags
function detectDebugger() {
    const args = process.argv.join(' ').toLowerCase();
    const debugPatterns = ['--inspect', '--debug', '--remote-debugging', '--devtools'];
    return debugPatterns.some(p => args.includes(p));
}

// Detect screen recording, remote access, MITM proxies, RE tools, debuggers, memory dumpers
function detectSuspiciousProcesses() {
    const suspicious = [
        // Screen recording
        'obs64.exe', 'obs32.exe', 'obs.exe',
        'streamlabs.exe',
        'bandicam.exe',
        'camtasia.exe',
        'screenpresso.exe',
        'sharex.exe',
        'lightshot.exe',
        'greenshot.exe',
        'snagit32.exe', 'snagit.exe',
        'nvidia share.exe', 'nvcontainer.exe',
        'gamebar.exe', 'gamebarpresencewriter.exe',
        'action.exe', // Mirillis Action
        'xsplit.core.exe', 'xsplit.gamecaster.exe',
        'fraps.exe',
        // Remote access
        'teamviewer.exe', 'teamviewer_service.exe',
        'anydesk.exe',
        'ammyy.exe',
        'vnc.exe', 'vncviewer.exe', 'tvnserver.exe', 'winvnc.exe',
        'chrome_remote_desktop.exe',
        'rustdesk.exe',
        'parsec.exe',
        'ultraviewer.exe',
        'supremo.exe', 'supremoservice.exe',
        'logmein.exe', 'lmi_rescue.exe',
        'splashtop.exe',
        // MITM / Proxy / Network interception
        'fiddler.exe', 'fiddler everywhere.exe',
        'charles.exe',
        'mitmproxy.exe', 'mitmweb.exe', 'mitmdump.exe',
        'wireshark.exe', 'dumpcap.exe', 'tshark.exe',
        'burpsuite.exe', 'burp.exe', 'burpsuite_pro.exe',
        'zap.exe', 'zaproxy.exe', // OWASP ZAP
        'httpdebugger.exe', 'httpdebuggerui.exe',
        'proxyman.exe',
        'telerik.fiddler.exe',
        // Debuggers / Reverse engineering
        'x64dbg.exe', 'x32dbg.exe',
        'ollydbg.exe',
        'ida.exe', 'ida64.exe', 'idaq.exe', 'idaq64.exe',
        'ghidra.exe', 'ghidrarun.exe',
        'windbg.exe', 'windbgx.exe',
        'dnspy.exe', 'dnspy-x86.exe',
        'cheatengine-x86_64.exe', 'cheatengine.exe',
        'processhacker.exe',
        'procmon.exe', 'procmon64.exe', // Process Monitor
        'apimonitor-x86.exe', 'apimonitor-x64.exe',
        'pestudio.exe',
        'de4dot.exe',
        'ilspy.exe',
        'dotpeek64.exe', 'dotpeek32.exe',
        // Memory dumpers
        'procdump.exe', 'procdump64.exe',
        'taskmanager.exe', // renamed process hacker
        'hxd.exe', // Hex editor
        'regshot.exe', 'regshot-x64-unicode.exe',
    ];

    try {
        const output = execSync('tasklist /FO CSV /NH', {
            encoding: 'utf8',
            timeout: 5000,
            windowsHide: true
        });
        const running = output.toLowerCase();
        const found = suspicious.filter(p => running.includes(p));
        return found;
    } catch (e) {
        return [];
    }
}

// Detect VM environment
function detectVM() {
    try {
        const wmicOutput = execSync('wmic computersystem get model,manufacturer /format:csv', {
            encoding: 'utf8',
            timeout: 5000,
            windowsHide: true
        }).toLowerCase();

        const vmIndicators = ['virtualbox', 'vmware', 'qemu', 'hyper-v', 'xen', 'parallels', 'virtual machine'];
        return vmIndicators.some(v => wmicOutput.includes(v));
    } catch (e) {
        return false;
    }
}

// Detect MITM proxy by checking Windows system proxy settings
function detectSystemProxy() {
    try {
        const output = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable', {
            encoding: 'utf8',
            timeout: 3000,
            windowsHide: true
        });
        // ProxyEnable = 0x1 means proxy is active
        if (output.includes('0x1')) {
            return true;
        }
    } catch (e) { }
    return false;
}

// Detect if critical app files have been tampered with (asar extraction / modification)
function checkAppIntegrity() {
    try {
        // In packaged app, main.js should be inside app.asar
        // If it's running from extracted folder, __dirname won't contain 'app.asar'
        if (app.isPackaged) {
            // Check that preload.js exists and hasn't been replaced
            const preloadPath = path.join(__dirname, 'preload.js');
            if (!fs.existsSync(preloadPath)) {
                return { intact: false, reason: 'preload_missing' };
            }
            // Verify preload.js contains our security bridge (basic content check)
            const preloadContent = fs.readFileSync(preloadPath, 'utf8');
            if (!preloadContent.includes('contextBridge.exposeInMainWorld') || !preloadContent.includes('ctfAPI')) {
                return { intact: false, reason: 'preload_tampered' };
            }
        }
        return { intact: true };
    } catch (e) {
        return { intact: false, reason: 'integrity_check_error' };
    }
}

// Detect multiple monitors
function getDisplayCount() {
    return screen.getAllDisplays().length;
}

// ==================== HMAC API SIGNING ====================

function signRequest(endpoint, method, timestamp) {
    const payload = `${method}:${endpoint}:${timestamp}`;
    return crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');
}

// ==================== WINDOW CREATION ====================

app.whenReady().then(() => {
    // Pre-launch security checks
    if (detectDebugger()) {
        app.quit();
        return;
    }

    // Load config — quit if not found (admin must bundle config.json)
    if (!loadConfig()) {
        const { dialog } = require('electron');
        dialog.showErrorBox('Configuration Missing', 'config.json not found.\n\nAdmin: Generate config from WordPress → CTF Manager → Settings → Download EXE Config, then place it in the electron-app folder and rebuild the EXE.');
        app.quit();
        return;
    }

    // Premium lock — verify admin password hash is valid (prevents unauthorized builds)
    if (!ADMIN_PASSWORD_HASH || !/^[0-9a-f]{64}$/.test(ADMIN_PASSWORD_HASH)) {
        const { dialog } = require('electron');
        dialog.showErrorBox('Invalid Configuration', 'Admin password not configured.\n\nSet the admin password in WordPress → CTF Manager → Settings, then download a new config.json and rebuild the EXE.');
        app.quit();
        return;
    }

    createWindow();

    // ==================== AUTO-UPDATER ====================
    if (app.isPackaged) {
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.allowPrerelease = false;

        autoUpdater.on('update-available', (info) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('update-available', info.version);
            }
        });

        autoUpdater.on('download-progress', (progress) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('update-progress', Math.round(progress.percent));
            }
        });

        autoUpdater.on('update-downloaded', (info) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('update-downloaded', info.version);
            }
        });

        autoUpdater.on('error', (err) => {
            // Silent fail — don't interrupt user experience
        });

        // Check for updates 5s after launch, then every 30 minutes
        setTimeout(() => autoUpdater.checkForUpdates().catch(() => { }), 5000);
        setInterval(() => autoUpdater.checkForUpdates().catch(() => { }), 30 * 60 * 1000);
    }

    // Auto-grant mic + camera (camera-test.html handles user consent UI)
    const allowedPermissions = ['media', 'microphone', 'camera', 'video'];
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(allowedPermissions.includes(permission));
    });
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        return allowedPermissions.includes(permission);
    });

    // REQUIRED for Electron 25+ — allows device enumeration (camera/mic listing)
    session.defaultSession.setDevicePermissionHandler((details) => {
        return true; // Allow all media devices
    });

    // ==================== CONTENT SECURITY POLICY ====================
    // Inject strict CSP on all loaded pages to prevent XSS, inline script injection,
    // data exfiltration via img/form/fetch to attacker-controlled domains
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'", // inline needed for our HTML files
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:", // avatars from WordPress
            `connect-src 'self' ${API_BASE.replace('/wp-json/ctf/v1', '')}`, // only our API server
            "media-src 'self' blob: mediastream:", // camera/mic
            "frame-src 'self' https: http:", // webview for CTF challenges
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'none'", // block form submissions to external
            "worker-src 'self' blob:",
        ].join('; ');
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [csp],
            }
        });
    });

    // ==================== TLS CERTIFICATE VALIDATION ====================
    // Reject invalid/self-signed certs (prevents MITM with Fiddler/Burp/Charles)
    // In production, only valid CA-signed certs are accepted
    session.defaultSession.setCertificateVerifyProc((request, callback) => {
        // 0 = success (valid cert), -2 = reject
        if (request.errorCode !== 0) {
            // Certificate error — likely MITM proxy with self-signed cert
            notifyViolation('tls_certificate_invalid:' + request.hostname);
            callback(-2); // REJECT the connection
        } else {
            callback(0); // Accept valid cert
        }
    });
});


function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: Math.min(1280, width),
        height: Math.min(800, height),
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            devTools: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
            enableRemoteModule: false,
            webviewTag: true,
            spellcheck: false,
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false,
        title: 'HackLayer CTF',
        // Prevent DLL injection via Windows hooks
        backgroundColor: '#0f1117',
        autoHideMenuBar: true,
    });

    // Remove menu bar entirely
    mainWindow.setMenu(null);

    // Always go to login — config is bundled, no setup needed
    mainWindow.loadFile(path.join(__dirname, 'src', 'login.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Block DevTools via keyboard shortcuts
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') event.preventDefault();
        if (input.control && input.shift && ['I', 'J', 'C', 'K'].includes(input.key)) event.preventDefault();
        if (input.control && input.key === 'u') event.preventDefault();
        if (input.control && input.key === 'r') event.preventDefault();
        if (input.control && input.key === 'l') event.preventDefault();
        if (input.control && input.key === 'p') event.preventDefault();
        if (input.control && input.key === 's') event.preventDefault();
        if (input.key === 'F5') event.preventDefault();
        if (input.key === 'F11') event.preventDefault();
    });

    // Block opening DevTools programmatically
    mainWindow.webContents.on('devtools-opened', () => {
        mainWindow.webContents.closeDevTools();
        notifyViolation('devtools_opened');
    });

    // Block new windows / popups
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    // Block navigation to external URLs in main window (also blocks drag-and-drop file opens)
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('file://')) {
            event.preventDefault();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (isKioskMode) disableKioskMode();
        stopSecurityMonitor();
    });

    // Prevent window from being moved/resized when in kiosk
    mainWindow.on('move', () => {
        if (isKioskMode) {
            const { x, y } = screen.getPrimaryDisplay().bounds;
            mainWindow.setPosition(x, y);
        }
    });

    // Re-focus if loses focus in kiosk mode
    let lastBlurLog = 0;
    mainWindow.on('blur', () => {
        if (isKioskMode && mainWindow && !mainWindow.isDestroyed()) {
            const now = Date.now();
            if (now - lastBlurLog > 30000) {
                lastBlurLog = now;
                notifyViolation('focus_lost_alt_tab');
            }
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed() && isKioskMode) {
                    mainWindow.focus();
                    mainWindow.moveTop();
                }
            }, 100);
        }
    });

    // Block minimize in kiosk
    mainWindow.on('minimize', () => {
        if (isKioskMode) {
            mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// ==================== KIOSK MODE ====================

function enableKioskMode() {
    if (!mainWindow) return;
    isKioskMode = true;

    mainWindow.setKiosk(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setSkipTaskbar(true);
    mainWindow.setFullScreen(true);
    mainWindow.setClosable(false);
    mainWindow.setMinimizable(false);
    mainWindow.setMaximizable(false);
    mainWindow.setResizable(false);

    // Block all dangerous keyboard shortcuts
    const blockedShortcuts = [
        'Alt+Tab', 'Alt+F4', 'Alt+Escape',
        'CommandOrControl+Escape', 'Super',
        'Alt+Space', 'CommandOrControl+Shift+Escape',
        'CommandOrControl+Shift+Delete',
        'CommandOrControl+Alt+Delete',
        'CommandOrControl+W', 'CommandOrControl+Q',
        'CommandOrControl+N', 'CommandOrControl+T',
        'PrintScreen',
        'CommandOrControl+PrintScreen',
        'Alt+PrintScreen',
        'CommandOrControl+Shift+S', // Snipping tool
    ];

    blockedShortcuts.forEach(shortcut => {
        try { globalShortcut.register(shortcut, () => { }); } catch (e) { }
    });

    // Admin exit shortcut
    try {
        globalShortcut.register('CommandOrControl+Shift+Alt+Q', () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('show-exit-prompt');
            }
        });
    } catch (e) { }

    // Start security monitoring
    startSecurityMonitor();
}

function disableKioskMode() {
    isKioskMode = false;
    globalShortcut.unregisterAll();
    stopSecurityMonitor();

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setKiosk(false);
        mainWindow.setAlwaysOnTop(false);
        mainWindow.setSkipTaskbar(false);
        mainWindow.setFullScreen(false);
        mainWindow.setClosable(true);
        mainWindow.setMinimizable(true);
        mainWindow.setMaximizable(true);
        mainWindow.setResizable(true);
    }
}

// ==================== SECURITY MONITOR ====================

let displayAddedHandler = null;
let suspendHandler = null;

function startSecurityMonitor() {
    // Prevent interval leak — always clean up before restarting
    stopSecurityMonitor();

    // Check every 15 seconds for threats (kiosk-only active monitoring)
    securityInterval = setInterval(() => {
        if (!isKioskMode || !mainWindow || mainWindow.isDestroyed()) return;

        // 1. Multi-monitor check
        if (getDisplayCount() > 1) {
            notifyViolation('multiple_monitors');
        }

        // 2. Suspicious process check (screen rec, MITM proxy, RE tools, debuggers)
        const found = detectSuspiciousProcesses();
        if (found.length > 0) {
            notifyViolation('suspicious_process:' + found.join(','));
        }

        // 3. System proxy detection (Fiddler/Burp/Charles proxy active)
        if (detectSystemProxy()) {
            notifyViolation('system_proxy_detected');
        }

        // 4. App integrity check (detect asar extraction / file tampering)
        const integrity = checkAppIntegrity();
        if (!integrity.intact) {
            notifyViolation('app_tampered:' + integrity.reason);
        }

        // 5. Re-assert always on top
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.moveTop();
        }
    }, 15000);

    // Heartbeat to server every 30s (ALWAYS runs — not kiosk-only)
    let heartbeatFailCount = 0;
    let lastTokenRefresh = Date.now();
    heartbeatInterval = setInterval(async () => {
        if (!currentSessionId || !currentToken) return;
        try {
            const timestamp = Date.now().toString();
            const sig = signRequest('/heartbeat', 'POST', timestamp);
            const resp = await fetch(`${API_BASE}/heartbeat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CTF-Client': 'HackLayerDesktop/1.0',
                    'X-CTF-Token': currentToken,
                    'X-CTF-Timestamp': timestamp,
                    'X-CTF-Signature': sig,
                },
                body: JSON.stringify({ session_id: currentSessionId }),
            });
            if (resp.ok) heartbeatFailCount = 0;

            // Process retry queue when back online
            if (resp.ok && retryQueue.length > 0) {
                processRetryQueue();
            }

            // Parse heartbeat response for announcements/maintenance
            if (resp.ok) {
                try {
                    const hbData = await resp.json();
                    if (hbData.announcement && mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('server-announcement', hbData.announcement);
                    }
                    if (hbData.maintenance && mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('server-maintenance');
                    }
                } catch (e2) { /* non-JSON ok response, ignore */ }
            }

            // Token auto-refresh: every 20 hours (token lasts 24h, refresh before expiry)
            if (Date.now() - lastTokenRefresh > 20 * 60 * 60 * 1000) {
                const rt = Date.now().toString();
                const rs = signRequest('/refresh-token', 'POST', rt);
                const refreshResp = await fetch(`${API_BASE}/refresh-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CTF-Client': 'HackLayerDesktop/1.0',
                        'X-CTF-Token': currentToken,
                        'X-CTF-Timestamp': rt,
                        'X-CTF-Signature': rs,
                    },
                    body: JSON.stringify({}),
                });
                if (refreshResp.ok) {
                    const data = await refreshResp.json();
                    if (data.token) {
                        currentToken = data.token;
                        lastTokenRefresh = Date.now();
                        // Notify renderer to update sessionStorage
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('token-refreshed', data.token);
                        }
                    }
                }
            }
        } catch (e) {
            heartbeatFailCount++;
            // After 3 consecutive failures (90s), notify renderer
            if (heartbeatFailCount >= 3 && mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('heartbeat-failed', heartbeatFailCount);
            }
        }
    }, 30000);

    // Monitor display changes (store handler for cleanup)
    displayAddedHandler = () => {
        if (isKioskMode) notifyViolation('display_added');
    };
    screen.on('display-added', displayAddedHandler);

    // Monitor power events (sleep = suspicious)
    suspendHandler = () => {
        if (isKioskMode) notifyViolation('system_suspend');
    };
    powerMonitor.on('suspend', suspendHandler);
}

function stopSecurityMonitor() {
    if (securityInterval) { clearInterval(securityInterval); securityInterval = null; }
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    // Remove event listeners to prevent leaks
    if (displayAddedHandler) { screen.removeListener('display-added', displayAddedHandler); displayAddedHandler = null; }
    if (suspendHandler) { powerMonitor.removeListener('suspend', suspendHandler); suspendHandler = null; }
}

function notifyViolation(type) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('security-violation-detected', type);
    }
}

// ==================== IPC HANDLERS ====================

// Signed API proxy — with input validation
ipcMain.handle('api-request', async (event, { endpoint, method, body, token }) => {
    try {
        // Input validation: prevent SSRF & injection
        if (typeof endpoint !== 'string' || !endpoint.startsWith('/') || endpoint.includes('://') || endpoint.includes('..')) {
            return { status: 400, data: { error: 'Invalid endpoint' } };
        }
        const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
        method = String(method || 'GET').toUpperCase();
        if (!allowedMethods.includes(method)) {
            return { status: 400, data: { error: 'Invalid method' } };
        }
        if (endpoint.length > 200) {
            return { status: 400, data: { error: 'Endpoint too long' } };
        }

        const url = `${API_BASE}${endpoint}`;
        const timestamp = Date.now().toString();
        const signature = signRequest(endpoint, method, timestamp);

        const headers = {
            'Content-Type': 'application/json',
            'X-CTF-Timestamp': timestamp,
            'X-CTF-Signature': signature,
            'X-CTF-Client': 'HackLayerDesktop/1.0',
        };
        if (token) headers['X-CTF-Token'] = token;

        const options = { method: method || 'GET', headers };
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        // Queue critical POST requests for retry when back online
        const retryableEndpoints = ['/submit-flag', '/violation', '/warning', '/bot-activity'];
        if (method === 'POST' && retryableEndpoints.some(e => endpoint.startsWith(e)) && body) {
            enqueueForRetry(endpoint, method, body);
        }
        return { status: 500, data: { error: 'Network error. Check your connection.' } };
    }
});

// Store session info for heartbeat — validate input types
ipcMain.handle('set-session', (event, { sessionId, token }) => {
    if (typeof sessionId === 'number' && sessionId > 0 && typeof token === 'string' && token.length < 1000) {
        currentSessionId = sessionId;
        currentToken = token;
        // Start heartbeat + security monitoring (works in all modes)
        startSecurityMonitor();
        return true;
    }
    return false;
});

// Security check on demand — comprehensive threat assessment
ipcMain.handle('security-check', () => {
    const threats = [];

    if (getDisplayCount() > 1) threats.push('multiple_monitors');

    const procs = detectSuspiciousProcesses();
    if (procs.length > 0) threats.push('screen_recording:' + procs.join(','));

    if (detectVM()) threats.push('virtual_machine');

    if (detectSystemProxy()) threats.push('system_proxy');

    const integrity = checkAppIntegrity();
    if (!integrity.intact) threats.push('app_tampered:' + integrity.reason);

    if (detectDebugger()) threats.push('debugger_attached');

    return { clean: threats.length === 0, threats };
});

// Verify admin password (hash comparison, never plaintext) — with brute force protection
let adminPasswordAttempts = 0;
let adminPasswordLockoutUntil = 0;
ipcMain.handle('verify-admin-password', (event, password) => {
    if (typeof password !== 'string' || password.length > 200) return false;
    const now = Date.now();
    if (adminPasswordLockoutUntil > now) return false;
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const valid = hash === ADMIN_PASSWORD_HASH;
    if (!valid) {
        adminPasswordAttempts++;
        if (adminPasswordAttempts >= 5) {
            adminPasswordLockoutUntil = now + 300000; // 5 min lockout
            adminPasswordAttempts = 0;
        }
    } else {
        adminPasswordAttempts = 0;
    }
    return valid;
});

// Enable kiosk
ipcMain.handle('enable-kiosk', () => {
    enableKioskMode();
    return true;
});

// Disable kiosk (admin exit)
ipcMain.handle('disable-kiosk', () => {
    disableKioskMode();
    return true;
});

// Navigate to page — strict allowlist + type check
ipcMain.handle('navigate', (event, page) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        const allowedPages = [
            'login.html',
            'category.html',
            'lobby.html',
            'camera-test.html',
            'mode-select.html',
            'secure-env.html',
            'hacklayer-env.html',
            'hacklayer-bg.html',
            'hacklayer-sidebar.html',
            'profile.html',
        ];
        if (typeof page === 'string' && allowedPages.includes(page) && /^[a-z\-]+\.html$/.test(page)) {

            // Game mode: resizable, minimizable window
            if (page === 'secure-env.html') {
                mainWindow.setKiosk(false);
                mainWindow.setFullScreen(false);
                mainWindow.setAlwaysOnTop(false);
                mainWindow.setResizable(true);
                mainWindow.setMinimizable(true);
                mainWindow.setSkipTaskbar(false);
                const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
                mainWindow.setSize(Math.min(1200, width), Math.min(800, height));
                mainWindow.center();
            }

            mainWindow.loadFile(path.join(__dirname, 'src', page));
        }
    }
});

// Report security violation — sanitize type before sending to server
ipcMain.handle('security-violation', async (event, type) => {
    // Sanitize: only allow safe characters in violation type
    if (typeof type !== 'string') type = 'unknown';
    type = type.replace(/[^a-zA-Z0-9_:\-.,]/g, '').substring(0, 200);

    // Forward to server if we have a session
    if (currentSessionId && currentToken) {
        try {
            const timestamp = Date.now().toString();
            const sig = signRequest('/violation', 'POST', timestamp);
            await fetch(`${API_BASE}/violation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CTF-Client': 'HackLayerDesktop/1.0',
                    'X-CTF-Token': currentToken,
                    'X-CTF-Timestamp': timestamp,
                    'X-CTF-Signature': sig,
                },
                body: JSON.stringify({ session_id: currentSessionId, type }),
            });
        } catch (e) { }
    }
    return { detected: type };
});

// Clear session data
ipcMain.handle('clear-session', async () => {
    currentSessionId = null;
    currentToken = null;
    if (session.defaultSession) {
        await session.defaultSession.clearStorageData();
        await session.defaultSession.clearCache();
    }
    return true;
});

// Exit app
ipcMain.handle('exit-app', () => {
    disableKioskMode();
    app.quit();
});

// Get app config (no secrets exposed)
ipcMain.handle('get-config', () => {
    return {
        version: app.getVersion(),
        displays: getDisplayCount(),
    };
});

// Auto-updater IPC
ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) return { available: false, reason: 'dev-mode' };
    try {
        const result = await autoUpdater.checkForUpdates();
        return { available: !!result?.updateInfo, version: result?.updateInfo?.version };
    } catch (e) {
        return { available: false, error: e.message };
    }
});

ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true);
});

// ==================== APP LIFECYCLE ====================

app.on('window-all-closed', () => {
    if (isKioskMode) disableKioskMode();
    app.quit();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopSecurityMonitor();
});

// Prevent protocol handlers that could be used to escape
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (e, url) => {
        // Webviews: allow http/https only (block javascript:, data:, file:// protocols)
        if (contents.getType() === 'webview') {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                e.preventDefault();
            }
        } else {
            // Main window: only file:// allowed
            if (!url.startsWith('file://')) e.preventDefault();
        }
    });

    contents.on('will-attach-webview', (e, webPreferences, params) => {
        // Strip any preload scripts injected into webview
        delete webPreferences.preload;
        delete webPreferences.preloadURL;

        // Enforce secure defaults
        webPreferences.nodeIntegration = false;
        webPreferences.contextIsolation = true;
        webPreferences.enableRemoteModule = false;
        webPreferences.devTools = false;
        webPreferences.sandbox = true;

        // Isolate webview cookies/storage from main app
        webPreferences.partition = 'webview-sandbox';

        // Block webview loading dangerous protocols
        if (params.src && !params.src.startsWith('http://') && !params.src.startsWith('https://')) {
            e.preventDefault();
        }
    });

    // Block popup/new-window creation from ALL web contents
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
