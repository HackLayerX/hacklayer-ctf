// ==================== SECURE ENVIRONMENT BACKGROUND ====================
// Replaces the matrix rain. Static: painted once per resize rather than on a
// loop, so it costs nothing for the length of an event.
//
// The mark is  > [H] |  set the way it would be typed at a shell, with the
// product name ruled off underneath. The chevron, brackets and caret are
// stroked by hand and positioned from the letter's measured ink — a monospace
// glyph's advance box and its ink are not the same, and going by the advance
// box leaves the H visibly off-centre with the bracket arms crowding it.
//
// Colours are the app's own tokens from css/styles.css:
//   --bg #08080c   --bg-card #0e0e14   --accent #00e87b

(function () {
    const canvas = document.getElementById('boat-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const ACCENT = '0, 232, 123';
    const MONO = "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace";

    let w = 0, h = 0;
    let markAlpha = 0;   // ramped once after the cinematic intro clears

    function bracket(x, cy, half, arm, dir) {
        ctx.beginPath();
        ctx.moveTo(x + arm * dir, cy - half);
        ctx.lineTo(x, cy - half);
        ctx.lineTo(x, cy + half);
        ctx.lineTo(x + arm * dir, cy + half);
        ctx.stroke();
    }

    function drawBase() {
        const g = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.7);
        g.addColorStop(0, '#0e0e14');
        g.addColorStop(0.6, '#0a0a10');
        g.addColorStop(1, '#08080c');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    }

    function drawMark(a) {
        const s = Math.min(w, h);
        const cy = h * 0.44;

        ctx.font = '500 ' + (s * 0.250) + 'px ' + MONO;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        const m = ctx.measureText('H');
        const halfInkW = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 2;
        const halfInkH = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 2;
        const inkDX = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
        const inkDY = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;

        const clearance = s * 0.058;
        const armLen = s * 0.032;
        const spineX = halfInkW + clearance + armLen;
        const bHalf = halfInkH * 1.12;

        const chv = s * 0.030;
        const chevX = spineX + s * 0.078;
        const caretPad = s * 0.048;
        const caretW = s * 0.026;

        // Centre the run, not the letter: the chevron hangs further left than
        // the caret reaches right.
        const cx = w / 2 + (chevX - (spineX + caretPad + caretW)) / 2;

        ctx.lineWidth = Math.max(1.5, s * 0.0055);
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';

        ctx.strokeStyle = 'rgba(' + ACCENT + ',' + (0.24 * a).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(cx - chevX, cy - chv);
        ctx.lineTo(cx - chevX + chv * 0.85, cy);
        ctx.lineTo(cx - chevX, cy + chv);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(' + ACCENT + ',' + (0.17 * a).toFixed(3) + ')';
        bracket(cx - spineX, cy, bHalf, armLen, 1);
        bracket(cx + spineX, cy, bHalf, armLen, -1);

        ctx.fillStyle = 'rgba(' + ACCENT + ',' + (0.34 * a).toFixed(3) + ')';
        ctx.fillText('H', cx - inkDX, cy + inkDY);

        const bh = halfInkH * 1.20;
        ctx.fillStyle = 'rgba(' + ACCENT + ',' + (0.22 * a).toFixed(3) + ')';
        ctx.fillRect(cx + spineX + caretPad, cy - bh / 2, caretW, bh);

        // ----- name plate -----
        const ruleY = cy + bHalf + s * 0.105;
        const ruleW = s * 0.33;
        ctx.strokeStyle = 'rgba(' + ACCENT + ',' + (0.10 * a).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w / 2 - ruleW / 2, ruleY);
        ctx.lineTo(w / 2 + ruleW / 2, ruleY);
        ctx.stroke();

        // Canvas letterSpacing pads after the final glyph too, which drags
        // centred text left — add half of it back.
        const track = Math.max(5, s * 0.0115);
        ctx.font = '600 ' + Math.max(9, s * 0.0165) + 'px ' + MONO;
        ctx.letterSpacing = track + 'px';
        ctx.fillStyle = 'rgba(107, 107, 128,' + (0.62 * a).toFixed(3) + ')';
        ctx.fillText('HACKLAYER CTF', w / 2 + track / 2, ruleY + s * 0.040);
        ctx.letterSpacing = '0px';
    }

    function drawVignette() {
        const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);
    }

    function paint() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        drawBase();
        if (markAlpha > 0) drawMark(markAlpha);
        drawVignette();
    }

    window.addEventListener('resize', paint);
    paint();

    // The intro overlay sits centred on the same spot as the mark, so hold the
    // mark back until that has cleared, then ease it in once.
    setTimeout(function () {
        const start = performance.now();
        (function ramp(now) {
            markAlpha = Math.min(1, (now - start) / 1400);
            paint();
            if (markAlpha < 1) requestAnimationFrame(ramp);
        })(start);
    }, 7000);
})();
