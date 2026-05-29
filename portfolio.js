/* ==========================================================================
   FUTURISTIC CINEMATIC PORTFOLIO INTERACTION ENGINE
   Developer: Himanshu Chahar
   Features: Three.js WebGL Particle Void, GSAP Physics, Custom Cursor Dynamics
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- Performance Management & Diagnostic Counters ---
    let frameCount = 0;
    let lastTime = performance.now();
    let currentFps = 60;
    let particleCap = 1200; // Auto-scaling particle cap based on system performance
    let lowPerformanceMode = false;

    // --- HUD Diagnostic Systems ---
    const fpsIndicator = document.getElementById('hud-fps');
    const timeIndicator = document.getElementById('hud-time');
    const latIndicator = document.getElementById('hud-lat');
    const lngIndicator = document.getElementById('hud-lng');

    // Live HUD Clock (Cognitive System Hours)
    function updateHUDTime() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
        if (timeIndicator) {
            timeIndicator.textContent = `${hrs}:${mins}:${secs}.${ms}`;
        }
        requestAnimationFrame(updateHUDTime);
    }
    updateHUDTime();

    // Mouse-interactive GPS Coordinates Noise drift
    let targetLat = 28.6139;
    let targetLng = 77.2090;
    let currentLat = 28.6139;
    let currentLng = 77.2090;

    window.addEventListener('mousemove', (e) => {
        // Map viewport coordinate ratio to soft latitude/longitude shifts
        const dx = (e.clientX / window.innerWidth - 0.5);
        const dy = (e.clientY / window.innerHeight - 0.5);
        targetLat = 28.6139 + (dy * 0.05);
        targetLng = 77.2090 + (dx * 0.05);
    });

    function updateCoordinatesHUD() {
        currentLat += (targetLat - currentLat) * 0.1;
        currentLng += (targetLng - currentLng) * 0.1;
        if (latIndicator && lngIndicator) {
            latIndicator.textContent = currentLat.toFixed(5);
            lngIndicator.textContent = currentLng.toFixed(5);
        }
        setTimeout(updateCoordinatesHUD, 50);
    }
    updateCoordinatesHUD();


    // --- Custom Cursor & Canvas Particle Trail Overlay ---
    const overlayCanvas = document.getElementById('overlay-canvas');
    const overlayCtx = overlayCanvas.getContext('2d');
    const cursorAura = document.getElementById('cursor-aura');

    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let aura = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let isClicking = false;

    // Handle viewport resize for all canvases
    let width, height;
    function resizeCanvases() {
        width = window.innerWidth;
        height = window.innerHeight;
        overlayCanvas.width = width;
        overlayCanvas.height = height;
    }
    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();

    // Mouse Tracking
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mousedown', () => { isClicking = true; spawnShockwave(); });
    window.addEventListener('mouseup', () => { isClicking = false; });

    // Arrays to hold canvas animations
    const trailParticles = [];
    const shockwaves = [];

    class TrailParticle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = (Math.random() - 0.5) * 1.5;
            this.size = Math.random() * 2 + 1;
            this.alpha = 1;
            this.color = Math.random() < 0.5 ? '#00f0ff' : '#bd00ff';
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= 0.02;
            if (this.size > 0.1) this.size -= 0.02;
        }
        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class Shockwave {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = 1;
            this.maxRadius = Math.random() * 40 + 40;
            this.alpha = 1;
            this.color = '#00f0ff';
        }
        update() {
            this.radius += (this.maxRadius - this.radius) * 0.12;
            this.alpha = 1 - (this.radius / this.maxRadius);
        }
        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = this.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    function spawnShockwave() {
        if (!lowPerformanceMode) {
            shockwaves.push(new Shockwave(mouse.x, mouse.y));
        }
    }

    // --- Three.js 3D WebGL Void System ---
    const webglContainer = document.getElementById('webgl-canvas-container');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030307, 0.007);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 120;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    webglContainer.appendChild(renderer.domElement);

    // Dynamic lights
    const ambientLight = new THREE.AmbientLight(0x08081a, 1.2);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x00f0ff, 2.5, 300);
    cyanLight.position.set(50, 50, 50);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0xbd00ff, 2.5, 300);
    purpleLight.position.set(-50, -50, 50);
    scene.add(purpleLight);

    // Dynamic WebGL Starfield System with Mouse Repulsion Physics
    const particleCount = particleCap;
    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const starVelocities = [];
    const basePositions = []; // Store home positions for restoration physics

    for (let i = 0; i < particleCount * 3; i += 3) {
        const x = (Math.random() - 0.5) * 400;
        const y = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 200 - 50;

        positions[i] = x;
        positions[i+1] = y;
        positions[i+2] = z;

        basePositions.push({ x, y, z });

        starVelocities.push({
            x: (Math.random() - 0.5) * 0.05,
            y: (Math.random() - 0.5) * 0.05,
            z: (Math.random() - 0.5) * 0.05
        });
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom textured circular particle mapping
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 16;
    pCanvas.height = 16;
    const pCtx = pCanvas.getContext('2d');
    const grad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 16, 16);
    const pTexture = new THREE.CanvasTexture(pCanvas);

    const starMaterial = new THREE.PointsMaterial({
        size: 1.2,
        map: pTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.6,
        depthWrite: false
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // Central Floating 3D AI Core Wireframe
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Outer Torus Knot
    const torusGeo = new THREE.TorusKnotGeometry(25, 4, 100, 16);
    const torusMat = new THREE.MeshPhongMaterial({
        color: 0x00f0ff,
        emissive: 0x002c3a,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
        shininess: 80
    });
    const torusCore = new THREE.Mesh(torusGeo, torusMat);
    coreGroup.add(torusCore);

    // Inner Icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(12, 1);
    const icoMat = new THREE.MeshPhongMaterial({
        color: 0xbd00ff,
        emissive: 0x22003c,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
        shininess: 100
    });
    const icoCore = new THREE.Mesh(icoGeo, icoMat);
    coreGroup.add(icoCore);

    // --- WebGL Mouse Translation Coordinates Projection ---
    let normalizedMouse = { x: 0, y: 0 };
    window.addEventListener('mousemove', (e) => {
        normalizedMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        normalizedMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Unproject normalized mouse to 3D Space at a target Z distance
    function unprojectMousePos(targetZ) {
        const vec = new THREE.Vector3(normalizedMouse.x, normalizedMouse.y, 0.5);
        vec.unproject(camera);
        const dir = vec.sub(camera.position).normalize();
        const distance = (targetZ - camera.position.z) / dir.z;
        return camera.position.clone().add(dir.multiplyScalar(distance));
    }

    // Window Resize Observer for 3D Camera
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Scroll height tracking for Three.js interactions
    let scrollPercent = 0;
    window.addEventListener('scroll', () => {
        const st = window.scrollY;
        const sh = document.documentElement.scrollHeight - window.innerHeight;
        scrollPercent = sh > 0 ? (st / sh) : 0;
    });

    // --- Magnetic Hover Snapping & Hover Locks ---
    const magneticElements = document.querySelectorAll('.magnetic-hover');

    magneticElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (cursorAura) cursorAura.classList.add('cursor-hover');
        });
        el.addEventListener('mouseleave', () => {
            if (cursorAura) cursorAura.classList.remove('cursor-hover');
            gsap.to(el, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' });
        });

        // Magnetic displacement calculation on mousemove
        el.addEventListener('mousemove', (e) => {
            const bounds = el.getBoundingClientRect();
            const elCenterX = bounds.left + bounds.width / 2;
            const elCenterY = bounds.top + bounds.height / 2;

            const deltaX = e.clientX - elCenterX;
            const deltaY = e.clientY - elCenterY;

            // Pull element towards cursor slightly (magnetic capture)
            gsap.to(el, {
                x: deltaX * 0.35,
                y: deltaY * 0.35,
                scale: 1.05,
                duration: 0.3,
                ease: 'power2.out'
            });

            // Lock custom cursor aura closer to element boundary center
            aura.x += (elCenterX - aura.x) * 0.15;
            aura.y += (elCenterY - aura.y) * 0.15;
        });
    });


    // --- 3D Interactive Card Tilting Physics ---
    const interactiveCards = document.querySelectorAll('.interactive-card, #about-card, #about-skills, #contact-panel');

    interactiveCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // mouse position inside element
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Map distances to small rotation degrees (-10deg to 10deg)
            const rotateY = ((x - centerX) / centerX) * 8; 
            const rotateX = -((y - centerY) / centerY) * 8;

            gsap.to(card, {
                rotateX: rotateX,
                rotateY: rotateY,
                transformPerspective: 800,
                scale: 1.015,
                boxShadow: `0 25px 60px rgba(${rotateY > 0 ? '0, 240, 255' : '189, 0, 255'}, 0.08)`,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                boxShadow: '0 15px 45px rgba(0, 0, 0, 0.5)',
                duration: 0.6,
                ease: 'power3.out'
            });
        });
    });


    // --- Contact Form Portal Transmission Actions ---
    const contactForm = document.getElementById('portfolio-contact-form');
    const consoleResponse = document.getElementById('console-response-log');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Visual submit logs
            if (consoleResponse) {
                consoleResponse.classList.remove('hidden');
                
                // Animate console line items printing out
                const lines = consoleResponse.querySelectorAll('.console-line');
                lines.forEach((line, index) => {
                    line.style.opacity = '0';
                    gsap.to(line, {
                        opacity: 1,
                        duration: 0.3,
                        delay: index * 0.4,
                        onComplete: () => {
                            if (index === lines.length - 1) {
                                // Final packet transmission burst
                                for (let p = 0; p < 25; p++) {
                                    const pBtn = document.getElementById('btn-transmit');
                                    if (pBtn) {
                                        const bRect = pBtn.getBoundingClientRect();
                                        trailParticles.push(new TrailParticle(
                                            bRect.left + bRect.width / 2 + (Math.random() - 0.5) * 50,
                                            bRect.top + bRect.height / 2 + (Math.random() - 0.5) * 20
                                        ));
                                    }
                                }
                            }
                        }
                    });
                });
            }
        });
    }

    // --- Kinetic Title mouse translation hook ---
    const kineticLines = document.querySelectorAll('.kinetic-line');
    window.addEventListener('mousemove', (e) => {
        const xOffset = (e.clientX / window.innerWidth - 0.5) * 15;
        const yOffset = (e.clientY / window.innerHeight - 0.5) * 10;
        
        kineticLines.forEach((line, index) => {
            gsap.to(line, {
                x: xOffset * (index === 0 ? 0.75 : -0.75),
                y: yOffset * 0.5,
                duration: 0.4,
                ease: 'power2.out'
            });
        });
    });


    // --- Main Unified Animation Render Loop ---
    function renderLoop(time) {
        // --- 1. FPS Tracker Diagnostic ---
        frameCount++;
        if (time > lastTime + 1000) {
            currentFps = Math.round((frameCount * 1000) / (time - lastTime));
            if (fpsIndicator) {
                fpsIndicator.textContent = currentFps;
            }
            frameCount = 0;
            lastTime = time;

            // Performance fallback check
            if (currentFps < 45 && !lowPerformanceMode) {
                lowPerformanceMode = true;
                starMaterial.size = 2.0; // make remaining stars slightly chunkier
                starField.geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, 400 * 3), 3)); // halve particle load
            }
        }

        // --- 2. Custom Cursor Follower Physics ---
        const activeHover = document.querySelector('.magnetic-hover:hover');
        if (!activeHover) {
            // Standard inertial follow
            aura.x += (mouse.x - aura.x) * 0.12;
            aura.y += (mouse.y - aura.y) * 0.12;
        }
        
        if (cursorAura) {
            cursorAura.style.left = `${aura.x}px`;
            cursorAura.style.top = `${aura.y}px`;
        }

        // --- 3. 2D Particle trails generator ---
        if (!lowPerformanceMode && (Math.abs(mouse.x - aura.x) > 2 || Math.abs(mouse.y - aura.y) > 2)) {
            if (Math.random() < 0.4) {
                trailParticles.push(new TrailParticle(mouse.x, mouse.y));
            }
        }

        // Clean Canvas & redraw trails & shockwaves
        overlayCtx.clearRect(0, 0, width, height);
        overlayCtx.globalCompositeOperation = 'screen';

        for (let i = trailParticles.length - 1; i >= 0; i--) {
            const tp = trailParticles[i];
            tp.update();
            if (tp.alpha <= 0 || tp.size <= 0.1) {
                trailParticles.splice(i, 1);
            } else {
                tp.draw(overlayCtx);
            }
        }

        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.update();
            if (sw.alpha <= 0) {
                shockwaves.splice(i, 1);
            } else {
                sw.draw(overlayCtx);
            }
        }

        // --- 4. WebGL Starfield Particle Physics Update ---
        const starPosAttr = starField.geometry.attributes.position;
        const arr = starPosAttr.array;
        
        // Track projected mouse coordinate in 3D Space
        const mouse3D = unprojectMousePos(50); 
        const maxEffectedDistance = 45;

        const maxLoopCount = lowPerformanceMode ? 400 : particleCount;

        for (let i = 0; i < maxLoopCount; i++) {
            const idx = i * 3;
            let px = arr[idx];
            let py = arr[idx+1];
            let pz = arr[idx+2];

            // Base coordinates
            const base = basePositions[i];

            // Floating orbital drift
            base.z += starVelocities[i].z;
            if (base.z > 150) base.z = -200;

            // Calculate distance to mouse projected in 3D
            const dx = px - mouse3D.x;
            const dy = py - mouse3D.y;
            const dz = pz - mouse3D.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            let forceX = 0, forceY = 0, forceZ = 0;

            // Soft repulsion field
            if (dist < maxEffectedDistance) {
                const repellingForce = (maxEffectedDistance - dist) / maxEffectedDistance;
                forceX = (dx / dist) * repellingForce * 8.0;
                forceY = (dy / dist) * repellingForce * 8.0;
                forceZ = (dz / dist) * repellingForce * 8.0;
            }

            // Restoring elastic spring forces back to base path
            forceX += (base.x - px) * 0.03;
            forceY += (base.y - py) * 0.03;
            forceZ += (base.z - pz) * 0.03;

            // Apply displacement physics
            arr[idx] += forceX;
            arr[idx+1] += forceY;
            arr[idx+2] += forceZ;
        }
        starPosAttr.needsUpdate = true;

        // --- 5. 3D Rotating Core Orbit Physics ---
        // Rotate meshes
        torusCore.rotation.x += 0.003;
        torusCore.rotation.y += 0.004;
        
        icoCore.rotation.x -= 0.005;
        icoCore.rotation.y -= 0.002;

        // Position 3D core to float dynamically inside the layout based on scroll
        const scrollOffsetY = -scrollPercent * 60;
        coreGroup.position.y += (scrollOffsetY - coreGroup.position.y) * 0.1;
        coreGroup.position.x += (normalizedMouse.x * 20 - coreGroup.position.x) * 0.08;
        coreGroup.position.z += (-scrollPercent * 30 - coreGroup.position.z) * 0.1;

        // Volumetric lights orbit path
        const lightAngle = time * 0.0006;
        cyanLight.position.x = Math.cos(lightAngle) * 80;
        cyanLight.position.z = Math.sin(lightAngle) * 80;
        
        purpleLight.position.x = Math.sin(lightAngle * 0.8) * 80;
        purpleLight.position.y = Math.cos(lightAngle * 0.8) * 80;

        // --- 6. Render WebGL Frame ---
        renderer.render(scene, camera);

        requestAnimationFrame(renderLoop);
    }

    // Launch Unified Render Loop
    requestAnimationFrame(renderLoop);


    // --- GSAP Elements Entrance Timeline ---
    gsap.from('.hero-status-pill', { opacity: 0, y: -20, duration: 1, delay: 0.2, ease: 'power3.out' });
    gsap.from('.kinetic-line', {
        opacity: 0,
        y: 80,
        stagger: 0.15,
        duration: 1.2,
        delay: 0.4,
        ease: 'power4.out'
    });
    gsap.from('.hero-subtext', { opacity: 0, y: 15, duration: 1, delay: 0.9, ease: 'power3.out' });
    gsap.from('#hero-card', {
        opacity: 0,
        y: 60,
        rotationX: 30,
        duration: 1.5,
        delay: 1.1,
        ease: 'power3.out'
    });
    gsap.from('.app-navbar', { opacity: 0, y: -40, duration: 1, delay: 1.3, ease: 'power3.out' });
});
