// ==================== MATRIX RAIN BACKGROUND ====================
// Subtle green falling code animation for secure-env background
// Starts only after the cinematic intro completes

(function () {
    const canvas = document.getElementById('boat-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h;
    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        initDrops();
    }

    const fontSize = 14;
    let cols, drops;

    function initDrops() {
        cols = Math.floor(w / fontSize);
        drops = Array.from({ length: cols }, () => Math.random() * h / fontSize);
    }

    window.addEventListener('resize', resize);
    resize();

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*{}[]|;:<>?/~`\u{FF8A}\u{FF90}\u{FF8B}\u{FF70}\u{FF73}\u{FF7C}\u{FF85}\u{FF93}\u{FF86}\u{FF7B}\u{FF9C}\u{FF82}\u{FF75}\u{FF98}\u{FF71}\u{FF8E}\u{FF83}\u{FF8F}\u{FF79}\u{FF92}\u{FF74}\u{FF76}\u{FF77}\u{FF91}\u{FF95}\u{FF97}\u{FF7E}\u{FF88}\u{FF7D}\u{FF80}\u{FF87}\u{FF8D}';

    function animate() {
        // Fade trail - faster fade for subtler look
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, w, h);

        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < cols; i++) {
            const ch = chars[Math.floor(Math.random() * chars.length)];
            const x = i * fontSize;
            const y = drops[i] * fontSize;

            // Head character - dimmed industrial green
            ctx.fillStyle = 'rgba(0, 150, 80, ' + (0.3 + Math.random() * 0.15) + ')';
            ctx.fillText(ch, x, y);

            // Trail character - subtle
            if (Math.random() > 0.55) {
                ctx.fillStyle = 'rgba(0, 100, 55, 0.14)';
                const ch2 = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(ch2, x, y - fontSize);
            }

            // Dim trail
            if (Math.random() > 0.75) {
                ctx.fillStyle = 'rgba(0, 70, 40, 0.07)';
                const ch3 = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(ch3, x, y - fontSize * 2);
            }

            // Reset drop to top
            if (y > h && Math.random() > 0.975) {
                drops[i] = 0;
            }
            // Slower speed
            drops[i] += 0.25 + Math.random() * 0.3;
        }

        requestAnimationFrame(animate);
    }

    // Initial black fill
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Delay rain start until intro sequence completes (~7s)
    setTimeout(animate, 7000);
})();
