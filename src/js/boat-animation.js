// ==================== DARK TUNNEL — CHARON'S PASSAGE v2 ====================
// Advanced pixel-art style first-person tunnel: stone brick walls, burning torches,
// dark flowing water, boat bow, thick fog, embers, volumetric torch light

(function () {
    const canvas = document.getElementById('boat-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h, time = 0;
    const speed = 0.7;

    // Vanishing point
    let vpX, vpY;

    // Pixel scale for retro feel
    const PX = 2;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        vpX = w * 0.5;
        vpY = h * 0.32;
    }
    window.addEventListener('resize', resize);
    resize();

    // ===== TUNNEL GEOMETRY =====
    function tunnelToScreen(xNorm, z) {
        const scale = Math.pow(z, 1.5);
        const tunnelW = w * 0.04 + w * 0.56 * scale;
        const sx = vpX + xNorm * tunnelW * 0.5;
        const sy = vpY + (h * 0.68) * Math.pow(z, 1.2);
        return { x: sx, y: sy, scale };
    }

    // ===== TORCHES =====
    const TORCH_COUNT = 16;
    const torches = [];
    for (let i = 0; i < TORCH_COUNT; i++) {
        torches.push({
            side: i % 2 === 0 ? -1 : 1,
            z: (i + 0.5) / TORCH_COUNT,
            flicker: Math.random() * Math.PI * 2,
            intensity: 0.75 + Math.random() * 0.25,
            hue: 20 + Math.random() * 20,
        });
    }

    // ===== FOG =====
    const fogParts = [];
    for (let i = 0; i < 35; i++) {
        fogParts.push({
            x: Math.random(), y: 0.15 + Math.random() * 0.65,
            radius: 70 + Math.random() * 160,
            opacity: 0.006 + Math.random() * 0.018,
            dx: (Math.random() - 0.5) * 0.00025,
            phase: Math.random() * Math.PI * 2,
        });
    }

    // ===== EMBERS =====
    const embers = [];
    for (let i = 0; i < 40; i++) embers.push(makeEmber());
    function makeEmber() {
        const side = Math.random() < 0.5 ? -1 : 1;
        return {
            x: vpX + side * (w * 0.15 + Math.random() * w * 0.25),
            y: h * 0.25 + Math.random() * h * 0.4,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -0.4 - Math.random() * 1.2,
            life: 1,
            decay: 0.004 + Math.random() * 0.008,
            size: 1 + Math.random() * 2.5,
            bright: Math.random(),
        };
    }

    // ===== SMOKE =====
    const smokeParticles = [];

    // ===== WATER DEBRIS =====
    const debris = [];
    for (let i = 0; i < 30; i++) debris.push(makeDebris());
    function makeDebris() {
        return {
            x: (Math.random() - 0.5) * 1.8,
            z: 0.05 + Math.random() * 0.95,
            speed: 0.002 + Math.random() * 0.005,
            size: 0.4 + Math.random() * 1.8,
            opacity: 0.06 + Math.random() * 0.12,
            drift: (Math.random() - 0.5) * 0.0004,
        };
    }

    // ===== RIPPLES =====
    let ripples = [];

    // ===== DRAWING: CEILING =====
    function drawCeiling() {
        const grad = ctx.createRadialGradient(vpX, vpY - h * 0.1, 5, vpX, vpY + 20, h * 0.45);
        grad.addColorStop(0, '#1a1510');
        grad.addColorStop(0.5, '#0e0b08');
        grad.addColorStop(1, '#060504');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, vpY + 40);

        // Stone arch
        ctx.beginPath();
        ctx.moveTo(0, vpY + 40);
        for (let x = 0; x <= w; x += PX * 2) {
            const t = x / w;
            const archY = vpY + 40 - Math.sin(t * Math.PI) * vpY * 0.3;
            ctx.lineTo(x, archY);
        }
        ctx.lineTo(w, vpY + 40);
        ctx.closePath();
        ctx.fillStyle = '#0a0806';
        ctx.fill();
    }

    // ===== DRAWING: WALLS WITH PIXEL BRICKS =====
    function drawWalls() {
        // Left wall fill
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let z = 0; z <= 1; z += 0.015) {
            const p = tunnelToScreen(-1, z);
            ctx.lineTo(p.x, p.y);
        }
        ctx.lineTo(0, h); ctx.lineTo(0, 0); ctx.closePath();
        let wg = ctx.createLinearGradient(0, 0, w * 0.3, 0);
        wg.addColorStop(0, '#1c1814');
        wg.addColorStop(0.6, '#252018');
        wg.addColorStop(1, '#161310');
        ctx.fillStyle = wg;
        ctx.fill();

        // Right wall fill
        ctx.beginPath();
        ctx.moveTo(w, 0);
        for (let z = 0; z <= 1; z += 0.015) {
            const p = tunnelToScreen(1, z);
            ctx.lineTo(p.x, p.y);
        }
        ctx.lineTo(w, h); ctx.lineTo(w, 0); ctx.closePath();
        wg = ctx.createLinearGradient(w, 0, w * 0.7, 0);
        wg.addColorStop(0, '#1c1814');
        wg.addColorStop(0.6, '#252018');
        wg.addColorStop(1, '#161310');
        ctx.fillStyle = wg;
        ctx.fill();

        // Brick mortar lines — pixel art style
        const brickRows = 55;
        for (let i = 0; i < brickRows; i++) {
            const z = ((i + time * 0.4) % brickRows) / brickRows;
            if (z < 0.03) continue;
            const pL = tunnelToScreen(-1, z);
            const pR = tunnelToScreen(1, z);
            const alpha = 0.08 + Math.pow(z, 2) * 0.2;
            const lw = Math.max(PX * 0.5, z * PX * 1.5);

            // Horizontal mortar
            ctx.strokeStyle = `rgba(80, 65, 45, ${alpha})`;
            ctx.lineWidth = lw;

            ctx.beginPath(); ctx.moveTo(0, pL.y); ctx.lineTo(pL.x, pL.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(w, pR.y); ctx.lineTo(pR.x, pR.y); ctx.stroke();

            // Vertical brick dividers (staggered)
            if (z > 0.2) {
                const brickW = 12 + z * 50;
                const offset = (i % 2) * brickW * 0.5;
                const nextZ = Math.min(1, z + 1 / brickRows);
                const nextPL = tunnelToScreen(-1, nextZ);
                const brickH = Math.abs(nextPL.y - pL.y);

                // Left wall bricks
                for (let bx = offset; bx < pL.x; bx += brickW) {
                    ctx.beginPath();
                    ctx.moveTo(bx, pL.y);
                    ctx.lineTo(bx, pL.y - brickH);
                    ctx.strokeStyle = `rgba(75, 60, 40, ${alpha * 0.9})`;
                    ctx.lineWidth = Math.max(1, z * PX);
                    ctx.stroke();
                }
                // Right wall bricks
                for (let bx = pR.x + offset; bx < w; bx += brickW) {
                    ctx.beginPath();
                    ctx.moveTo(bx, pR.y);
                    ctx.lineTo(bx, pR.y - brickH);
                    ctx.strokeStyle = `rgba(75, 60, 40, ${alpha * 0.9})`;
                    ctx.lineWidth = Math.max(1, z * PX);
                    ctx.stroke();
                }

                // Random dark/light brick patches for texture
                if (Math.sin(i * 7.3 + z * 13.7) > 0.6) {
                    const patchX = i % 2 === 0 ? pL.x - 10 - z * 30 : pR.x + 10 + z * 30;
                    const patchSize = 4 + z * 12;
                    ctx.fillStyle = `rgba(20, 16, 12, ${alpha * 0.5})`;
                    ctx.fillRect(patchX, pL.y - brickH, patchSize, brickH * 0.8);
                }
            }
        }

        // Moss/slime streaks on lower walls
        for (let i = 0; i < 12; i++) {
            const z = 0.4 + (i / 12) * 0.55;
            const side = i % 2 === 0 ? -1 : 1;
            const p = tunnelToScreen(side, z);
            const sx = side === -1 ? p.x - 8 - i * 4 : p.x + 8 + i * 4;
            const len = 25 + z * 50;
            const alpha = 0.025 + Math.sin(time * 0.2 + i) * 0.01;

            ctx.beginPath();
            ctx.moveTo(sx, p.y - len);
            ctx.bezierCurveTo(sx + Math.sin(i * 2) * 3, p.y - len * 0.6, sx - Math.sin(i) * 2, p.y - len * 0.3, sx + Math.sin(i) * 4, p.y);
            ctx.strokeStyle = `rgba(30, 60, 35, ${alpha})`;
            ctx.lineWidth = 1 + z;
            ctx.stroke();
        }

        // Wet shine streaks
        for (let i = 0; i < 8; i++) {
            const z = 0.35 + (i / 8) * 0.6;
            const side = i % 2 === 0 ? -1 : 1;
            const p = tunnelToScreen(side, z);
            const sx = side === -1 ? p.x - 3 - i * 5 : p.x + 3 + i * 5;
            const len = 15 + z * 35;
            const pulse = Math.sin(time * 0.5 + i * 1.3) * 0.5 + 0.5;

            ctx.beginPath();
            ctx.moveTo(sx, p.y - len);
            ctx.lineTo(sx + 1, p.y);
            ctx.strokeStyle = `rgba(100, 120, 140, ${0.015 * pulse})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
    }

    // ===== DRAWING: WATER =====
    function drawWater() {
        const waterTop = vpY + 15;
        const grad = ctx.createLinearGradient(0, waterTop, 0, h);
        grad.addColorStop(0, '#08101c');
        grad.addColorStop(0.1, '#0a1425');
        grad.addColorStop(0.4, '#060e1a');
        grad.addColorStop(1, '#030810');
        ctx.fillStyle = grad;
        ctx.fillRect(0, waterTop, w, h - waterTop);

        // Perspective water lines
        for (let i = 1; i <= 35; i++) {
            const t = i / 35;
            const y = waterTop + (h - waterTop) * Math.pow(t, 1.4);
            const amp = 1 + t * 6;
            const alpha = 0.006 + t * 0.035;

            ctx.beginPath();
            for (let x = 0; x <= w; x += PX * 3) {
                const wave1 = Math.sin(x * 0.007 + time * 0.8 + i * 0.6) * amp;
                const wave2 = Math.sin(x * 0.013 + time * 1.3 + i * 1.1) * amp * 0.35;
                const wave3 = Math.sin(x * 0.003 + time * 0.3) * amp * 0.5;
                const wy = y + wave1 + wave2 + wave3;
                if (x === 0) ctx.moveTo(x, wy);
                else ctx.lineTo(x, wy);
            }
            ctx.strokeStyle = `rgba(80, 110, 145, ${alpha})`;
            ctx.lineWidth = 0.5 + t * 0.8;
            ctx.stroke();
        }

        // Forward motion streaks (speed lines on water)
        for (let i = 0; i < 20; i++) {
            const t = i / 20;
            const y = waterTop + 40 + (h - waterTop - 40) * Math.pow(t, 1.2);
            const sway = Math.sin(time * 0.9 + i * 1.5) * 6;
            const length = 25 + t * 150;
            const alpha = 0.015 + t * 0.035;

            ctx.beginPath();
            ctx.moveTo(vpX + sway - length * 0.1, y);
            ctx.lineTo(vpX + sway + length * 0.1, y + 3 + t * 12);
            ctx.strokeStyle = `rgba(40, 55, 75, ${alpha})`;
            ctx.lineWidth = 0.4 + t * 0.9;
            ctx.stroke();
        }
    }

    // ===== DRAWING: TORCH WITH ADVANCED FLAME =====
    function drawTorch(sx, sy, scale, flicker, intensity, hue) {
        if (scale < 0.06) return;

        // Iron bracket (pixel blocks)
        const bs = Math.max(PX, 3 * scale);
        ctx.fillStyle = `rgba(50, 45, 35, ${0.7 * scale})`;
        ctx.fillRect(sx - bs, sy, bs * 2, 14 * scale);

        // Wooden stick
        ctx.fillStyle = `rgba(70, 45, 20, ${0.8 * scale})`;
        ctx.fillRect(sx - PX * scale, sy - 10 * scale, PX * 2 * scale, 10 * scale);

        // Cloth wrap
        ctx.fillStyle = `rgba(90, 60, 30, ${0.5 * scale})`;
        ctx.fillRect(sx - PX * 1.5 * scale, sy - 8 * scale, PX * 3 * scale, 3 * scale);

        // === FLAME (multi-layer, pixel art inspired) ===
        const ft = time * 3.5 + flicker;
        const flameH = (18 + Math.sin(ft) * 5 + Math.sin(ft * 2.9) * 3) * scale;
        const flameW = (8 + Math.sin(ft * 1.4) * 2.5) * scale;
        const sway = Math.sin(ft * 0.6) * 3 * scale;

        // Outer flame (deep red/orange)
        const outerG = ctx.createRadialGradient(sx + sway, sy - flameH * 0.4, 0, sx + sway, sy - flameH * 0.25, flameH * 0.8);
        const a = intensity * scale * (0.75 + Math.sin(ft) * 0.15);
        outerG.addColorStop(0, `rgba(255, 150, 30, ${a})`);
        outerG.addColorStop(0.35, `rgba(255, 90, 15, ${a * 0.7})`);
        outerG.addColorStop(0.7, `rgba(180, 40, 5, ${a * 0.3})`);
        outerG.addColorStop(1, 'rgba(80, 20, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(sx - flameW + sway, sy);
        ctx.quadraticCurveTo(sx + sway - flameW * 0.4, sy - flameH * 0.5, sx + sway + Math.sin(ft * 1.7) * 2 * scale, sy - flameH);
        ctx.quadraticCurveTo(sx + sway + flameW * 0.4, sy - flameH * 0.5, sx + flameW + sway, sy);
        ctx.closePath();
        ctx.fillStyle = outerG;
        ctx.fill();

        // Middle flame (bright orange)
        const midH = flameH * 0.7;
        const midW = flameW * 0.6;
        ctx.beginPath();
        ctx.moveTo(sx - midW + sway, sy);
        ctx.quadraticCurveTo(sx + sway, sy - midH * 1.1, sx + midW + sway, sy);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 200, 60, ${a * 0.6})`;
        ctx.fill();

        // Inner flame (white-hot core)
        const innerH = flameH * 0.35;
        const innerW = flameW * 0.3;
        ctx.beginPath();
        ctx.moveTo(sx - innerW + sway, sy);
        ctx.quadraticCurveTo(sx + sway, sy - innerH * 1.3, sx + innerW + sway, sy);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 220, ${a * 0.5})`;
        ctx.fill();

        // Flame tip sparks (pixel dots)
        for (let s = 0; s < 3; s++) {
            const sparkX = sx + sway + (Math.sin(ft * 2 + s * 3) * flameW * 0.5);
            const sparkY = sy - flameH - Math.random() * 5 * scale;
            const sparkA = Math.random() * a * 0.5;
            ctx.fillStyle = `rgba(255, 200, 80, ${sparkA})`;
            ctx.fillRect(sparkX, sparkY, PX * scale, PX * scale);
        }

        // Wall glow (volumetric light from torch)
        const glowR = 140 * scale * intensity;
        const wallGlow = ctx.createRadialGradient(sx, sy - flameH * 0.3, 0, sx, sy, glowR);
        const ga = 0.18 * intensity * scale * (0.8 + Math.sin(ft) * 0.2);
        wallGlow.addColorStop(0, `rgba(255, 140, 40, ${ga})`);
        wallGlow.addColorStop(0.3, `rgba(220, 90, 20, ${ga * 0.5})`);
        wallGlow.addColorStop(0.6, `rgba(150, 55, 12, ${ga * 0.25})`);
        wallGlow.addColorStop(1, 'rgba(60, 25, 5, 0)');
        ctx.fillStyle = wallGlow;
        ctx.beginPath();
        ctx.arc(sx, sy - flameH * 0.2, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Water reflection (elongated)
        const refY = vpY + (h - vpY) * Math.pow(Math.max(0.1, scale), 0.7) * 0.55;
        const refGlow = ctx.createRadialGradient(sx, refY, 0, sx, refY, 80 * scale);
        const ra = 0.09 * intensity * scale * (0.7 + Math.sin(ft * 1.2) * 0.2);
        refGlow.addColorStop(0, `rgba(255, 120, 30, ${ra})`);
        refGlow.addColorStop(0.5, `rgba(220, 70, 15, ${ra * 0.4})`);
        refGlow.addColorStop(1, 'rgba(120, 40, 8, 0)');
        ctx.fillStyle = refGlow;
        ctx.beginPath();
        ctx.ellipse(sx, refY, 50 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Spawn smoke
        if (Math.random() < 0.08 * scale) {
            smokeParticles.push({
                x: sx + sway, y: sy - flameH,
                vx: (Math.random() - 0.5) * 0.4 + Math.sin(time) * 0.1,
                vy: -0.5 - Math.random() * 0.6,
                size: 4 + Math.random() * 6,
                opacity: 0.03 + Math.random() * 0.03,
                life: 1,
            });
        }
    }

    function drawTorches() {
        torches.forEach(t => {
            let z = (t.z + time * 0.012) % 1;
            if (z < 0.04) return;
            const p = tunnelToScreen(t.side * 0.93, z);
            const scale = Math.pow(z, 1.1);
            drawTorch(p.x, p.y - 18 * scale, scale, t.flicker, t.intensity, t.hue);
        });
    }

    // ===== DRAWING: SMOKE =====
    function drawSmoke() {
        for (let i = smokeParticles.length - 1; i >= 0; i--) {
            const s = smokeParticles[i];
            s.x += s.vx;
            s.y += s.vy;
            s.size += 0.2;
            s.life -= 0.007;
            s.opacity *= 0.985;

            if (s.life <= 0 || s.opacity < 0.002) {
                smokeParticles.splice(i, 1);
                continue;
            }
            const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
            grad.addColorStop(0, `rgba(50, 45, 35, ${s.opacity * s.life})`);
            grad.addColorStop(1, 'rgba(30, 25, 20, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        // Cap smoke count
        if (smokeParticles.length > 80) smokeParticles.splice(0, 10);
    }

    // ===== DRAWING: EMBERS =====
    function drawEmbers() {
        embers.forEach((e, i) => {
            e.x += e.vx;
            e.y += e.vy;
            e.vy -= 0.005; // slight upward accel
            e.life -= e.decay;

            if (e.life <= 0) { embers[i] = makeEmber(); return; }

            const flick = Math.sin(time * 8 + i) * 0.3 + 0.7;
            const r = 255;
            const g = 100 + e.bright * 100 + Math.random() * 40;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g | 0}, 15, ${e.life * 0.7 * flick})`;
            ctx.fill();

            // Tiny glow around ember
            if (e.life > 0.5) {
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 120, 20, ${e.life * 0.03})`;
                ctx.fill();
            }
        });
    }

    // ===== DRAWING: FOG =====
    function drawFog() {
        fogParts.forEach(f => {
            f.x += f.dx;
            if (f.x < -0.15) f.x = 1.15;
            if (f.x > 1.15) f.x = -0.15;

            const sx = f.x * w;
            const sy = f.y * h;
            const pulse = f.opacity * (0.7 + Math.sin(time * 0.12 + f.phase) * 0.3);

            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, f.radius);
            grad.addColorStop(0, `rgba(15, 13, 10, ${pulse})`);
            grad.addColorStop(0.5, `rgba(10, 8, 6, ${pulse * 0.4})`);
            grad.addColorStop(1, 'rgba(5, 4, 3, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(sx - f.radius, sy - f.radius, f.radius * 2, f.radius * 2);
        });
    }

    // ===== DRAWING: DEBRIS ON WATER =====
    function drawDebris() {
        debris.forEach(d => {
            d.z += d.speed;
            d.x += d.drift;
            if (d.z > 1.05) Object.assign(d, makeDebris(), { z: 0.05 });

            const scale = Math.pow(d.z, 1.5);
            const sx = vpX + d.x * w * 0.35 * scale;
            const sy = vpY + (h * 0.5) * scale;
            const size = d.size * scale * 3.5;
            const alpha = d.opacity * Math.min(1, d.z * 3) * Math.min(1, (1 - d.z) * 5);

            if (size < 0.4 || alpha < 0.004) return;
            ctx.fillStyle = `rgba(60, 75, 85, ${alpha})`;
            ctx.fillRect(sx - size * 0.5, sy - size * 0.3, size, size * 0.6);
        });
    }

    // ===== DRAWING: RIPPLES =====
    function drawRipples() {
        if (Math.random() < 0.03) {
            ripples.push({
                x: vpX + (Math.random() - 0.5) * w * 0.35,
                y: h * 0.68 + Math.random() * h * 0.15,
                radius: 0, maxR: 25 + Math.random() * 60,
                opacity: 0.05 + Math.random() * 0.04,
                speed: 0.3 + Math.random() * 0.4,
            });
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.radius += r.speed;
            r.opacity *= 0.992;
            if (r.radius > r.maxR || r.opacity < 0.003) { ripples.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.2, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(70, 90, 110, ${r.opacity})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }
    }

    // ===== DRAWING: TUNNEL END (VANISHING POINT) =====
    function drawTunnelEnd() {
        // Distant warm glow
        const g = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, w * 0.07);
        const pulse = 0.05 + Math.sin(time * 0.35) * 0.02;
        g.addColorStop(0, `rgba(160, 90, 25, ${pulse})`);
        g.addColorStop(0.4, `rgba(90, 40, 10, ${pulse * 0.3})`);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(vpX, vpY, w * 0.07, 0, Math.PI * 2);
        ctx.fill();

        // Dark silhouette/figure at end
        const figH = 12 + Math.sin(time * 0.2) * 2;
        const figW = 4;
        ctx.fillStyle = `rgba(5, 3, 2, ${0.4 + Math.sin(time * 0.3) * 0.1})`;
        ctx.fillRect(vpX - figW * 0.5, vpY - figH, figW, figH);
    }

    // ===== DRAWING: BOAT BOW =====
    function drawBoat() {
        const cx = vpX;
        const bob = Math.sin(time * 0.45) * 4;
        const tipY = h * 0.68 + bob;
        const baseY = h + 50;
        const bw = w * 0.22;
        const sway = Math.sin(time * 0.28) * 3;

        ctx.save();
        ctx.translate(sway, 0);

        // Hull
        ctx.beginPath();
        ctx.moveTo(cx, tipY);
        ctx.quadraticCurveTo(cx - bw * 0.4, tipY + 60, cx - bw, baseY);
        ctx.lineTo(cx + bw, baseY);
        ctx.quadraticCurveTo(cx + bw * 0.4, tipY + 60, cx, tipY);
        ctx.closePath();

        const hullGrad = ctx.createLinearGradient(cx, tipY, cx, baseY);
        hullGrad.addColorStop(0, '#3a2c1e');
        hullGrad.addColorStop(0.2, '#2a1e14');
        hullGrad.addColorStop(1, '#1a140e');
        ctx.fillStyle = hullGrad;
        ctx.fill();

        // Hull outline
        ctx.strokeStyle = 'rgba(90, 70, 45, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Wood plank lines
        for (let i = 1; i <= 7; i++) {
            const py = tipY + i * 24;
            const spread = (i / 7) * bw * 0.9;
            ctx.beginPath();
            ctx.moveTo(cx - spread, py);
            ctx.quadraticCurveTo(cx, py - 2 + Math.sin(time * 0.3 + i) * 0.5, cx + spread, py);
            ctx.strokeStyle = `rgba(70, 55, 35, ${0.15 + i * 0.02})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }

        // Center keel
        ctx.beginPath();
        ctx.moveTo(cx, tipY);
        ctx.lineTo(cx, baseY);
        ctx.strokeStyle = 'rgba(80, 60, 40, 0.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Bow lantern — warm pulsing glow
        const lanternR = 35;
        const lPulse = 0.22 + Math.sin(time * 2) * 0.08;
        const lg = ctx.createRadialGradient(cx, tipY + 5, 0, cx, tipY + 5, lanternR);
        lg.addColorStop(0, `rgba(255, 170, 60, ${lPulse})`);
        lg.addColorStop(0.5, `rgba(255, 100, 20, ${lPulse * 0.3})`);
        lg.addColorStop(1, 'rgba(200, 60, 10, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(cx, tipY + 5, lanternR, 0, Math.PI * 2);
        ctx.fill();

        // Lantern core dot
        ctx.beginPath();
        ctx.arc(cx, tipY + 3, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 220, 120, ${0.7 + Math.sin(time * 3) * 0.2})`;
        ctx.fill();

        ctx.restore();
    }

    // ===== DRAWING: WAKE =====
    function drawWake() {
        const cx = vpX + Math.sin(time * 0.28) * 3;
        const tipY = h * 0.68 + Math.sin(time * 0.45) * 4;

        for (let i = 0; i < 14; i++) {
            const t = i / 14;
            const spread = t * 80;
            const y = tipY + 10 + t * (h - tipY) * 0.45;
            const alpha = 0.04 * (1 - t);
            const wave = Math.sin(time * 1.1 + i * 0.6) * (2 + t * 5);

            ctx.beginPath();
            ctx.ellipse(cx - spread + wave, y, 2 + t * 3, 1 + t * 0.8, 0.12, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(60, 80, 100, ${alpha})`;
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(cx + spread - wave, y, 2 + t * 3, 1 + t * 0.8, -0.12, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ===== DRAWING: VIGNETTE =====
    function drawVignette() {
        const grad = ctx.createRadialGradient(vpX, h * 0.38, w * 0.25, vpX, h * 0.42, w * 0.85);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
        grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    // ===== DRAWING: DRIP ANIMATION =====
    const drips = [];
    function updateDrips() {
        if (Math.random() < 0.015) {
            const side = Math.random() < 0.5 ? -1 : 1;
            const z = 0.4 + Math.random() * 0.5;
            const p = tunnelToScreen(side * 0.95, z);
            drips.push({
                x: p.x + (side === -1 ? -5 : 5),
                y: p.y - 20 - Math.random() * 30,
                vy: 0.5,
                life: 1,
                size: 1 + z * 2,
            });
        }
        for (let i = drips.length - 1; i >= 0; i--) {
            const d = drips[i];
            d.y += d.vy;
            d.vy += 0.15;
            d.life -= 0.02;
            if (d.life <= 0 || d.y > h) { drips.splice(i, 1); continue; }

            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size * d.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 130, 160, ${0.15 * d.life})`;
            ctx.fill();
        }
        if (drips.length > 20) drips.splice(0, 5);
    }

    // ===== AMBIENT SOUND =====
    let audioCtx = null;
    let audioStarted = false;

    function startAmbientSound() {
        if (audioStarted) return;
        audioStarted = true;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // Brown noise (cave water)
            const bufferSize = 2 * audioCtx.sampleRate;
            const buf = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buf.getChannelData(0);
            let last = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (last + 0.02 * white) / 1.02;
                last = data[i];
                data[i] *= 3.5;
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buf;
            noise.loop = true;

            const lpf = audioCtx.createBiquadFilter();
            lpf.type = 'lowpass';
            lpf.frequency.value = 220;

            const gain = audioCtx.createGain();
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(0.07, audioCtx.currentTime + 3);

            const delay = audioCtx.createDelay();
            delay.delayTime.value = 0.35;
            const delayGain = audioCtx.createGain();
            delayGain.gain.value = 0.12;

            noise.connect(lpf);
            lpf.connect(gain);
            gain.connect(audioCtx.destination);
            gain.connect(delay);
            delay.connect(delayGain);
            delayGain.connect(audioCtx.destination);
            noise.start();

            // Rumble
            function rumble() {
                if (!audioCtx) return;
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 18 + Math.random() * 12;
                const rg = audioCtx.createGain();
                rg.gain.value = 0;
                rg.gain.linearRampToValueAtTime(0.025, audioCtx.currentTime + 2);
                rg.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 5);
                osc.connect(rg);
                rg.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 5.5);
                setTimeout(rumble, 12000 + Math.random() * 20000);
            }
            setTimeout(rumble, 5000);

            // Drip
            function drip() {
                if (!audioCtx) return;
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 700 + Math.random() * 800;
                const dg = audioCtx.createGain();
                dg.gain.value = 0;
                dg.gain.linearRampToValueAtTime(0.018 + Math.random() * 0.012, audioCtx.currentTime + 0.01);
                dg.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.18);
                osc.connect(dg);
                dg.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.25);
                setTimeout(drip, 2500 + Math.random() * 7000);
            }
            setTimeout(drip, 1500);

            // Boat creak
            function creak() {
                if (!audioCtx) return;
                const osc = audioCtx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = 60 + Math.random() * 55;
                const bf = audioCtx.createBiquadFilter();
                bf.type = 'bandpass';
                bf.frequency.value = 320;
                bf.Q.value = 12;
                const cg = audioCtx.createGain();
                cg.gain.value = 0;
                cg.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                cg.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
                osc.connect(bf);
                bf.connect(cg);
                cg.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.7);
                setTimeout(creak, 18000 + Math.random() * 28000);
            }
            setTimeout(creak, 10000);

            // Torch crackle
            function crackle() {
                if (!audioCtx) return;
                const buf2 = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.12, audioCtx.sampleRate);
                const d2 = buf2.getChannelData(0);
                for (let i = 0; i < d2.length; i++) {
                    d2[i] = (Math.random() * 2 - 1) * (Math.random() < 0.25 ? 0.35 : 0.008);
                }
                const src = audioCtx.createBufferSource();
                src.buffer = buf2;
                const hpf = audioCtx.createBiquadFilter();
                hpf.type = 'highpass';
                hpf.frequency.value = 2200;
                const crg = audioCtx.createGain();
                crg.gain.value = 0.007;
                src.connect(hpf);
                hpf.connect(crg);
                crg.connect(audioCtx.destination);
                src.start();
                setTimeout(crackle, 3500 + Math.random() * 5500);
            }
            setTimeout(crackle, 2500);

        } catch (e) { }
    }

    document.addEventListener('click', startAmbientSound, { once: true });
    document.addEventListener('keydown', startAmbientSound, { once: true });
    setTimeout(startAmbientSound, 800);

    // ===== MAIN LOOP =====
    function animate() {
        time += 0.018 * speed;
        ctx.clearRect(0, 0, w, h);

        drawCeiling();
        drawTunnelEnd();
        drawWalls();
        drawWater();
        drawDebris();
        drawRipples();
        drawTorches();
        drawSmoke();
        drawEmbers();
        drawFog();
        updateDrips();
        drawWake();
        drawBoat();
        drawVignette();

        requestAnimationFrame(animate);
    }

    animate();

    window._stopBoatAudio = function () {
        if (audioCtx) {
            audioCtx.close().catch(() => { });
            audioCtx = null;
        }
    };
})();
