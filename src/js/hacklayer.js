// ==================== HACKLAYER MODE CONTROLLER ====================
// Full PC access, boat animation wallpaper, right sidebar + panels
// NO kiosk, NO security blocking, NO Alt+Tab warnings

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());

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
let botProfiles = [];
let botProgress = {};
let notifications = [];
let notifShown = 0;
let notifTimers = [];
let logEntries = [];
let activePanel = null;

let displayMode = 'multi';
let eventDescription = '';

// ===== Init =====
(async function init() {
    // Watermark
    const wmText = `${user.username}  ${user.id}  `;
    document.getElementById('watermark').textContent = wmText.repeat(6);

    // User info in sidebar
    document.getElementById('hlUsername').textContent = user.display_name || user.username;
    if (user.avatar) document.getElementById('hlAvatar').src = user.avatar;

    // Get session ID
    const slotRes = await window.ctfAPI.request(`/slot/status/${slot.slot_id}`, 'GET', null, token);
    if (slotRes.status === 200) {
        const me = slotRes.data.players.find(p => p.user_id === user.id);
        if (me) sessionId = me.session_id;
    }

    if (sessionId) {
        await window.ctfAPI.setSession(sessionId, token);
    }

    // Load challenges
    const chRes = await window.ctfAPI.request(`/challenges/${event.event_id}`, 'GET', null, token);
    if (chRes.status === 200) {
        challenges = chRes.data.challenges || [];
        displayMode = chRes.data.display_mode || 'multi';
        eventDescription = chRes.data.event_description || '';
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

    // Start timer
    startEventTimer();

    // Startup logs
    addLog('HackLayer environment initialized', 'success');
    addLog(`Event: ${event.event_title || 'Unknown'}`, 'info');
    addLog(`Player: ${user.display_name || user.username} connected`, 'info');
    if (challenges.length > 0) {
        addLog(`${challenges.length} challenges loaded`, 'info');
    }

    // Start bot simulation
    simulateBots();

    // Polling
    setInterval(pollLeaderboard, 10000);
    setInterval(pollLogs, 8000);

    // Open leaderboard by default
    togglePanel('leaderboard');

    // Mic monitoring
    startMicMonitoring();
})();

// ===== Event Timer =====
function startEventTimer() {
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

        requestAnimationFrame(tick);
    }
    tick();
}

// ===== Panel Toggle =====
function togglePanel(name) {
    const panelId = 'panel' + name.charAt(0).toUpperCase() + name.slice(1);
    const btnId = 'btn' + name.charAt(0).toUpperCase() + name.slice(1);
    const panel = document.getElementById(panelId);
    const btn = document.getElementById(btnId);

    // Close all panels first
    document.querySelectorAll('.hl-panel').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.hl-btn').forEach(b => b.classList.remove('active'));

    if (activePanel === name) {
        activePanel = null;
        return;
    }

    panel.classList.add('open');
    if (btn) btn.classList.add('active');
    activePanel = name;
}

function closePanel() {
    document.querySelectorAll('.hl-panel').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.hl-btn').forEach(b => b.classList.remove('active'));
    activePanel = null;
}

// ===== Render Flags =====
function renderFlags() {
    const body = document.getElementById('flagsBody');
    body.innerHTML = '';

    challenges.forEach(ch => {
        const solved = solvedFlags[ch.id];
        const div = document.createElement('div');
        div.className = 'flag-step' + (solved ? ' solved' : '');

        const header = document.createElement('div');
        header.className = 'flag-header';

        const title = document.createElement('div');
        title.className = 'flag-title';
        title.textContent = ch.step_number + '. ' + (ch.title || 'Flag ' + ch.step_number);

        const points = document.createElement('div');
        points.className = 'flag-points';
        points.textContent = ch.points + 'pts';

        header.appendChild(title);
        header.appendChild(points);
        div.appendChild(header);

        if (ch.description) {
            const desc = document.createElement('div');
            desc.className = 'flag-desc';
            desc.textContent = ch.description;
            div.appendChild(desc);
        }

        if (solved) {
            const badge = document.createElement('div');
            badge.className = 'flag-solved-badge';
            badge.textContent = '✓ Solved';
            div.appendChild(badge);
        } else {
            const row = document.createElement('div');
            row.className = 'flag-row';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'flag-input';
            input.id = 'flag_' + ch.id;
            input.placeholder = 'Enter flag...';
            input.autocomplete = 'off';
            input.spellcheck = false;
            input.addEventListener('keydown', e => { if (e.key === 'Enter') submitFlag(ch.id); });
            const btn = document.createElement('button');
            btn.className = 'flag-submit';
            btn.textContent = 'Submit';
            btn.onclick = () => submitFlag(ch.id);
            row.appendChild(input);
            row.appendChild(btn);
            div.appendChild(row);
        }

        body.appendChild(div);
    });

    document.getElementById('myFlags').textContent = myFlagCount + '/' + challenges.length;
}

// ===== Submit Flag =====
async function submitFlag(challengeId) {
    if (!sessionId || isKicked || eventEnded) return;

    const input = document.getElementById('flag_' + challengeId);
    const answer = input.value.trim();
    if (!answer) return;

    const now = Date.now();
    if (submitFlag._lastTime && now - submitFlag._lastTime < 2000) return;
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

function updateScoreDisplay() {
    document.getElementById('myScore').textContent = myScore;
    document.getElementById('myFlags').textContent = myFlagCount + '/' + challenges.length;
}

// ===== Leaderboard =====
async function pollLeaderboard() {
    if (eventEnded || isKicked) return;

    const res = await window.ctfAPI.request(`/leaderboard/${slot.slot_id}`, 'GET', null, token);
    if (res.status !== 200) return;

    let leaderboard = res.data.leaderboard || [];

    botProfiles.forEach(bot => {
        const bp = botProgress[bot.id];
        if (bp) {
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

    if (event.event_type === 'paid') {
        const botEntries = leaderboard.filter(e => e.is_bot && !e.is_kicked).sort((a, b) => b.score - a.score);
        const humanEntries = leaderboard.filter(e => !e.is_bot).sort((a, b) => b.score - a.score);
        const kickedBots = leaderboard.filter(e => e.is_bot && e.is_kicked);
        leaderboard = [...botEntries.slice(0, 3), ...humanEntries, ...botEntries.slice(3), ...kickedBots];
    } else {
        leaderboard.sort((a, b) => b.score - a.score);
    }

    const myIdx = leaderboard.findIndex(e => !e.is_bot && e.display_name === (user.display_name || user.username));
    if (myIdx >= 0) {
        document.getElementById('myRank').textContent = '#' + (myIdx + 1);
    }

    renderLeaderboard(leaderboard);
}

function renderLeaderboard(leaderboard) {
    const body = document.getElementById('leaderboardBody');
    body.innerHTML = '';

    leaderboard.forEach((entry, idx) => {
        const rank = idx + 1;
        const div = document.createElement('div');
        div.className = 'lb-entry' + (entry.is_kicked ? ' kicked' : '');

        let rankClass = '';
        if (rank === 1) rankClass = 'top1';
        else if (rank === 2) rankClass = 'top2';
        else if (rank === 3) rankClass = 'top3';

        const initial = (entry.display_name || '?')[0].toUpperCase();
        const defaultAvatar = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2250%22 fill=%22%2316161e%22/><text x=%2250%22 y=%2262%22 text-anchor=%22middle%22 fill=%22%236b6b80%22 font-size=%2236%22 font-family=%22Inter,sans-serif%22>${encodeURIComponent(initial)}</text></svg>`;

        let safeAvatarSrc = defaultAvatar;
        if (entry.avatar && (entry.avatar.startsWith('https://') || entry.avatar.startsWith('data:image/'))) {
            safeAvatarSrc = entry.avatar;
        }

        const rankDiv = document.createElement('div');
        rankDiv.className = 'lb-rank ' + rankClass;
        rankDiv.textContent = rank;

        const avatarImg = document.createElement('img');
        avatarImg.className = 'lb-avatar';
        avatarImg.src = safeAvatarSrc;
        avatarImg.alt = '';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'lb-name';
        nameDiv.textContent = (entry.display_name || '') + (entry.is_kicked ? ' [removed]' : '');

        const scoreWrapper = document.createElement('div');
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'lb-score';
        scoreDiv.textContent = entry.score;
        const flagsDiv = document.createElement('div');
        flagsDiv.className = 'lb-flags';
        flagsDiv.textContent = entry.flags_solved + ' flags';
        scoreWrapper.appendChild(scoreDiv);
        scoreWrapper.appendChild(flagsDiv);

        div.appendChild(rankDiv);
        div.appendChild(avatarImg);
        div.appendChild(nameDiv);
        div.appendChild(scoreWrapper);
        body.appendChild(div);
    });
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

// ===== Bot Simulation =====
function simulateBots() {
    if (botProfiles.length === 0) return;

    botProfiles.forEach((bot, i) => {
        setTimeout(() => {
            addLog(`${bot.display_name} joined the event`, 'info');
        }, 2000 + i * 1500 + Math.random() * 1000);
    });

    function botTick() {
        if (eventEnded || isKicked) return;

        botProfiles.forEach(bot => {
            const bp = botProgress[bot.id];
            if (bp.kicked || bp.flags_solved >= challenges.length) return;

            let chance = 0.02;
            if (bot.skill_level === 'fast') chance = 0.05;
            if (bot.skill_level === 'slow') chance = 0.01;

            if (Math.random() < chance) {
                bp.flags_solved++;
                const ch = challenges[bp.flags_solved - 1];
                bp.score += ch ? ch.points : 10;
                addLog(`${bot.display_name} solved "${ch ? ch.title : 'Step ' + bp.flags_solved}" (+${ch ? ch.points : 10}pts)`, 'info');
            } else if (Math.random() < 0.005) {
                addLog(`${bot.display_name} submitted an incorrect flag`, 'error');
            }
        });

        if (Math.random() < 0.001) {
            const active = botProfiles.filter(b => !botProgress[b.id].kicked);
            if (active.length > 5) {
                const victim = active[Math.floor(Math.random() * active.length)];
                botProgress[victim.id].kicked = true;
                addLog(`${victim.display_name} has been removed — security violation`, 'kick');
            }
        }

        setTimeout(botTick, 3000 + Math.random() * 5000);
    }

    setTimeout(botTick, 10000 + Math.random() * 20000);
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
        'Instagram': 'IG', 'Facebook': 'FB', 'WhatsApp': 'WA',
        'Telegram': 'TG', 'Unknown': '??', 'Twitter': 'X', 'Signal': 'SG',
    };

    iconEl.textContent = iconMap[notif.app_name] || '??';
    appEl.textContent = notif.app_name || 'Unknown';
    msgEl.textContent = notif.message;

    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 5000 + Math.random() * 3000);
}

// ===== Mic Monitoring (Volume Only) =====
let micStream = null;
let micAnalyser = null;
let micLoudCount = 0;

async function startMicMonitoring() {
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(micStream);
        micAnalyser = audioCtx.createAnalyser();
        micAnalyser.fftSize = 256;
        source.connect(micAnalyser);

        const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);
        let lastLoudWarning = 0;

        function checkMicLevel() {
            if (isKicked || eventEnded) return;
            micAnalyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avgVolume = sum / dataArray.length;

            if (avgVolume > 80) {
                const now = Date.now();
                if (now - lastLoudWarning > 30000) {
                    lastLoudWarning = now;
                    micLoudCount++;
                    addLog('Loud audio detected', 'warn');
                }
            }
            setTimeout(checkMicLevel, 500);
        }
        checkMicLevel();
        addLog('Mic monitoring active', 'info');
    } catch (e) {
        addLog('Mic access denied', 'warn');
    }
}

// ===== Warning / Kick (from server responses) =====
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
    addLog('You have been removed — security violation', 'kick');
}

async function exitAfterKick() {
    await window.ctfAPI.clearSession();
    sessionStorage.clear();
    window.ctfAPI.exitApp();
}

// ===== Event End =====
async function endEvent() {
    if (eventEnded) return;
    eventEnded = true;

    const res = await window.ctfAPI.request('/event-complete', 'POST', {
        session_id: sessionId,
    }, token);

    document.getElementById('resultScore').textContent = myScore;
    document.getElementById('resultFlags').textContent = myFlagCount;
    document.getElementById('resultRank').textContent = document.getElementById('myRank').textContent || '#--';

    if (res.status === 200 && res.data.reward_code) {
        const codeEl = document.getElementById('resultCode');
        codeEl.textContent = 'Reward: ' + res.data.reward_code;
        codeEl.style.display = 'block';
    }

    document.getElementById('resultOverlay').classList.add('show');
}

async function exitEvent() {
    await window.ctfAPI.clearSession();
    sessionStorage.clear();
    window.ctfAPI.exitApp();
}

// ===== Exit Confirm =====
function showExitConfirm() {
    document.getElementById('exitOverlay').classList.add('show');
}

function cancelExit() {
    document.getElementById('exitOverlay').classList.remove('show');
}

async function confirmExit() {
    if (!eventEnded) {
        eventEnded = true;
        await window.ctfAPI.request('/event-complete', 'POST', {
            session_id: sessionId,
        }, token);
    }
    await window.ctfAPI.clearSession();
    sessionStorage.clear();
    window.ctfAPI.exitApp();
}

// ===== Utility =====
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
