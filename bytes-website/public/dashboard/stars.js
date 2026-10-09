// Login screen starfield (separate file: the Content-Security-Policy forbids inline scripts)
    (function () {
        const canvas = document.getElementById('login-stars-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let W = canvas.width  = window.innerWidth;
        let H = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            W = canvas.width  = window.innerWidth;
            H = canvas.height = window.innerHeight;
        });

        const NUM = 160;
        const stars = Array.from({ length: NUM }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.4 + 0.4,
            baseAlpha: Math.random() * 0.5 + 0.25,
            phase: Math.random() * Math.PI * 2,
            blinkSpeed: Math.random() * 0.018 + 0.008,
            dx: (Math.random() - 0.5) * 0.18,
            dy: (Math.random() - 0.5) * 0.18,
        }));

        let shot = { active: false, x: 0, y: 0, len: 0, spd: 0, opacity: 0, timer: 180 };

        function spawnShot() {
            shot.active  = true;
            shot.x       = Math.random() * (W * 0.6);
            shot.y       = Math.random() * (H * 0.5);
            shot.len     = Math.random() * 80 + 40;
            shot.spd     = Math.random() * 10 + 14;
            shot.opacity = 1;
            shot.timer   = Math.random() * 300 + 150;
        }

        const ANGLE = Math.PI / 4;

        function draw() {
            ctx.clearRect(0, 0, W, H);

            for (const s of stars) {
                s.x += s.dx; s.y += s.dy;
                if (s.x < 0) s.x = W; else if (s.x > W) s.x = 0;
                if (s.y < 0) s.y = H; else if (s.y > H) s.y = 0;
                s.phase += s.blinkSpeed;
                const a = Math.max(0, s.baseAlpha + Math.sin(s.phase) * 0.28);
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${a})`;
                ctx.fill();
            }

            if (shot.active) {
                shot.x += Math.cos(ANGLE) * shot.spd;
                shot.y += Math.sin(ANGLE) * shot.spd;
                shot.opacity -= 0.02;
                if (shot.opacity <= 0 || shot.x > W || shot.y > H) {
                    shot.active = false;
                } else {
                    const tx = shot.x - Math.cos(ANGLE) * shot.len;
                    const ty = shot.y - Math.sin(ANGLE) * shot.len;
                    const g  = ctx.createLinearGradient(shot.x, shot.y, tx, ty);
                    g.addColorStop(0, `rgba(255,255,255,${shot.opacity})`);
                    g.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.beginPath();
                    ctx.strokeStyle = g;
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.moveTo(shot.x, shot.y);
                    ctx.lineTo(tx, ty);
                    ctx.stroke();
                }
            } else {
                if (--shot.timer <= 0) spawnShot();
            }

            requestAnimationFrame(draw);
        }
        draw();
    })();
