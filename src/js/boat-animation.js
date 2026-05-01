// ==================== UNFRIENDED DARK WEB — CHARON'S BOAT ====================
// First-person perspective: you're ON the boat, sailing through dark water
// River Styx / dark web tunnel aesthetic with ambient sound

(function () {
    const canvas = document.getElementById('boat-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h;
    let time = 0;
    let vpY; // vanishing point Y (horizon)

    // Floating debris coming toward you
    let debris = [];
    // Fog particles
    let fogParts = [];
    // Water ripples expanding from center
    let ripples = [];

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        vpY = h * 0.38; // horizon line
    }
    window.addEventListener('resize', resize);
    resize();

    // Init debris (things floating past on the water)
    for (let i = 0; i < 40; i++) {
        debris.push(makeDebris());
    }
    function makeDebris() {
        const z = 0.05 + Math.random() * 0.95; // depth 0=far, 1=near
        return {
            x: (Math.random() - 0.5) * 2, // -1 to 1 from center
            z: z,
            speed: 0.001 + Math.random() * 0.003,
            size: 1 + Math.random() * 2,
            opacity: 0.1 + Math.random() * 0.25,
            drift: (Math.random() - 0.5) * 0.0005,
        };
    }

    // Fog particles (wispy, drifting)
    for (let i = 0; i < 25; i++) {
        fogParts.push({
            x: Math.random() * w,
            y: vpY - 80 + Math.random() * 160,
            radius: 40 + Math.random() * 120,
            opacity: 0.01 + Math.random() * 0.03,
            dx: (Math.random() - 0.5) * 0.3,
            dy: (Math.random() - 0.5) * 0.1,
        });
    }

    // Ripple spawner
    function spawnRipple() {
        ripples.push({
            x: w * 0.5 + (Math.random() - 0.5) * w * 0.15,
            y: h * 0.72 + Math.random() * 20,
            radius: 0,
            maxRadius: 30 + Math.random() * 60,
            opacity: 0.08 + Math.random() * 0.06,
            speed: 0.3 + Math.random() * 0.4,
        });
    }

    // ===== AMBIENT SOUND (Web Audio API — procedural water) =====
    let audioCtx = null;
    let audioStarted = false;

    function startAmbientSound() {
        if (audioStarted) return;
        audioStarted = true;

        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // Brown noise (water ambience)
            const bufferSize = 2 * audioCtx.sampleRate;
            const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + 0.02 * white) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5; // boost
            }

            const waterNoise = audioCtx.createBufferSource();
            waterNoise.buffer = noiseBuffer;
            waterNoise.loop = true;

            // Low-pass filter (muffled underwater feel)
            const lpf = audioCtx.createBiquadFilter();
            lpf.type = 'lowpass';
            lpf.frequency.value = 300;
            lpf.Q.value = 1;

            // Gain (quiet)
            const gain = audioCtx.createGain();
            gain.gain.value = 0;
            // Fade in over 3 seconds
            gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 3);

            waterNoise.connect(lpf);
            lpf.connect(gain);
            gain.connect(audioCtx.destination);
            waterNoise.start();

            // Occasional deep rumble
            function rumble() {
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 25 + Math.random() * 20;
                const rumbleGain = audioCtx.createGain();
                rumbleGain.gain.value = 0;
                rumbleGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 1);
                rumbleGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
                osc.connect(rumbleGain);
                rumbleGain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 3.5);
                setTimeout(rumble, 8000 + Math.random() * 15000);
            }
            setTimeout(rumble, 5000);

            // Occasional creak (boat wood)
            function creak() {
                const osc = audioCtx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = 80 + Math.random() * 60;
                const creakFilter = audioCtx.createBiquadFilter();
                creakFilter.type = 'bandpass';
                creakFilter.frequency.value = 400;
                creakFilter.Q.value = 8;
                const creakGain = audioCtx.createGain();
                creakGain.gain.value = 0;
                creakGain.gain.linearRampToValueAtTime(0.015, audioCtx.currentTime + 0.1);
                creakGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
                osc.connect(creakFilter);
                creakFilter.connect(creakGain);
                creakGain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.8);
                setTimeout(creak, 12000 + Math.random() * 20000);
            }
            setTimeout(creak, 8000);

        } catch (e) { /* Audio not supported — silent fallback */ }
    }

    // Start audio on first interaction or immediately
    document.addEventListener('click', startAmbientSound, { once: true });
    document.addEventListener('keydown', startAmbientSound, { once: true });
    // Also try auto-start
    setTimeout(startAmbientSound, 1000);

    // ===== DRAWING =====

    function drawSky() {
        // Almost black sky with hint of dark teal at horizon
        const grad = ctx.createLinearGradient(0, 0, 0, vpY + 20);
        grad.addColorStop(0, '#020205');
        grad.addColorStop(0.6, '#030308');
        grad.addColorStop(1, '#05080f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, vpY + 20);

        // Distant faint glow at horizon (eerie green)
        const glowGrad = ctx.createRadialGradient(w * 0.5, vpY, 0, w * 0.5, vpY, w * 0.4);
        glowGrad.addColorStop(0, 'rgba(0, 40, 30, 0.12)');
        glowGrad.addColorStop(0.5, 'rgba(0, 20, 15, 0.05)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, vpY - 100, w, 200);
    }

    function drawWater() {
        // Dark water below horizon — perspective grid
        const grad = ctx.createLinearGradient(0, vpY, 0, h);
        grad.addColorStop(0, '#06090e');
        grad.addColorStop(0.3, '#040710');
        grad.addColorStop(1, '#020308');
        ctx.fillStyle = grad;
        ctx.fillRect(0, vpY, w, h - vpY);

        // Perspective lines converging to vanishing point (river banks / tunnel)
        const vpX = w * 0.5;
        const lineCount = 12;

        for (let i = 0; i < lineCount; i++) {
            const t = i / lineCount;
            const yFar = vpY;
            const yNear = vpY + (h - vpY) * (t * t); // quadratic spacing

            // Left bank line
            const xFarL = vpX - 2;
            const xNearL = -w * 0.1 * (1 - t);
            // Right bank line
            const xFarR = vpX + 2;
            const xNearR = w + w * 0.1 * (1 - t);

            const alpha = 0.015 + t * 0.02;

            ctx.beginPath();
            ctx.moveTo(xFarL, yFar);
            ctx.lineTo(xNearL, yNear + 30);
            ctx.strokeStyle = `rgba(0, 180, 120, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(xFarR, yFar);
            ctx.lineTo(xNearR, yNear + 30);
            ctx.stroke();
        }

        // Horizontal water lines (perspective — closer = wider apart)
        for (let i = 1; i <= 20; i++) {
            const t = i / 20;
            const y = vpY + (h - vpY) * (t * t);
            const waveOffset = Math.sin(time * 0.4 + i * 0.7) * (3 + t * 8);
            const alpha = 0.01 + t * 0.025;

            ctx.beginPath();
            ctx.moveTo(0, y + waveOffset);
            for (let x = 0; x <= w; x += 8) {
                const wave = Math.sin(x * 0.008 + time * 0.6 + i) * (2 + t * 6);
                ctx.lineTo(x, y + wave + waveOffset);
            }
            ctx.strokeStyle = `rgba(0, 120, 100, ${alpha})`;
            ctx.lineWidth = 0.5 + t * 0.5;
            ctx.stroke();
        }
    }

    function drawBoatBow() {
        // First-person: you see the front of the boat at the bottom
        const bowCenterX = w * 0.5;
        const bowTipY = h * 0.72 + Math.sin(time * 0.6) * 4; // gentle bob
        const bowBaseY = h + 30;
        const bowWidth = w * 0.22;

        // Gentle sway
        const sway = Math.sin(time * 0.35) * 3;

        ctx.save();
        ctx.translate(sway, 0);

        // Main hull (dark wood)
        ctx.beginPath();
        ctx.moveTo(bowCenterX, bowTipY); // tip/bow point
        ctx.quadraticCurveTo(bowCenterX - bowWidth * 0.4, bowTipY + 60, bowCenterX - bowWidth, bowBaseY);
        ctx.lineTo(bowCenterX + bowWidth, bowBaseY);
        ctx.quadraticCurveTo(bowCenterX + bowWidth * 0.4, bowTipY + 60, bowCenterX, bowTipY);
        ctx.closePath();

        const hullGrad = ctx.createLinearGradient(bowCenterX, bowTipY, bowCenterX, bowBaseY);
        hullGrad.addColorStop(0, '#1a1a22');
        hullGrad.addColorStop(0.5, '#12121a');
        hullGrad.addColorStop(1, '#0a0a10');
        ctx.fillStyle = hullGrad;
        ctx.fill();

        // Hull edge highlight
        ctx.strokeStyle = 'rgba(60, 70, 80, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Wood planks (subtle lines)
        for (let i = 1; i <= 5; i++) {
            const py = bowTipY + i * 30;
            const spread = (i / 5) * bowWidth * 0.9;
            ctx.beginPath();
            ctx.moveTo(bowCenterX - spread, py);
            ctx.quadraticCurveTo(bowCenterX, py - 3, bowCenterX + spread, py);
            ctx.strokeStyle = 'rgba(50, 55, 65, 0.25)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // Center ridge line
        ctx.beginPath();
        ctx.moveTo(bowCenterX, bowTipY);
        ctx.lineTo(bowCenterX, bowBaseY);
        ctx.strokeStyle = 'rgba(70, 80, 90, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Faint green glow at bow tip (lantern/indicator)
        const glowGrad = ctx.createRadialGradient(bowCenterX, bowTipY + 5, 0, bowCenterX, bowTipY + 5, 25);
        const glowPulse = 0.15 + Math.sin(time * 1.5) * 0.08;
        glowGrad.addColorStop(0, `rgba(0, 255, 136, ${glowPulse})`);
        glowGrad.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(bowCenterX, bowTipY + 5, 25, 0, Math.PI * 2);
        ctx.fill();

        // Tiny lantern dot
        ctx.beginPath();
        ctx.arc(bowCenterX, bowTipY + 2, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 136, ${0.5 + Math.sin(time * 2) * 0.2})`;
        ctx.fill();

        ctx.restore();
    }

    function drawDebris() {
        const vpX = w * 0.5;

        debris.forEach(d => {
            // Move toward camera
            d.z += d.speed;
            d.x += d.drift;

            if (d.z > 1.05) {
                Object.assign(d, makeDebris());
                d.z = 0.05;
            }

            // Perspective projection
            const scale = d.z * d.z; // quadratic for depth feel
            const screenX = vpX + d.x * w * 0.6 * scale;
            const screenY = vpY + (h * 0.35) * scale;
            const size = d.size * scale * 4;
            const alpha = d.opacity * Math.min(1, d.z * 2) * Math.min(1, (1 - d.z) * 5);

            if (size < 0.3 || alpha < 0.01) return;

            ctx.beginPath();
            ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 160, 120, ${alpha})`;
            ctx.fill();
        });
    }

    function drawRipples() {
        ripples.forEach((r, idx) => {
            r.radius += r.speed;
            r.opacity *= 0.995;

            if (r.radius > r.maxRadius || r.opacity < 0.005) {
                ripples.splice(idx, 1);
                return;
            }

            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 150, 130, ${r.opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        });

        // Spawn new ripple occasionally
        if (Math.random() < 0.03) spawnRipple();
    }

    function drawFog() {
        fogParts.forEach(f => {
            f.x += f.dx;
            f.y += f.dy;

            // Wrap around
            if (f.x < -f.radius) f.x = w + f.radius;
            if (f.x > w + f.radius) f.x = -f.radius;

            const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
            const pulse = f.opacity * (0.8 + Math.sin(time * 0.2 + f.x * 0.01) * 0.2);
            grad.addColorStop(0, `rgba(15, 25, 30, ${pulse})`);
            grad.addColorStop(0.5, `rgba(10, 18, 22, ${pulse * 0.5})`);
            grad.addColorStop(1, 'rgba(5, 10, 15, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(f.x - f.radius, f.y - f.radius, f.radius * 2, f.radius * 2);
        });
    }

    function drawWake() {
        // Boat wake trail behind (V-shape from bow tip going back toward camera)
        const bowX = w * 0.5 + Math.sin(time * 0.35) * 3;
        const bowY = h * 0.72 + Math.sin(time * 0.6) * 4;

        for (let i = 0; i < 12; i++) {
            const t = i / 12;
            const spread = t * 80;
            const y = bowY + t * (h - bowY) * 0.5;
            const alpha = 0.04 * (1 - t);
            const waveShift = Math.sin(time * 0.8 + i * 0.5) * (2 + t * 4);

            // Left wake
            ctx.beginPath();
            ctx.arc(bowX - spread + waveShift, y, 1 + t * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(80, 140, 160, ${alpha})`;
            ctx.fill();

            // Right wake
            ctx.beginPath();
            ctx.arc(bowX + spread - waveShift, y, 1 + t * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawVignette() {
        // Heavy vignette for dark/horror feel
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.25, w * 0.5, h * 0.5, w * 0.75);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    // ===== MAIN LOOP =====
    function animate() {
        time += 0.016;
        ctx.clearRect(0, 0, w, h);

        drawSky();
        drawWater();
        drawFog();
        drawDebris();
        drawRipples();
        drawWake();
        drawBoatBow();
        drawVignette();

        requestAnimationFrame(animate);
    }

    animate();

    // Expose stop function for cleanup
    window._stopBoatAudio = function () {
        if (audioCtx) {
            audioCtx.close().catch(() => { });
            audioCtx = null;
        }
    };
})();
