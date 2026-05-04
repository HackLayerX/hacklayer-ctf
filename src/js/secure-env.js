// ==================== SECURE ENVIRONMENT CONTROLLER ====================

// Block right-click globally
document.addEventListener('contextmenu', e => e.preventDefault());

// Block all text selection and drag
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());

// ===== Draggable Float Windows =====
(function initDraggableWindows() {
    let dragWin = null, offsetX = 0, offsetY = 0;
    let topZ = 51;

    // Bring window to front on any click
    document.addEventListener('pointerdown', e => {
        const win = e.target.closest('.float-window');
        if (win) win.style.zIndex = ++topZ;

        const header = e.target.closest('.float-window .window-header');
        if (!header || e.target.closest('.window-close')) return;
        dragWin = header.closest('.float-window');
        const rect = dragWin.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        dragWin.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    document.addEventListener('pointermove', e => {
        if (!dragWin) return;
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        // Keep within viewport
        const maxX = window.innerWidth - dragWin.offsetWidth;
        const maxY = window.innerHeight - dragWin.offsetHeight;
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));
        dragWin.style.left = x + 'px';
        dragWin.style.top = y + 'px';
        dragWin.style.right = 'auto';
        dragWin.style.bottom = 'auto';
    });

    document.addEventListener('pointerup', () => {
        dragWin = null;
    });
})();

// ===== Session Data =====
const token = sessionStorage.getItem('ctf_token');
const user = JSON.parse(sessionStorage.getItem('ctf_user') || '{}');
const event = JSON.parse(sessionStorage.getItem('ctf_event') || '{}');
const slot = JSON.parse(sessionStorage.getItem('ctf_slot') || '{}');

if (!token || !slot.slot_id) window.ctfAPI.navigate('login.html');

// ===== State =====
let sessionId = null;
let challenges = [];
let solvedFlags = {};
let warnings = 0;
let isKicked = false;
let myScore = 0;
let myFlagCount = 0;
let eventEnded = false;
let allPlayers = [];
let botProfiles = [];
let botProgress = {};
let notifications = [];
let notifShown = 0;
let notifTimers = [];
let logEntries = [];
let lastActivityTime = Date.now();
let focusLossCount = 0;
let securityCheckPassed = false;
let micStream = null;
let micAnalyser = null;
let micLoudCount = 0;

let displayMode = 'multi';
let eventDescription = '';

// ===== Internet Monitoring State =====
let internetWarnings = 0;
let internetOffline = false;
let internetOfflineAt = 0;
let internetCheckInterval = null;

// Single mode — no kiosk, resizable window with camera monitoring
const isKioskMode = false;

// ===== Init =====
(async function init() {

    // Setup top bar
    document.getElementById('topName').textContent = user.display_name || user.username;
    document.getElementById('topId').textContent = '#' + user.id;
    if (user.avatar) document.getElementById('topAvatar').src = user.avatar;
    document.getElementById('topEvent').textContent = event.event_title || '';

    // Watermark (forensic — tracks user identity on screenshots)
    const wmText = `${user.username}  ${user.id}  `;
    document.getElementById('watermark').textContent = wmText.repeat(6);

    // Get session ID
    const slotRes = await window.ctfAPI.request(`/slot/status/${slot.slot_id}`, 'GET', null, token);
    if (slotRes.status === 200) {
        const me = slotRes.data.players.find(p => p.user_id === user.id);
        if (me) sessionId = me.session_id;
    }

    // Register session with main process (for heartbeat + HMAC signing)
    if (sessionId) {
        await window.ctfAPI.setSession(sessionId, token);
    }

    // Load challenges
    const chRes = await window.ctfAPI.request(`/challenges/${event.event_id}`, 'GET', null, token);
    if (chRes.status === 200) {
        challenges = chRes.data.challenges || [];
        displayMode = chRes.data.display_mode || 'multi';
        eventDescription = chRes.data.event_description || '';

        // Restore progress if resuming from crash
        const resumeData = sessionStorage.getItem('ctf_resume');
        if (resumeData) {
            try {
                const resume = JSON.parse(resumeData);
                myScore = resume.score || 0;
                myFlagCount = resume.flags_solved || 0;
                warnings = resume.warnings || 0;
                if (resume.solved_challenge_ids && Array.isArray(resume.solved_challenge_ids)) {
                    resume.solved_challenge_ids.forEach(cid => { solvedFlags[cid] = true; });
                }
                addLog('Session resumed — progress restored', 'success');
            } catch (e) { }
            sessionStorage.removeItem('ctf_resume');
        }

        renderFlags();
    }

    // Load bot profiles
    const botRes = await window.ctfAPI.request(`/bots/${slot.slot_id}`, 'GET', null, token);
    if (botRes.status === 200) {
        botProfiles = botRes.data.bots || [];
        botProfiles.forEach(b => {
            botProgress[b.id] = { score: 0, flags_solved: 0, kicked: false };
        });
    }

    // Load notifications (paid events only)
    if (event.event_type === 'paid') {
        const notifRes = await window.ctfAPI.request('/notifications', 'GET', null, token);
        if (notifRes.status === 200) {
            notifications = notifRes.data.notifications || [];
            scheduleFakeNotifications();
        }
    }

    // Start event timer
    startEventTimer();

    // Startup logs
    addLog('Secure environment initialized', 'success');
    addLog(`Event: ${event.event_title || 'Unknown'}`, 'info');
    addLog(`Player: ${user.display_name || user.username} connected`, 'info');
    if (challenges.length > 0) {
        addLog(`${challenges.length} challenges loaded`, 'info');
    }

    // Start bot simulation
    simulateBots();

    // Start polling
    setInterval(pollLeaderboard, 10000);
    setInterval(pollLogs, 8000);
    setInterval(checkSlotValidity, 15000); // Check if slot still exists

    // Periodic security re-check (kiosk only)
    if (isKioskMode) {
        setInterval(runPeriodicSecurityCheck, 45000);
        // Clipboard poisoning — clear clipboard every 5s
        setInterval(() => {
            try { navigator.clipboard.writeText(''); } catch (e) { }
        }, 5000);
    }

    // Admin exit listener (from main process Ctrl+Shift+Alt+Q)
    window.ctfAPI.onExitPrompt(() => {
        document.getElementById('exitOverlay').classList.add('show');
    });

    // Listen for violations detected by main process
    window.ctfAPI.onSecurityViolation((type) => {
        handleMainProcessViolation(type);
    });

    // Listen for heartbeat failures from main process (server unreachable)
    window.ctfAPI.onHeartbeatFailed((count) => {
        if (!internetOffline && !isKicked && !eventEnded) {
            handleInternetLost();
        }
    });

    // Listen for token refresh from main process (auto-extends session)
    window.ctfAPI.onTokenRefreshed((newToken) => {
        sessionStorage.setItem('ctf_token', newToken);
    });

    // Server announcements (admin broadcast)
    window.ctfAPI.onServerAnnouncement((msg) => {
        addLog('📢 ADMIN: ' + msg, 'warning');
    });

    // Maintenance mode notification
    window.ctfAPI.onServerMaintenance(() => {
        addLog('🔧 Server entering maintenance mode. Game may be interrupted.', 'error');
    });

    // Security event listeners (kiosk mode only)
    if (isKioskMode) {
        window.addEventListener('blur', handleFocusLoss);
        window.addEventListener('focus', handleFocusReturn);
        document.addEventListener('keydown', handleKeyBlock);
        document.addEventListener('copy', e => e.preventDefault());
        document.addEventListener('cut', e => e.preventDefault());
        document.addEventListener('paste', e => {
            if (!e.target.classList.contains('flag-input') && !e.target.classList.contains('browser-url')) {
                e.preventDefault();
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !isKicked && !eventEnded) {
                reportWarning('visibility_hidden');
            }
        });
    }

    // Start mic monitoring (volume only — no recording)
    startMicMonitoring();

    // Start internet connectivity monitor
    startInternetMonitor();

    // Start camera monitoring after cinematic intro finishes (7s)
    setTimeout(() => startCameraMonitoring(), 7000);
})();

// ===== Security Check =====
async function runSecurityCheck() {
    const result = await window.ctfAPI.securityCheck();
    if (!result.clean) {
        const threats = result.threats;
        // Show blocking overlay for critical threats
        if (threats.some(t => t.includes('screen_recording') || t.includes('suspicious_process'))) {
            showSecurityBlock('Screen recording or remote access software detected. Please close it to continue.', threats);
            return;
        }
        if (threats.some(t => t.includes('multiple_monitors'))) {
            showSecurityBlock('Multiple monitors detected. Please disconnect extra monitors to continue.', threats);
            return;
        }
        // VM is a warning, not a block (some users legitimately use VMs)
        if (threats.some(t => t.includes('virtual_machine'))) {
            addLog('VM environment detected — flagged for review', 'warn');
        }
    }
    securityCheckPassed = true;
}

async function runPeriodicSecurityCheck() {
    if (isKicked || eventEnded) return;
    const result = await window.ctfAPI.securityCheck();
    if (!result.clean) {
        const threats = result.threats;
        if (threats.some(t => t.includes('screen_recording') || t.includes('suspicious_process'))) {
            reportWarning('runtime_screen_recording:' + threats.join(','));
        }
        if (threats.some(t => t.includes('multiple_monitors') || t.includes('display_added'))) {
            reportWarning('runtime_multi_monitor');
        }
    }
}

function showSecurityBlock(message, threats) {
    // Create blocking overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;justify-content:center;align-items:center;z-index:10000;';
    overlay.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--red);border-radius:10px;padding:40px;max-width:440px;text-align:center;">
            <div style="width:48px;height:48px;margin:0 auto 16px;border-radius:50%;background:var(--red-dim);display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width:24px;height:24px;"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            </div>
            <h2 style="color:var(--red);font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Security Check Failed</h2>
            <p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px;line-height:1.5;">${escapeHtml(message)}</p>
            <button class="btn btn-danger" onclick="location.reload()" style="width:auto;padding:10px 32px;display:inline-block;">Retry</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// ===== Violations from Main Process =====
function handleMainProcessViolation(type) {
    if (isKicked || eventEnded) return;

    if (type === 'devtools_opened') {
        reportWarning('devtools_opened');
    } else if (type.startsWith('suspicious_process')) {
        reportWarning(type);
    } else if (type === 'multiple_monitors' || type === 'display_added') {
        reportWarning('multi_monitor_detected');
    } else if (type === 'system_suspend') {
        reportWarning('system_suspend');
    } else {
        reportWarning(type);
    }
}

// ===== Event Timer =====
function startEventTimer() {
    // Use slot.ends_at directly — it already includes duration from the server
    const endTime = slot.ends_at
        ? new Date(slot.ends_at.replace(' ', 'T')).getTime()
        : new Date(slot.starts_at.replace(' ', 'T')).getTime() + (slot.duration_minutes || 60) * 60000;

    function tick() {
        if (eventEnded || isKicked) return;
        const now = Date.now();
        const diff = endTime - now;

        if (diff <= 0) {
            document.getElementById('eventTimer').textContent = '00:00:00';
            endEvent();
            return;
        }

        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        document.getElementById('eventTimer').textContent =
            String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }
    tick();
    setInterval(tick, 1000);
}

// ===== VISIBLE ERROR LOG (shown to all users) =====
let visibleErrors = [];
let errorHideTimer = null;

function showErrorToUser(message, type = 'error') {
    const bar = document.getElementById('errorLogBar');
    if (!bar) return;

    const colors = {
        error: '#ef4444',
        warn: '#f59e0b',
        camera: '#ef4444',
        kick: '#ff0000',
    };
    const color = colors[type] || '#ef4444';
    const time = new Date().toLocaleTimeString();

    const entry = document.createElement('div');
    entry.style.cssText = `color:${color};padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.05);`;
    entry.textContent = `[${time}] ⚠ ${message}`;

    bar.appendChild(entry);
    bar.style.display = 'flex';
    bar.scrollTop = bar.scrollHeight;

    visibleErrors.push({ message, type, time: Date.now() });

    // Cap at 10 entries — remove oldest
    while (bar.children.length > 10) {
        bar.removeChild(bar.firstChild);
    }
    if (visibleErrors.length > 10) {
        visibleErrors = visibleErrors.slice(-10);
    }

    // Auto-hide after 15s (reset timer on each new error)
    if (errorHideTimer) clearTimeout(errorHideTimer);
    errorHideTimer = setTimeout(() => {
        bar.style.display = 'none';
        bar.innerHTML = '';
        visibleErrors = [];
        errorHideTimer = null;
    }, 15000);
}

// ===== Window Toggle =====
function toggleWindow(id) {
    const win = document.getElementById(id);
    const isVisible = win.classList.contains('show');

    const tbMap = {
        winLeaderboard: 'tbLeaderboard',
        winFlags: 'tbFlags',
        winLogs: 'tbLogs',
        winBrowser: 'tbBrowser',
        winScore: 'tbScore',
        winCamera: 'tbCamera',
    };
    const tbId = tbMap[id];

    if (isVisible) {
        win.classList.remove('show');
        if (tbId) document.getElementById(tbId).classList.remove('active');
    } else {
        win.classList.add('show');
        if (tbId) document.getElementById(tbId).classList.add('active');
    }
}

// ===== Render Flags =====
function renderFlags() {
    const body = document.getElementById('flagsBody');
    body.innerHTML = '';

    if (displayMode === 'single') {
        // SINGLE CHALLENGE MODE: 1 description at top, multiple flag inputs below
        if (eventDescription) {
            const descDiv = document.createElement('div');
            descDiv.className = 'flag-single-desc';
            descDiv.innerHTML = `<p>${escapeHtml(eventDescription)}</p>`;
            body.appendChild(descDiv);
        }

        const flagGrid = document.createElement('div');
        flagGrid.className = 'flag-single-grid';

        challenges.forEach(ch => {
            const solved = solvedFlags[ch.id];
            const row = document.createElement('div');
            row.className = 'flag-single-row' + (solved ? ' solved' : '');

            const statusSvg = solved
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="#00e87b" stroke-width="2.5" style="width:18px;height:18px;"><path d="M20 6L9 17l-5-5"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="#44445a" stroke-width="1.5" style="width:18px;height:18px;"><circle cx="12" cy="12" r="9"/></svg>';

            row.innerHTML = `
                <div class="flag-single-num">${parseInt(ch.step_number) || 0}</div>
                <div class="flag-single-label">${escapeHtml(ch.title || 'Flag ' + ch.step_number)}</div>
                <input type="text" class="flag-input" id="flag_${parseInt(ch.id) || 0}" placeholder="flag{...}" ${solved ? 'disabled' : ''} autocomplete="off" spellcheck="false">
                <button class="flag-submit-btn" onclick="submitFlag(${parseInt(ch.id) || 0})" ${solved ? 'disabled' : ''}>Submit</button>
                <div class="flag-single-status">${statusSvg}</div>
                <div class="flag-single-pts">${parseInt(ch.points) || 0}pt</div>
            `;
            flagGrid.appendChild(row);
        });

        body.appendChild(flagGrid);
    } else {
        // MULTI CHALLENGE MODE: each flag has its own title + description (original)
        challenges.forEach(ch => {
            const solved = solvedFlags[ch.id];
            const div = document.createElement('div');
            div.className = 'flag-step' + (solved ? ' solved' : '');

            const statusSvg = solved
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="#00e87b" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="#44445a" stroke-width="1.5"><circle cx="12" cy="12" r="9"/></svg>';

            div.innerHTML = `
                <div class="flag-number">${parseInt(ch.step_number) || 0}</div>
                <div class="flag-info">
                    <div class="flag-title">${escapeHtml(ch.title)}</div>
                    <div class="flag-desc">${escapeHtml(ch.description || '')}</div>
                    <div class="flag-row">
                        <input type="text" class="flag-input" id="flag_${parseInt(ch.id) || 0}" placeholder="Enter flag..." ${solved ? 'disabled' : ''} autocomplete="off" spellcheck="false">
                        <button class="flag-submit-btn" onclick="submitFlag(${parseInt(ch.id) || 0})" ${solved ? 'disabled' : ''}>Submit</button>
                    </div>
                </div>
                <div class="flag-status-icon">${statusSvg}</div>
            `;
            body.appendChild(div);
        });
    }

    // Update flag count display
    document.getElementById('myFlags').textContent = myFlagCount + '/' + challenges.length;
}

// ===== Submit Flag =====
async function submitFlag(challengeId) {
    if (!sessionId || isKicked || eventEnded) return;

    // Block submissions while offline
    if (internetOffline) {
        showErrorToUser('Cannot submit — no internet connection', 'error');
        return;
    }

    const input = document.getElementById('flag_' + challengeId);
    const answer = input.value.trim();
    if (!answer) return;

    // Rate limit: track last submit time
    const now = Date.now();
    if (submitFlag._lastTime && now - submitFlag._lastTime < 2000) {
        return; // 2 second cooldown
    }
    submitFlag._lastTime = now;

    const res = await window.ctfAPI.request('/submit-flag', 'POST', {
        session_id: sessionId,
        challenge_id: challengeId,
        answer: answer,
    }, token);

    if (res.status === 200) {
        if (res.data.correct) {
            solvedFlags[challengeId] = true;
            myScore += res.data.points;
            myFlagCount++;
            updateScoreDisplay();
            renderFlags();
            addLog(`You completed step ${challenges.find(c => c.id === challengeId)?.step_number}`, 'success');
        } else {
            input.style.borderColor = 'var(--red)';
            setTimeout(() => input.style.borderColor = '', 1500);
            addLog('Incorrect flag submitted', 'error');
        }
    }
}

// ===== Update Score Display =====
function updateScoreDisplay() {
    document.getElementById('myFlags').textContent = myFlagCount + '/' + challenges.length;
}

// ===== Slot Validity Check =====
let slotCheckFailCount = 0;
async function checkSlotValidity() {
    if (eventEnded || isKicked) return;
    try {
        const res = await window.ctfAPI.request('/slot/status/' + slot.slot_id, 'GET', null, token);
        if (res.status === 404 || res.status === 403) {
            slotCheckFailCount++;
            if (slotCheckFailCount >= 2) {
                eventEnded = true;
                document.getElementById('kickOverlay').querySelector('h2').textContent = 'Session Ended';
                document.getElementById('kickOverlay').querySelector('p').textContent = 'This event slot has been removed by the admin.';
                document.getElementById('kickOverlay').classList.add('show');
            }
        } else {
            slotCheckFailCount = 0;
            if (res.status === 200 && res.data.players) {
                const me = res.data.players.find(p => p.user_id === user.id);
                if (me && me.is_kicked) {
                    isKicked = true;
                    document.getElementById('kickOverlay').classList.add('show');
                }
            }
        }
    } catch (e) { }
}

// ===== Leaderboard =====
// Track removed players for cross animation
let removedPlayers = {}; // { name: removeTimestamp }

async function pollLeaderboard() {
    if (eventEnded || isKicked) return;

    const res = await window.ctfAPI.request(`/leaderboard/${slot.slot_id}`, 'GET', null, token);
    if (res.status !== 200) return;

    let leaderboard = res.data.leaderboard || [];

    // Merge bots (only active ones — not yet "left")
    botProfiles.forEach(bot => {
        const bp = botProgress[bot.id];
        if (bp && !bp.left) {
            leaderboard.push({
                display_name: bot.display_name,
                avatar: bot.avatar,
                score: bp.score,
                flags_solved: bp.flags_solved,
                is_kicked: bp.kicked,
                is_bot: true,
            });
        }
    });

    // Sort by flags solved (internal sort — not shown to user)
    leaderboard.sort((a, b) => b.flags_solved - a.flags_solved || b.score - a.score);

    // Find my rank
    const myIdx = leaderboard.findIndex(e => !e.is_bot && e.display_name === (user.display_name || user.username));
    if (myIdx >= 0) {
        document.getElementById('myRank').textContent = '#' + (myIdx + 1);
    }

    renderLeaderboard(leaderboard);
}

function renderLeaderboard(leaderboard) {
    const body = document.getElementById('leaderboardBody');
    body.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'lb-grid';

    leaderboard.forEach((entry, idx) => {
        const rank = idx + 1;
        const isRemoved = entry.is_kicked || removedPlayers[entry.display_name];

        const player = document.createElement('div');
        player.className = 'lb-player' + (isRemoved ? ' removed' : '');

        // If freshly removed — schedule fade-out after 30s
        if (isRemoved && !removedPlayers[entry.display_name]) {
            removedPlayers[entry.display_name] = Date.now();
        }
        if (removedPlayers[entry.display_name]) {
            const elapsed = Date.now() - removedPlayers[entry.display_name];
            if (elapsed > 30000) {
                // Already past 30s — don't render at all
                return;
            }
            player.classList.add('exiting');
            // Adjust animation delay based on elapsed time
            const remaining = Math.max(0, 30000 - elapsed);
            player.style.animationDelay = remaining + 'ms';
        }

        // Avatar
        const initial = (entry.display_name || '?')[0].toUpperCase();
        const defaultAvatar = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2250%22 fill=%22%2316161e%22/><text x=%2250%22 y=%2262%22 text-anchor=%22middle%22 fill=%22%236b6b80%22 font-size=%2236%22 font-family=%22Inter,sans-serif%22>${encodeURIComponent(initial)}</text></svg>`;

        let safeAvatarSrc = defaultAvatar;
        if (entry.avatar && (entry.avatar.startsWith('https://') || entry.avatar.startsWith('data:image/'))) {
            safeAvatarSrc = entry.avatar;
        }

        const photoWrap = document.createElement('div');
        photoWrap.className = 'lb-photo-wrap';

        const img = document.createElement('img');
        img.className = 'lb-photo';
        img.src = safeAvatarSrc;
        img.alt = '';

        // Rank badge
        const badge = document.createElement('div');
        let badgeClass = rank <= 3 ? 'b' + rank : 'bn';
        badge.className = 'lb-badge ' + badgeClass;
        badge.textContent = rank;

        // Cross overlay for removed players
        const cross = document.createElement('div');
        cross.className = 'lb-cross';
        cross.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>';

        photoWrap.appendChild(img);
        photoWrap.appendChild(badge);
        photoWrap.appendChild(cross);

        // Name
        const name = document.createElement('div');
        name.className = 'lb-pname';
        name.textContent = entry.display_name || '?';

        player.appendChild(photoWrap);
        player.appendChild(name);
        grid.appendChild(player);
    });

    body.appendChild(grid);
}

// ===== Logs =====
function addLog(message, type) {
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
    logEntries.unshift({ time: timeStr, message, type });
    if (logEntries.length > 50) logEntries.pop();
    renderLogs();
}

async function pollLogs() {
    if (eventEnded || isKicked) return;

    const res = await window.ctfAPI.request(`/logs/${slot.slot_id}`, 'GET', null, token);
    if (res.status === 200 && res.data.logs) {
        res.data.logs.forEach(log => {
            // Dedup by unique key: player+step+time
            const dedupKey = log.player + ':' + log.step + ':' + log.time;
            const exists = logEntries.find(l => l._key === dedupKey);
            if (!exists) {
                const ts = new Date(log.time.replace(' ', 'T'));
                const timeStr = String(ts.getHours()).padStart(2, '0') + ':' + String(ts.getMinutes()).padStart(2, '0') + ':' + String(ts.getSeconds()).padStart(2, '0');
                logEntries.unshift({ time: timeStr, message: log.message, type: 'info', _key: dedupKey });
            }
        });
        if (logEntries.length > 50) logEntries.length = 50;
        renderLogs();
    }
}

function renderLogs() {
    const body = document.getElementById('logsBody');
    body.innerHTML = '';
    logEntries.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        const typeClass = log.type === 'kick' ? 'log-kick' : log.type === 'success' ? 'log-player' : 'log-action';
        div.innerHTML = `<span class="log-time">[${log.time}]</span> <span class="${typeClass}">${escapeHtml(log.message)}</span>`;
        body.appendChild(div);
    });
}

// ===== Advanced Bot Simulation Engine =====
// Time-aware, phase-based, realistic human-like behavior

function simulateBots() {
    if (botProfiles.length === 0 || challenges.length === 0) return;

    // Calculate event duration in ms
    const eventEndTime = slot.ends_at
        ? new Date(slot.ends_at.replace(' ', 'T')).getTime()
        : new Date(slot.starts_at.replace(' ', 'T')).getTime() + (slot.duration_minutes || 60) * 60000;
    const eventStartTime = Date.now();
    const totalDuration = eventEndTime - eventStartTime;

    if (totalDuration <= 0) return;

    // Phase boundaries (% of total event time)
    const PHASE = {
        ANALYSIS_END: 0.12,    // 0-12% — thinking, only wrong attempts
        STEADY_END: 0.50,      // 12-50% — gradual solving
        MAIN_END: 0.80,        // 50-80% — bulk of solves
        FINAL: 1.0,            // 80-100% — last flags, some give up
    };

    // Skill configs: how many flags they solve, wrong attempt ratio, speed multiplier
    const SKILL_CONFIG = {
        fast: { solveRatio: [0.75, 0.95], wrongPerCorrect: [1, 2], minGapMs: 90000, maxGapMs: 240000, startPhase: 0.08 },
        medium: { solveRatio: [0.50, 0.75], wrongPerCorrect: [2, 4], minGapMs: 150000, maxGapMs: 360000, startPhase: 0.15 },
        slow: { solveRatio: [0.25, 0.50], wrongPerCorrect: [3, 5], minGapMs: 240000, maxGapMs: 600000, startPhase: 0.22 },
    };

    // Star bot — realistic "top player" timing:
    // - Solves 85-95% flags (not 100% — even pros miss 1-2)
    // - Starts a bit earlier than fast bots (studying faster)
    // - Gap 2-5 min between flags (human-realistic, but consistently quick)
    // - Makes 1-3 wrong attempts (even good players try wrong things)
    // - Key difference from "fast": slightly higher solve %, slightly earlier start
    const STAR_CONFIG = { solveRatio: [0.85, 0.95], wrongPerCorrect: [1, 3], minGapMs: 120000, maxGapMs: 300000, startPhase: 0.07 };

    // Generate solve schedule for each bot
    botProfiles.forEach(bot => {
        const config = bot.is_star ? STAR_CONFIG : (SKILL_CONFIG[bot.skill_level] || SKILL_CONFIG.medium);
        const bp = botProgress[bot.id];

        // How many flags this bot will solve
        const ratio = config.solveRatio[0] + Math.random() * (config.solveRatio[1] - config.solveRatio[0]);
        const flagsToSolve = Math.max(1, Math.round(challenges.length * ratio));
        bp.targetFlags = flagsToSolve;
        bp.schedule = [];
        bp.wrongSchedule = [];
        bp.joinSchedule = [];

        // Bot join message (staggered in first 30s)
        const joinDelay = 3000 + Math.random() * 25000;
        bp.joinSchedule.push({ time: eventStartTime + joinDelay, type: 'join' });

        // Distribute solve times across phases (not uniform — weighted toward middle)
        const startOffset = totalDuration * config.startPhase;
        const endOffset = totalDuration * (0.85 + Math.random() * 0.10); // Don't solve in last 5-15%
        const solveWindow = endOffset - startOffset;

        for (let i = 0; i < flagsToSolve; i++) {
            // Weighted distribution: more solves in middle phases
            const progress = i / flagsToSolve;
            let timeRatio;

            if (progress < 0.3) {
                // First 30% of flags: slow start (Phase 2 territory)
                timeRatio = progress * 1.2;
            } else if (progress < 0.7) {
                // Middle 40% of flags: steady pace (Phase 3)
                timeRatio = 0.36 + (progress - 0.3) * 1.0;
            } else {
                // Last 30%: slight slowdown (Phase 4 — getting harder)
                timeRatio = 0.76 + (progress - 0.7) * 0.8;
            }

            // Add human-like jitter (±15% variance)
            const jitter = 1 + (Math.random() - 0.5) * 0.30;
            let solveTime = eventStartTime + startOffset + (solveWindow * timeRatio * jitter);

            // Enforce minimum gap between consecutive solves
            if (bp.schedule.length > 0) {
                const lastSolve = bp.schedule[bp.schedule.length - 1].time;
                const gap = config.minGapMs + Math.random() * (config.maxGapMs - config.minGapMs);
                solveTime = Math.max(solveTime, lastSolve + gap);
            }

            // Don't schedule past event end
            if (solveTime >= eventEndTime - 30000) break;

            const challenge = challenges[i];
            bp.schedule.push({
                time: solveTime,
                flagIndex: i,
                challengeId: challenge.id,
                title: challenge.title || 'Step ' + (i + 1),
                points: challenge.points || 10,
                type: 'solve',
            });

            // Wrong attempts BEFORE this solve (1-N wrong attempts, spaced out)
            const wrongCount = config.wrongPerCorrect[0] +
                Math.floor(Math.random() * (config.wrongPerCorrect[1] - config.wrongPerCorrect[0] + 1));

            for (let w = 0; w < wrongCount; w++) {
                // Wrong attempts happen 20s to 3min before the solve
                const wrongOffset = (wrongCount - w) * (20000 + Math.random() * 60000);
                const wrongTime = solveTime - wrongOffset;
                if (wrongTime > eventStartTime + joinDelay + 10000) {
                    bp.wrongSchedule.push({
                        time: wrongTime,
                        flagIndex: i,
                        title: challenge.title || 'Step ' + (i + 1),
                        type: 'wrong',
                    });
                }
            }
        }

        // Random "stuck" period — bot goes quiet for 3-8 min (adds realism)
        if (Math.random() < 0.6) {
            const stuckAt = eventStartTime + totalDuration * (0.3 + Math.random() * 0.4);
            const stuckDuration = 180000 + Math.random() * 300000;
            // Push all events after stuckAt forward by stuckDuration
            bp.schedule.forEach(s => { if (s.time > stuckAt) s.time += stuckDuration; });
            bp.wrongSchedule.forEach(s => { if (s.time > stuckAt) s.time += stuckDuration; });
        }
    });

    // Merge all events from all bots into one timeline
    const allEvents = [];
    botProfiles.forEach(bot => {
        const bp = botProgress[bot.id];

        bp.joinSchedule.forEach(ev => {
            allEvents.push({ ...ev, bot });
        });

        bp.schedule.forEach(ev => {
            allEvents.push({ ...ev, bot });
        });

        bp.wrongSchedule.forEach(ev => {
            allEvents.push({ ...ev, bot });
        });
    });

    // Sort by time
    allEvents.sort((a, b) => a.time - b.time);

    // Schedule each event
    allEvents.forEach(ev => {
        const delay = ev.time - Date.now();
        if (delay < 0) return; // Already passed

        setTimeout(() => {
            if (eventEnded || isKicked) return;
            const bp = botProgress[ev.bot.id];
            if (!bp || bp.kicked) return;

            if (ev.type === 'join') {
                addLog(`${ev.bot.display_name} joined the event`, 'info');
                logBotActivity(ev.bot, 'join', null, 0);

            } else if (ev.type === 'wrong') {
                addLog(`${ev.bot.display_name} submitted an incorrect flag for "${escapeHtml(ev.title)}"`, 'error');
                logBotActivity(ev.bot, 'wrong_attempt', ev.title, 0);

            } else if (ev.type === 'solve') {
                bp.flags_solved++;
                bp.score += ev.points;
                addLog(`${ev.bot.display_name} solved "${escapeHtml(ev.title)}"`, 'info');
                logBotActivity(ev.bot, 'flag_solved', ev.title, ev.points);
            }
        }, delay);
    });

    // Bot kick simulation — very rare, only if enough bots (paid events feel real)
    if (botProfiles.length > 4) {
        const kickTime = totalDuration * (0.4 + Math.random() * 0.4);
        setTimeout(() => {
            if (eventEnded || isKicked) return;
            const active = botProfiles.filter(b => !botProgress[b.id].kicked && !botProgress[b.id].left && !b.is_star);
            if (active.length > 3 && Math.random() < 0.3) {
                const victim = active[Math.floor(Math.random() * active.length)];
                botProgress[victim.id].kicked = true;
                removedPlayers[victim.display_name] = Date.now();
                addLog(`${victim.display_name} has been removed — security violation`, 'kick');
                logBotActivity(victim, 'kicked', 'security_violation', 0);
            }
        }, kickTime);
    }

    // Bot gradual exit near end — some bots "leave" in last 15% of event
    // Not all bots leave — only 20-40% of them (rest stay till end like real players)
    // Star bots NEVER leave — they're the guaranteed winners
    const nonStarBots = botProfiles.filter(b => !b.is_star);
    const exitCount = Math.max(1, Math.floor(nonStarBots.length * (0.2 + Math.random() * 0.2)));
    const exitPool = [...nonStarBots].sort(() => Math.random() - 0.5).slice(0, exitCount);

    exitPool.forEach((bot, i) => {
        // Stagger exits across last 15% of event time (each bot at different time)
        const exitStart = totalDuration * (0.82 + Math.random() * 0.12);
        const exitDelay = exitStart + (i * (30000 + Math.random() * 60000)); // 30-90s apart

        if (exitDelay < totalDuration - 10000) { // Don't exit in last 10s
            setTimeout(() => {
                if (eventEnded || isKicked) return;
                const bp = botProgress[bot.id];
                if (!bp || bp.kicked || bp.left) return;

                bp.left = true;
                removedPlayers[bot.display_name] = Date.now();

                // Random exit reasons (human-like)
                const reasons = [
                    `${bot.display_name} left the event`,
                    `${bot.display_name} disconnected`,
                    `${bot.display_name} has exited`,
                ];
                const reason = reasons[Math.floor(Math.random() * reasons.length)];
                addLog(reason, 'info');
                logBotActivity(bot, 'left', 'voluntary_exit', 0);
            }, exitDelay);
        }
    });
}

// Log bot activity to server (for admin proof/evidence)
function logBotActivity(bot, action, detail, points) {
    if (!sessionId || !token) return;
    // Fire and forget — don't block the UI
    window.ctfAPI.request('/bot-activity', 'POST', {
        session_id: sessionId,
        slot_id: slot.slot_id,
        bot_name: bot.display_name,
        bot_id: bot.id,
        action: action,
        detail: detail || '',
        points: points || 0,
    }, token).catch(() => { });
}

// ===== Fake Notifications (Paid Only) =====
function scheduleFakeNotifications() {
    if (notifications.length === 0) return;

    const maxCount = 3;
    const minInterval = 300000;
    const maxInterval = 1200000;

    function showNext() {
        if (notifShown >= maxCount || eventEnded || isKicked) return;
        const notif = notifications[Math.floor(Math.random() * notifications.length)];
        showFakeNotification(notif);
        notifShown++;
        const delay = minInterval + Math.random() * (maxInterval - minInterval);
        notifTimers.push(setTimeout(showNext, delay));
    }

    const firstDelay = 120000 + Math.random() * 360000;
    notifTimers.push(setTimeout(showNext, firstDelay));
}

function showFakeNotification(notif) {
    const el = document.getElementById('fakeNotif');
    const iconEl = document.getElementById('notifIcon');
    const appEl = document.getElementById('notifApp');
    const msgEl = document.getElementById('notifMsg');

    const iconMap = {
        'Instagram': 'IG',
        'Facebook': 'FB',
        'WhatsApp': 'WA',
        'Telegram': 'TG',
        'Unknown': '??',
        'Twitter': 'X',
        'Signal': 'SG',
    };

    iconEl.className = 'notif-icon ' + (notif.app_name || 'unknown').toLowerCase();
    iconEl.textContent = iconMap[notif.app_name] || '??';
    appEl.textContent = notif.app_name || 'Unknown';
    msgEl.textContent = notif.message;
    const notifTimeEl = document.getElementById('notifTime');
    if (notifTimeEl) notifTimeEl.textContent = 'just now';

    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 5000 + Math.random() * 3000);
}

// ===== Security Layer =====

function handleFocusLoss() {
    if (isKicked || eventEnded) return;
    focusLossCount++;
    // Only log locally — main process handles the server-side violation report
    addLog('Window focus lost — Alt+Tab detected', 'warn');
}

function handleFocusReturn() {
    lastActivityTime = Date.now();
}

// ===== Mic Monitoring (Volume Only — No Recording) =====
async function startMicMonitoring() {
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(micStream);
        micAnalyser = audioCtx.createAnalyser();
        micAnalyser.fftSize = 256;
        source.connect(micAnalyser);
        // NOT connected to destination — audio is analyzed but never recorded or sent

        const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);
        let lastLoudWarning = 0;

        function checkMicLevel() {
            if (isKicked || eventEnded) return;
            micAnalyser.getByteFrequencyData(dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avgVolume = sum / dataArray.length;

            // Threshold: 80+ = talking/loud noise (normal ambient ~5-20)
            if (avgVolume > 80) {
                const now = Date.now();
                // Rate-limit: max 1 warning per 30 seconds
                if (now - lastLoudWarning > 30000) {
                    lastLoudWarning = now;
                    micLoudCount++;
                    addLog('Loud audio detected — potential voice communication', 'warn');
                    if (micLoudCount >= 3) {
                        reportWarning('repeated_loud_audio_x' + micLoudCount);
                    }
                }
            }

            setTimeout(checkMicLevel, 500); // Check every 500ms
        }
        checkMicLevel();
        addLog('Mic monitoring active', 'info');

    } catch (e) {
        // Mic denied or not available — log but don't block
        addLog('Mic access denied — monitoring disabled', 'warn');
    }
}

// ===== Camera Monitoring (REAL Face Detection + Auto-Recovery + Snapshots) =====
let cameraStream = null;
let faceCheckInterval = null;
let faceAbsentCount = 0;
let lastFaceWarningTime = 0;
let faceDetector = null;
let cameraRecoveryTimer = null;
let cameraState = 'off'; // 'off' | 'active' | 'lost' | 'recovering'
let snapshotCanvas = null;
let snapshotCtx = null;
let lastSnapshotTime = 0;

// Capture a snapshot from camera and store as base64
function captureSnapshot(videoEl, reason) {
    if (!snapshotCanvas) {
        snapshotCanvas = document.createElement('canvas');
        snapshotCanvas.width = 320;
        snapshotCanvas.height = 240;
        snapshotCtx = snapshotCanvas.getContext('2d');
    }
    try {
        snapshotCtx.drawImage(videoEl, 0, 0, 320, 240);
        // Draw timestamp + reason watermark
        snapshotCtx.fillStyle = 'rgba(0,0,0,0.6)';
        snapshotCtx.fillRect(0, 220, 320, 20);
        snapshotCtx.fillStyle = '#ff0';
        snapshotCtx.font = '10px monospace';
        snapshotCtx.fillText(new Date().toISOString() + ' | ' + reason, 4, 234);
        const dataUrl = snapshotCanvas.toDataURL('image/jpeg', 0.7);
        addLog('Snapshot captured: ' + reason, 'info');
        return dataUrl;
    } catch (e) {
        return null;
    }
}

// Send snapshot to server via API
async function uploadSnapshot(dataUrl, reason) {
    if (!dataUrl || !sessionId) return;
    const now = Date.now();
    // Rate limit: max 1 snapshot per 20 seconds
    if (now - lastSnapshotTime < 20000) return;
    lastSnapshotTime = now;

    try {
        await window.ctfAPI.request('/snapshot', 'POST', {
            session_id: sessionId,
            reason: reason,
            image: dataUrl,
            timestamp: new Date().toISOString()
        }, token);
    } catch (e) {
        // Snapshot upload failed — not critical, don't block
    }
}

async function startCameraMonitoring() {
    const videoEl = document.getElementById('cameraFeed');
    const statusEl = document.getElementById('cameraStatus');
    const canvasEl = document.getElementById('cameraCanvas');

    if (!videoEl || !canvasEl) return;

    // Initialize FaceDetector once
    if (!faceDetector && typeof FaceDetector !== 'undefined') {
        faceDetector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        addLog('FaceDetector API loaded — real face detection active', 'info');
    } else if (!faceDetector) {
        addLog('FaceDetector not available — using fallback detection', 'warn');
    }

    // Acquire camera stream
    await acquireCamera(videoEl, statusEl, canvasEl);
}

async function acquireCamera(videoEl, statusEl, canvasEl) {
    // Stop any existing stream first
    stopCameraStream();

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' },
            audio: false
        });
        videoEl.srcObject = cameraStream;
        cameraState = 'active';
        faceAbsentCount = 0; // Reset on new stream
        addLog('Camera stream acquired', 'info');

        // Clear any recovery timer
        if (cameraRecoveryTimer) {
            clearInterval(cameraRecoveryTimer);
            cameraRecoveryTimer = null;
        }

        // Watch for track loss
        const videoTrack = cameraStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.addEventListener('ended', () => handleCameraLost(videoEl, statusEl, canvasEl));
            videoTrack.addEventListener('mute', () => handleCameraLost(videoEl, statusEl, canvasEl));
            videoTrack.addEventListener('unmute', () => {
                if (cameraState === 'lost' || cameraState === 'recovering') {
                    addLog('Camera track unmuted — resuming', 'info');
                    cameraState = 'active';
                    faceAbsentCount = 0;
                    statusEl.textContent = '● MONITORING';
                    statusEl.style.color = '#0f0';
                }
            });
        }

        // Start face detection loop (clear old one first)
        if (faceCheckInterval) clearInterval(faceCheckInterval);
        startFaceDetectionLoop(videoEl, statusEl, canvasEl);

    } catch (e) {
        addLog('Camera acquire failed: ' + e.name, 'error');

        if (cameraState === 'recovering') {
            // Still recovering — don't spam errors, just update status
            statusEl.textContent = '⟳ RECONNECTING...';
            statusEl.style.color = '#f59e0b';
        } else if (cameraState === 'off') {
            // First-time failure — critical
            cameraState = 'lost';
            showErrorToUser('CRITICAL: Camera access denied! You will be removed in 30 seconds.', 'kick');
            statusEl.textContent = '✕ NO CAMERA';
            statusEl.style.color = '#ef4444';
            setTimeout(() => {
                if (!cameraStream && !isKicked && !eventEnded) {
                    showErrorToUser('REMOVED: Camera was not enabled.', 'kick');
                    reportWarning('camera_denied_persistent');
                    reportWarning('camera_denied_persistent');
                    reportWarning('camera_denied_persistent');
                }
            }, 30000);
        }
    }
}

function handleCameraLost(videoEl, statusEl, canvasEl) {
    if (cameraState === 'lost' || cameraState === 'recovering') return; // Already handling
    if (isKicked || eventEnded) return;

    cameraState = 'lost';
    addLog('Camera lost — starting recovery', 'warn');
    showErrorToUser('Camera disconnected! Reconnecting...', 'camera');
    statusEl.textContent = '⟳ RECONNECTING...';
    statusEl.style.color = '#f59e0b';
    // Grace period: do NOT issue warning immediately — give recovery a chance

    // Stop face detection during recovery
    if (faceCheckInterval) {
        clearInterval(faceCheckInterval);
        faceCheckInterval = null;
    }

    // Try to re-acquire every 5 seconds
    let recoveryAttempts = 0;
    cameraState = 'recovering';

    cameraRecoveryTimer = setInterval(async () => {
        if (isKicked || eventEnded) {
            clearInterval(cameraRecoveryTimer);
            cameraRecoveryTimer = null;
            return;
        }

        recoveryAttempts++;
        addLog('Camera recovery attempt #' + recoveryAttempts, 'info');
        statusEl.textContent = '⟳ RECONNECTING (' + recoveryAttempts + ')...';

        try {
            // Stop old dead stream
            stopCameraStream();

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: 'user' },
                audio: false
            });

            // SUCCESS — camera is back
            clearInterval(cameraRecoveryTimer);
            cameraRecoveryTimer = null;
            cameraStream = newStream;
            videoEl.srcObject = newStream;
            cameraState = 'active';
            faceAbsentCount = 0;

            addLog('Camera recovered!', 'info');
            showErrorToUser('Camera reconnected — monitoring resumed', 'warn');
            statusEl.textContent = '● MONITORING';
            statusEl.style.color = '#0f0';

            // Re-attach track listeners
            const newTrack = newStream.getVideoTracks()[0];
            if (newTrack) {
                newTrack.addEventListener('ended', () => handleCameraLost(videoEl, statusEl, canvasEl));
                newTrack.addEventListener('mute', () => handleCameraLost(videoEl, statusEl, canvasEl));
                newTrack.addEventListener('unmute', () => {
                    if (cameraState === 'lost' || cameraState === 'recovering') {
                        addLog('Camera track unmuted — resuming', 'info');
                        cameraState = 'active';
                        faceAbsentCount = 0;
                        statusEl.textContent = '● MONITORING';
                        statusEl.style.color = '#0f0';
                    }
                });
            }

            // Restart face detection
            startFaceDetectionLoop(videoEl, statusEl, canvasEl);

        } catch (e) {
            // Still failing — keep trying
            if (recoveryAttempts >= 6) {
                // 30 seconds failed — issue warning
                reportWarning('camera_disconnected');
            }
            if (recoveryAttempts >= 12) {
                // 60 seconds of trying — give up and warn
                clearInterval(cameraRecoveryTimer);
                cameraRecoveryTimer = null;
                statusEl.textContent = '✕ CAMERA LOST';
                statusEl.style.color = '#ef4444';
                showErrorToUser('Camera could not be recovered — violation recorded!', 'error');
                reportWarning('camera_recovery_failed');
                addLog('Camera recovery failed after ' + recoveryAttempts + ' attempts', 'error');
            }
        }
    }, 5000);
}

function stopCameraStream() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => {
            try { t.stop(); } catch (e) { }
        });
        cameraStream = null;
    }
}

function startFaceDetectionLoop(videoEl, statusEl, canvasEl) {
    const ctx = canvasEl.getContext('2d');
    canvasEl.width = 320;
    canvasEl.height = 240;

    faceCheckInterval = setInterval(async () => {
        if (isKicked || eventEnded || cameraState !== 'active') return;

        // Check if video track is still live
        const track = cameraStream ? cameraStream.getVideoTracks()[0] : null;
        if (!track || track.readyState === 'ended') {
            if (cameraState === 'active') {
                handleCameraLost(videoEl, statusEl, canvasEl);
            }
            return;
        }

        ctx.drawImage(videoEl, 0, 0, 320, 240);
        let faceFound = false;

        // Real face detection via FaceDetector API
        if (faceDetector) {
            try {
                const faces = await faceDetector.detect(canvasEl);
                faceFound = faces.length > 0;
            } catch (e) { /* ignore */ }
        } else {
            // Fallback: brightness + skin-tone
            const imgData = ctx.getImageData(60, 30, 200, 180);
            let brightness = 0, skinPixels = 0;
            for (let i = 0; i < imgData.data.length; i += 16) {
                const r = imgData.data[i], g = imgData.data[i + 1], b = imgData.data[i + 2];
                brightness += r + g + b;
                if (r > 95 && g > 40 && b > 20 && r > g && r > b &&
                    Math.abs(r - g) > 15 && r - b > 15) skinPixels++;
            }
            brightness = brightness / (imgData.data.length / 16 * 3);
            const skinRatio = skinPixels / (imgData.data.length / 16);
            faceFound = brightness > 15 && skinRatio > 0.1;
        }

        if (faceFound) {
            // Face present — clear absent count gradually
            if (faceAbsentCount > 0) faceAbsentCount = Math.max(0, faceAbsentCount - 2);
            statusEl.textContent = '● FACE DETECTED';
            statusEl.style.color = '#0f0';
        } else {
            faceAbsentCount++;
            if (faceAbsentCount <= 2) {
                statusEl.textContent = '⚠ SCANNING...';
                statusEl.style.color = '#f59e0b';
            } else {
                statusEl.textContent = '⚠ NO FACE (' + faceAbsentCount + ')';
                statusEl.style.color = '#ef4444';
                showErrorToUser('Face not detected! Look at camera. (' + faceAbsentCount + ')', 'camera');

                // Capture snapshot at 3 consecutive misses (evidence)
                if (faceAbsentCount === 3) {
                    const snap = captureSnapshot(videoEl, 'no_face_' + faceAbsentCount);
                    uploadSnapshot(snap, 'face_absent');
                }
            }
        }

        // 4 consecutive misses (20 seconds) → formal warning + snapshot
        const now = Date.now();
        if (faceAbsentCount >= 4 && now - lastFaceWarningTime > 30000) {
            lastFaceWarningTime = now;
            // Capture snapshot before resetting count
            const snap = captureSnapshot(videoEl, 'warning_no_face');
            uploadSnapshot(snap, 'face_warning_issued');
            faceAbsentCount = 0;
            showErrorToUser('WARNING: Face not detected — violation recorded!', 'error');
            reportWarning('camera_no_face');
            addLog('Face not detected at camera — warning issued', 'error');
        }
    }, 5000);
}

function handleKeyBlock(e) {
    if (isKicked || eventEnded) return;

    const blocked = [
        e.key === 'F12',
        e.key === 'F5',
        e.key === 'F11',
        e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key),
        e.ctrlKey && e.key === 'u',
        e.ctrlKey && e.key === 'p',
        e.ctrlKey && e.key === 's',
        e.ctrlKey && e.key === 'r',
        e.ctrlKey && e.key === 'l',
        e.key === 'PrintScreen',
        e.altKey && e.key === 'Tab',
        e.altKey && e.key === 'F4',
        e.key === 'Meta' || e.key === 'OS',
    ];

    if (blocked.some(Boolean)) {
        e.preventDefault();
        e.stopPropagation();
        reportWarning('blocked_key:' + e.key);
    }
}

// ===== Internet Connectivity Monitor =====
function startInternetMonitor() {
    // Listen for browser online/offline events
    window.addEventListener('offline', handleInternetLost);
    window.addEventListener('online', handleInternetReturn);

    // Active polling fallback — browser events can be unreliable
    internetCheckInterval = setInterval(checkInternetHealth, 10000);
}

async function checkInternetHealth() {
    if (isKicked || eventEnded) return;

    if (!navigator.onLine) {
        if (!internetOffline) handleInternetLost();
        return;
    }

    // Actual server ping — navigator.onLine can lie (connected to router but no WAN)
    try {
        const res = await window.ctfAPI.request('/heartbeat', 'POST', {
            session_id: sessionId,
        }, token);
        // Server responded — we're truly online
        if (internetOffline) {
            handleInternetReturn();
        }
    } catch (e) {
        // Fetch failed — actually offline even if navigator says online
        if (!internetOffline) handleInternetLost();
    }
}

function handleInternetLost() {
    if (isKicked || eventEnded || internetOffline) return;

    internetOffline = true;
    internetOfflineAt = Date.now();
    internetWarnings++;

    addLog('Internet disconnected — Warning ' + internetWarnings + '/3', 'error');
    showErrorToUser('Internet Lost — Warning ' + internetWarnings + '/3. Reconnect now!', 'error');

    // Show internet overlay
    showInternetOverlay(internetWarnings);

    if (internetWarnings >= 3) {
        // 3 disconnects = kicked
        showErrorToUser('3 INTERNET DISCONNECTS — YOU ARE BEING REMOVED', 'kick');
        showKickScreen();
        // Report to server when connection resumes (fire and forget)
        try {
            window.ctfAPI.request('/warning', 'POST', {
                session_id: sessionId,
                reason: 'internet_disconnect_3x',
            }, token);
        } catch (e) { }
    }
}

async function handleInternetReturn() {
    if (!internetOffline || isKicked || eventEnded) return;

    const offlineDuration = Date.now() - internetOfflineAt;
    internetOffline = false;

    addLog('Internet reconnected after ' + Math.round(offlineDuration / 1000) + 's', 'info');

    // Hide internet overlay
    hideInternetOverlay();

    // CRITICAL: Re-validate session with server — don't just resume silently
    try {
        const res = await window.ctfAPI.request('/slot/status/' + slot.slot_id, 'GET', null, token);
        if (res.status === 200) {
            const me = res.data.players ? res.data.players.find(p => p.user_id === user.id) : null;
            if (!me) {
                // Session no longer exists on server
                eventEnded = true;
                document.getElementById('kickOverlay').querySelector('h2').textContent = 'Session Ended';
                document.getElementById('kickOverlay').querySelector('p').textContent = 'Your session was terminated while offline.';
                document.getElementById('kickOverlay').classList.add('show');
                return;
            }
            if (me.is_kicked) {
                isKicked = true;
                document.getElementById('kickOverlay').classList.add('show');
                return;
            }
            // Sync warning count from server
            if (typeof me.warnings === 'number') warnings = me.warnings;
        } else if (res.status === 404 || res.status === 403) {
            eventEnded = true;
            document.getElementById('kickOverlay').querySelector('h2').textContent = 'Session Ended';
            document.getElementById('kickOverlay').querySelector('p').textContent = 'Event slot is no longer available.';
            document.getElementById('kickOverlay').classList.add('show');
            return;
        }
    } catch (e) {
        // Still can't reach server — will retry on next interval
        return;
    }

    // Report the disconnect to server as a warning
    try {
        await window.ctfAPI.request('/warning', 'POST', {
            session_id: sessionId,
            reason: 'internet_disconnect_' + Math.round(offlineDuration / 1000) + 's',
        }, token);
    } catch (e) { }

    showErrorToUser('Internet restored — session re-validated', 'warn');
}

function showInternetOverlay(count) {
    let overlay = document.getElementById('internetOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'internetOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99998;color:#fff;font-family:Inter,sans-serif;';
        overlay.innerHTML = '<div style="text-align:center;"><h2 id="internetTitle" style="font-size:22px;color:#ef4444;margin-bottom:10px;">Internet Disconnected</h2><p id="internetMsg" style="font-size:14px;color:#999;margin-bottom:8px;">Reconnect your internet to continue</p><p id="internetWarnCount" style="font-size:18px;color:#f59e0b;"></p></div>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    const warnEl = document.getElementById('internetWarnCount');
    if (warnEl) warnEl.textContent = 'Warning ' + count + ' / 3';
    if (count >= 3) {
        const titleEl = document.getElementById('internetTitle');
        if (titleEl) titleEl.textContent = 'Connection Lost — Session Terminated';
    }
}

function hideInternetOverlay() {
    const overlay = document.getElementById('internetOverlay');
    if (overlay) overlay.style.display = 'none';
}

async function reportWarning(reason) {
    if (!sessionId || isKicked) return;

    warnings++;

    // Show visible error to user
    showErrorToUser(`Security Warning ${warnings}/3: ${reason.replace(/_/g, ' ')}`, 'error');

    // 3 warnings = INSTANT KICK (no mercy)
    if (warnings >= 3) {
        showErrorToUser('3 WARNINGS REACHED — YOU ARE BEING REMOVED', 'kick');
        showKickScreen();
        // Still report to server
        window.ctfAPI.request('/warning', 'POST', {
            session_id: sessionId,
            reason: reason,
        }, token);
        window.ctfAPI.reportViolation(reason);
        return;
    }

    // Report to server
    const res = await window.ctfAPI.request('/warning', 'POST', {
        session_id: sessionId,
        reason: reason,
    }, token);

    // Also report via main process (logs to server independently)
    window.ctfAPI.reportViolation(reason);

    if (res.status === 200) {
        // Sync warning count from server (authoritative)
        if (typeof res.data.warnings === 'number') {
            warnings = res.data.warnings;
        }
        if (res.data.kicked) {
            showKickScreen();
        } else {
            showWarningScreen(res.data.warnings || warnings);
        }
    } else {
        showWarningScreen(warnings);
    }
}

function showWarningScreen(count) {
    document.getElementById('warningCount').textContent = count + '/3';
    document.getElementById('warningOverlay').classList.add('show');
    document.getElementById('myWarnings').textContent = count + '/3';
}

function dismissWarning() {
    document.getElementById('warningOverlay').classList.remove('show');
}

function showKickScreen() {
    isKicked = true;
    document.getElementById('kickOverlay').classList.add('show');
    addLog('You have been removed \u2014 security violation', 'kick');
}

async function exitAfterKick() {
    if (isKioskMode) await window.ctfAPI.disableKiosk();
    await window.ctfAPI.clearSession();
    sessionStorage.clear();
    window.ctfAPI.exitApp();
}

// ===== Event End =====
async function endEvent() {
    if (eventEnded) return;
    eventEnded = true;

    // Stop camera monitoring fully
    if (faceCheckInterval) { clearInterval(faceCheckInterval); faceCheckInterval = null; }
    if (cameraRecoveryTimer) { clearInterval(cameraRecoveryTimer); cameraRecoveryTimer = null; }
    cameraState = 'off';
    stopCameraStream();
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }

    const res = await window.ctfAPI.request('/event-complete', 'POST', {
        session_id: sessionId,
    }, token);

    document.getElementById('resultFlags').textContent = myFlagCount + '/' + challenges.length;
    document.getElementById('resultRank').textContent = document.getElementById('myRank').textContent || '#--';

    if (res.status === 200 && res.data.reward_code) {
        const codeEl = document.getElementById('resultCode');
        codeEl.textContent = 'Reward: ' + res.data.reward_code;
        codeEl.style.display = 'block';
    }

    // Build final leaderboard for result screen
    buildResultLeaderboard();

    document.getElementById('resultOverlay').classList.add('show');
}

function buildResultLeaderboard() {
    // Collect all players + bots (sorted by flags solved)
    let finalBoard = [];

    // Real players from last known leaderboard (if polled)
    // For simplicity, use current myScore/myFlags as the real player entry
    finalBoard.push({
        name: user.display_name || user.username,
        avatar: user.avatar || '',
        flags: myFlagCount,
        isMe: true,
        removed: false,
    });

    // Bots (active + removed)
    botProfiles.forEach(bot => {
        const bp = botProgress[bot.id];
        if (!bp) return;
        finalBoard.push({
            name: bot.display_name,
            avatar: bot.avatar || '',
            flags: bp.flags_solved || 0,
            isMe: false,
            removed: bp.kicked || bp.left || false,
        });
    });

    // Sort by flags solved (descending)
    finalBoard.sort((a, b) => b.flags - a.flags);

    // Render circle grid
    const container = document.getElementById('resultLeaderboard');
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:8px;';

    finalBoard.forEach((p, i) => {
        const rank = i + 1;
        const el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:58px;' + (p.removed ? 'opacity:0.3;' : '');

        const initial = (p.name || '?')[0].toUpperCase();
        const defaultAv = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2250%22 fill=%22%2316161e%22/><text x=%2250%22 y=%2262%22 text-anchor=%22middle%22 fill=%22%236b6b80%22 font-size=%2236%22 font-family=%22Inter,sans-serif%22>${encodeURIComponent(initial)}</text></svg>`;
        let avSrc = defaultAv;
        if (p.avatar && (p.avatar.startsWith('https://') || p.avatar.startsWith('data:image/'))) {
            avSrc = p.avatar;
        }

        // Photo wrap with rank badge
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;width:42px;height:42px;';

        const img = document.createElement('img');
        img.src = avSrc;
        img.style.cssText = 'width:42px;height:42px;border-radius:50%;border:2px solid ' +
            (p.isMe ? '#00c853' : rank === 1 ? '#facc15' : rank <= 3 ? '#94a3b8' : '#2a2a3a') +
            ';object-fit:cover;' + (p.removed ? 'filter:grayscale(1);' : '');

        const badge = document.createElement('div');
        badge.style.cssText = 'position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;border:1.5px solid #0a0a0f;' +
            (rank === 1 ? 'background:#a16207;color:#fef3c7;' : rank === 2 ? 'background:#52525b;color:#e4e4e7;' : rank === 3 ? 'background:#78350f;color:#fde68a;' : 'background:#1a1a24;color:#666;');
        badge.textContent = rank;

        wrap.appendChild(img);
        wrap.appendChild(badge);

        // Cross for removed
        if (p.removed) {
            const cross = document.createElement('div');
            cross.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;';
            cross.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" style="width:28px;height:28px;"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>';
            wrap.appendChild(cross);
        }

        // Name
        const nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:9px;color:' + (p.isMe ? '#00c853' : '#888') + ';margin-top:3px;max-width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;' + (p.removed ? 'text-decoration:line-through;' : '');
        nameEl.textContent = p.isMe ? 'You' : p.name;

        // Flags count
        const flagsEl = document.createElement('div');
        flagsEl.style.cssText = 'font-size:8px;color:#555;font-family:monospace;';
        flagsEl.textContent = p.flags + '/' + challenges.length;

        el.appendChild(wrap);
        el.appendChild(nameEl);
        el.appendChild(flagsEl);
        grid.appendChild(el);
    });

    container.appendChild(grid);
}

async function exitEvent() {
    if (isKioskMode) await window.ctfAPI.disableKiosk();
    await window.ctfAPI.clearSession();
    sessionStorage.clear();
    window.ctfAPI.exitApp();
}

// ===== User Exit (voluntary leave) =====
function showUserExit() {
    document.getElementById('userExitOverlay').style.display = 'flex';
}

function cancelUserExit() {
    document.getElementById('userExitOverlay').style.display = 'none';
}

async function confirmUserExit() {
    // Complete event (saves progress)
    if (!eventEnded) {
        eventEnded = true;
        await window.ctfAPI.request('/event-complete', 'POST', {
            session_id: sessionId,
        }, token);
    }
    if (isKioskMode) await window.ctfAPI.disableKiosk();
    await window.ctfAPI.clearSession();
    sessionStorage.clear();
    window.ctfAPI.exitApp();
}

// ===== Admin Exit (password verified in main process, never in renderer) =====
async function confirmExit() {
    const pw = document.getElementById('exitPassword').value;
    const valid = await window.ctfAPI.verifyAdminPassword(pw);
    if (valid) {
        exitEvent();
    } else {
        document.getElementById('exitPassword').style.borderColor = 'var(--red)';
        setTimeout(() => document.getElementById('exitPassword').style.borderColor = '', 2000);
    }
}

function cancelExit() {
    document.getElementById('exitOverlay').classList.remove('show');
    document.getElementById('exitPassword').value = '';
}

// ===== Browser =====
function navigateBrowser() {
    const url = document.getElementById('browserUrl').value.trim();
    if (!url) return;
    const frame = document.getElementById('browserFrame');
    if (frame) {
        let finalUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            finalUrl = 'https://' + url;
        }
        // Upgrade HTTP to HTTPS for security (prevents MITM on CTF challenges)
        if (finalUrl.startsWith('http://')) {
            finalUrl = finalUrl.replace('http://', 'https://');
        }
        frame.src = finalUrl;
    }
}

// ===== Utility =====
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Anti-DevTools Detection (renderer side, kiosk only) =====
if (isKioskMode) {
    (function antiDevTools() {
        const threshold = 160;
        function check() {
            if (window.outerWidth - window.innerWidth > threshold ||
                window.outerHeight - window.innerHeight > threshold) {
                if (!isKicked && !eventEnded && sessionId) {
                    reportWarning('devtools_size_anomaly');
                }
            }
        }
        setInterval(check, 10000);

        const el = new Image();
        Object.defineProperty(el, 'id', {
            get: function () {
                if (!isKicked && !eventEnded && sessionId) {
                    reportWarning('devtools_console_open');
                }
            }
        });
        setInterval(() => { console.log('%c', el); }, 15000);
    })();
}
