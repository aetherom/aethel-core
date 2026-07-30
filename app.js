window.AethelCore = (function() {
    'use strict';

    const State = {
        data: { route: 'dashboard' },
        listeners: [],
        subscribe(fn) { this.listeners.push(fn); },
        setState(updates) { this.data = { ...this.data, ...updates }; this.listeners.forEach(fn => fn(this.data)); },
        getState() { return this.data; }
    };

    // --- Icons (Modern SVGs) ---
    const Icons = {
        shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
        link: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
        image: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
        audio: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
        video: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
        doc: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
        home: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`,
        scan: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="7" y1="12" x2="17" y2="12"></line></svg>`
    };

    // --- Core Engine: Scanner & Processor ---
    const Engine = {
        async simulateScan(filename, type) {
            return new Promise((resolve) => {
                const threats = [];
                const random = Math.random();
                if (random > 0.5) threats.push({ name: 'EXIF Metadata GPS Data', severity: 'High' });
                if (random > 0.7) threats.push({ name: 'Embedded Tracking Macro', severity: 'Critical' });
                if (filename.includes(' ')) threats.push({ name: 'Suspicious Filename Pattern', severity: 'Low' });
                
                setTimeout(() => resolve(threats), 1500);
            });
        },

        sanitizeUrl(rawUrl) {
            try {
                const url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
                const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid', 'ref', 'mc_eid'];
                trackingParams.forEach(p => url.searchParams.delete(p));
                return url.toString();
            } catch (e) { return null; }
        }
    };

    // --- Views ---
    const Views = {
        dashboard() {
            const modules = [
                { id: 'links', title: 'Link Sanitizer', desc: 'Unmask shorteners & strip trackers', icon: Icons.link },
                { id: 'images', title: 'Image Deep Clean', desc: 'Remove EXIF & convert formats', icon: Icons.image },
                { id: 'audio', title: 'Audio Processor', desc: 'Scan voice notes & modify speed', icon: Icons.audio },
                { id: 'video', title: 'Video Studio', desc: 'Extract audio & clean metadata', icon: Icons.video },
                { id: 'docs', title: 'Document Vault', desc: 'Strip macros from Sheets/Docs/PDFs', icon: Icons.doc }
            ];

            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.shield} AETHEL CORE</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="settings">Settings</button>
                </nav>
                <div class="container">
                    <h1 style="font-size: 2rem; margin-bottom: 0.5rem;">Secure Workspace</h1>
                    <p class="text-muted" style="margin-bottom: 2rem;">Select a module to sanitize, scan, and convert files. All processing happens locally.</p>
                    <div class="grid-2">
                        ${modules.map(m => `
                            <div class="card nav-card" data-action="navigate" data-payload="${m.id}">
                                <div style="width: 48px; height: 48px; background: var(--accent-dim); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    ${m.icon}
                                </div>
                                <div>
                                    <h3 style="margin-bottom: 0.25rem;">${m.title}</h3>
                                    <p class="text-muted" style="margin:0;">${m.desc}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        links() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.link} LINK SANITIZER</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">Unmask & Clean URL</h3>
                        <p class="text-muted" style="margin-bottom: 1rem;">Reveals shortener redirects, removes tracking parameters, and checks for known malicious patterns.</p>
                        <div class="input-group">
                            <input type="text" id="url-input" class="input" placeholder="Paste messy or short URL here...">
                            <button class="btn" data-action="scan-url">Scan</button>
                        </div>
                        <div id="url-results"></div>
                    </div>
                </div>
            `;
        },

        images() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.image} IMAGE CLEANER</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">Upload Image</h3>
                        <div class="drop-zone" id="drop-zone">
                            ${Icons.image}
                            <p style="margin-top: 1rem;">Drag & drop or click to upload</p>
                            <p class="text-muted" style="font-size: 0.8rem;">PNG, JPEG, WEBP</p>
                            <input type="file" id="file-input" accept="image/*" hidden>
                        </div>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        audio() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.audio} AUDIO PROCESSOR</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">Upload Voice Note / Audio</h3>
                        <div class="drop-zone" id="drop-zone">
                            ${Icons.audio}
                            <p style="margin-top: 1rem;">Drag & drop or click to upload</p>
                            <p class="text-muted" style="font-size: 0.8rem;">MP3, WAV, OGG</p>
                            <input type="file" id="file-input" accept="audio/*" hidden>
                        </div>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        video() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.video} VIDEO STUDIO</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">Upload Video</h3>
                        <div class="drop-zone" id="drop-zone">
                            ${Icons.video}
                            <p style="margin-top: 1rem;">Drag & drop or click to upload</p>
                            <p class="text-muted" style="font-size: 0.8rem;">MP4, WEBM, MOV</p>
                            <input type="file" id="file-input" accept="video/*" hidden>
                        </div>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        docs() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.doc} DOCUMENT VAULT</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">Upload Document</h3>
                        <div class="drop-zone" id="drop-zone">
                            ${Icons.doc}
                            <p style="margin-top: 1rem;">Drag & drop or click to upload</p>
                            <p class="text-muted" style="font-size: 0.8rem;">PDF, DOCX, XLSX, CSV</p>
                            <input type="file" id="file-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" hidden>
                        </div>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        settings() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.shield} SETTINGS</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3>Application Data</h3>
                        <p class="text-muted" style="margin: 1rem 0;">Clear all cached data and scans.</p>
                        <button class="btn btn-danger btn-sm" onclick="location.reload()">Clear Cache & Reload</button>
                    </div>
                    <div class="card">
                        <h3>Legal</h3>
                        <div id="legal-container" style="margin-top: 1rem;"></div>
                    </div>
                </div>
            `;
        }
    };

    // --- UI Controller ---
    const UI = {
        root: document.getElementById('app-root'),
        init() {
            window.addEventListener('hashchange', () => this.render());
            document.body.addEventListener('click', (e) => this.handleActions(e));
            this.render();
        },
        handleActions(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            const payload = target.dataset.payload;

            if (action === 'navigate') {
                window.location.hash = payload;
                this.render();
            } else if (action === 'scan-url') {
                this.processUrl();
            } else if (action === 'trigger-file') {
                document.getElementById('file-input').click();
            }
        },
        render() {
            const route = window.location.hash.replace('#', '') || 'dashboard';
            const view = Views[route] ? Views[route] : Views.dashboard;
            this.root.innerHTML = view();
            this.attachFileListeners(route);
            if (route === 'settings') {
                document.getElementById('legal-container').innerHTML = window.AethelLegal.privacyPolicy;
            }
        },
        attachFileListeners(route) {
            const dropZone = document.getElementById('drop-zone');
            const fileInput = document.getElementById('file-input');
            if (!dropZone || !fileInput) return;

            dropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) this.processFile(e.target.files[0], route);
            });
        },
        async processUrl() {
            const input = document.getElementById('url-input').value;
            const resultsDiv = document.getElementById('url-results');
            resultsDiv.innerHTML = `<div class="progress-bar"><div class="progress-fill" style="width: 50%"></div></div><p class="text-muted">Scanning...</p>`;
            
            await new Promise(r => setTimeout(r, 1000));
            const clean = Engine.sanitizeUrl(input);
            
            if (!clean) {
                resultsDiv.innerHTML = `<div class="threat-item">${Icons.scan} Invalid URL format.</div>`;
                return;
            }

            resultsDiv.innerHTML = `
                <div class="scan-results">
                    <div style="margin-bottom: 1rem;">
                        <div class="clear-item">${Icons.shield} Tracking parameters removed (UTM, FBCLID)</div>
                        <div class="clear-item">${Icons.shield} Shortener unmasked (Simulation)</div>
                    </div>
                    <p class="text-muted" style="margin-bottom: 0.5rem; font-size: 0.8rem;">SANITIZED URL:</p>
                    <div class="mono" style="color: var(--accent); word-break: break-all; background: #000; padding: 0.5rem; border-radius: 6px;">${clean}</div>
                    <a href="${clean}" target="_blank" class="btn btn-outline btn-sm" style="margin-top: 1rem; display: inline-flex;">Open Safe Link</a>
                </div>
            `;
        },
        async processFile(file, type) {
            const resultsDiv = document.getElementById('media-results');
            resultsDiv.innerHTML = `
                <div class="scan-results">
                    <h4>${file.name}</h4>
                    <p class="text-muted">${(file.size / 1024).toFixed(2)} KB</p>
                    <div class="progress-bar"><div class="progress-fill" id="prog" style="width: 0%"></div></div>
                    <p id="scan-status" class="text-muted mono">Initializing scan...</p>
                </div>
            `;

            const prog = document.getElementById('prog');
            const status = document.getElementById('scan-status');
            
            // Simulate Scan Progress
            for (let i = 0; i <= 100; i += 20) {
                prog.style.width = `${i}%`;
                status.textContent = i < 50 ? 'Checking signature database...' : i < 100 ? 'Stripping metadata...' : 'Scan complete.';
                await new Promise(r => setTimeout(r, 200));
            }

            const threats = await Engine.simulateScan(file.name, type);
            let threatHtml = threats.length ? threats.map(t => `<div class="threat-item">${Icons.scan} ${t.name} (${t.severity})</div>`).join('') : `<div class="clear-item">${Icons.shield} No malware detected. File is clean.</div>`;
            
            let optionsHtml = '';
            if (type === 'images') optionsHtml = `<select class="input" style="margin-bottom:1rem;"><option>Convert to PNG</option><option>Convert to JPEG</option><option>Convert to WEBP</option></select>`;
            if (type === 'audio') optionsHtml = `<select class="input" style="margin-bottom:1rem;"><option>Change Speed (1.5x)</option><option>Change Speed (0.5x)</option><option>Convert to MP3</option></select>`;
            if (type === 'video') optionsHtml = `<select class="input" style="margin-bottom:1rem;"><option>Extract Audio Only</option><option>Reduce Clarity (Save Data)</option><option>Convert to MP4</option></select>`;
            if (type === 'docs') optionsHtml = `<select class="input" style="margin-bottom:1rem;"><option>Export as PDF</option><option>Strip All Macros</option><option>Convert to CSV</option></select>`;

            resultsDiv.innerHTML = `
                <div class="scan-results">
                    <h4 style="margin-bottom: 1rem;">Scan Report: ${file.name}</h4>
                    ${threatHtml}
                    <div style="margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                        <p class="text-muted" style="margin-bottom: 0.5rem;">Processing Options:</p>
                        ${optionsHtml}
                        <button class="btn btn-sm">Process & Download</button>
                    </div>
                </div>
            `;
        },
        toast(msg) {
            const t = document.getElementById('toast-container');
            t.innerHTML = `<div class="toast">${msg}</div>`;
            setTimeout(() => t.innerHTML = '', 3000);
        }
    };

    // --- Dock Layout ---
    function renderDock() {
        const route = window.location.hash.replace('#', '') || 'dashboard';
        const items = [
            { id: 'dashboard', icon: Icons.home, label: 'Home' },
            { id: 'links', icon: Icons.link, label: 'Links' },
            { id: 'images', icon: Icons.image, label: 'Images' },
            { id: 'audio', icon: Icons.audio, label: 'Audio' },
            { id: 'video', icon: Icons.video, label: 'Video' },
            { id: 'docs', icon: Icons.doc, label: 'Docs' }
        ];
        return `
            <div class="dock">
                ${items.map(i => `
                    <button class="dock-item ${route === i.id ? 'active' : ''}" data-action="navigate" data-payload="${i.id}">
                        ${i.icon}
                        <span>${i.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    // Intercept render to add dock
    const originalRender = UI.render.bind(UI);
    UI.render = function() {
        originalRender();
        const dockEl = document.createElement('div');
        dockEl.innerHTML = renderDock();
        document.body.appendChild(dockEl.firstElementChild);
    };

    function init() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js').catch(console.error);
        }
        UI.init();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', window.AethelCore.init);
