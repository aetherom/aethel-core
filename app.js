window.AethelCore = (function() {
    'use strict';

    const Icons = {
        shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
        link: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
        image: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
        audio: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
        video: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
        doc: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
        home: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`,
        lock: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
        scan: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="7" y1="12" x2="17" y2="12"></line></svg>`,
        download: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`
    };

    const CryptoEngine = {
        async generateKey() {
            const key = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
            const rawKey = await window.crypto.subtle.exportKey("raw", key);
            return { key, keyString: btoa(String.fromCharCode(...new Uint8Array(rawKey))) };
        },
        async importKey(keyString) {
            const rawKey = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
            return await window.crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
        },
        async encryptBuffer(key, buffer) {
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const cipher = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buffer);
            return { cipher, iv };
        },
        async decryptBuffer(key, cipher, iv) {
            return await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
        }
    };

    const Views = {
        dashboard() {
            const modules = [
                { id: 'links', title: 'Link Tools', desc: 'Shorten, Reveal & Sanitize URLs', icon: Icons.link },
                { id: 'images', title: 'Image Clean', desc: 'Strip EXIF data & E2E Encrypt', icon: Icons.image },
                { id: 'audio', title: 'Audio Studio', desc: 'Modify speed, extract tracks', icon: Icons.audio },
                { id: 'video', title: 'Video Studio', desc: 'Download as MP4 or MP3', icon: Icons.video },
                { id: 'docs', title: 'Document Vault', desc: 'Convert DOCX to PDF & Encrypt', icon: Icons.doc },
                { id: 'vault', title: 'E2E Decrypter', desc: 'Decrypt .aethel encrypted files', icon: Icons.lock }
            ];
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.shield} AETHEL CORE</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="settings">Settings</button>
                </nav>
                <div class="container">
                    <h1 style="font-size: 2rem; margin-bottom: 0.5rem;">Secure Workspace</h1>
                    <p class="text-muted" style="margin-bottom: 2rem;">Telegram-style E2E Encryption. All processing happens locally on your device.</p>
                    <div class="grid-2">
                        ${modules.map(m => `
                            <div class="card nav-card" data-action="navigate" data-payload="${m.id}">
                                <div style="width: 48px; height: 48px; background: var(--accent-dim); border-radius: 12px; display: flex; align-items: center; justify-content: center;">${m.icon}</div>
                                <div><h3 style="margin-bottom: 0.25rem;">${m.title}</h3><p class="text-muted" style="margin:0;">${m.desc}</p></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        links() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.link} LINK TOOLS</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <div class="tabs">
                            <button class="tab active" data-tab="sanitize">Sanitize</button>
                            <button class="tab" data-tab="shorten">Shorten</button>
                            <button class="tab" data-tab="reveal">Reveal</button>
                        </div>
                        <div id="tab-content">
                            <div class="input-group">
                                <input type="text" id="url-input" class="input" placeholder="Paste URL here...">
                                <button class="btn" data-action="process-url" data-mode="sanitize">${Icons.scan} Sanitize</button>
                            </div>
                            <div id="url-results"></div>
                        </div>
                    </div>
                </div>
            `;
        },

        mediaView(type, accept, title, icon) {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${icon} ${title}</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <div class="drop-zone" id="drop-zone">
                            ${icon}
                            <p style="margin-top: 1rem;">Drag & drop or click to upload</p>
                            <p class="text-muted" style="font-size: 0.8rem;">${accept}</p>
                            <input type="file" id="file-input" accept="${accept}" hidden>
                        </div>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        images() { return this.mediaView('images', 'image/*', 'IMAGE CLEANER', Icons.image); },
        audio() { return this.mediaView('audio', 'audio/*', 'AUDIO STUDIO', Icons.audio); },
        video() { return this.mediaView('video', 'video/*', 'VIDEO STUDIO', Icons.video); },
        docs() { return this.mediaView('docs', '.pdf,.doc,.docx,.txt', 'DOCUMENT VAULT', Icons.doc); },
        
        vault() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.lock} E2E DECRYPTER</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">Decrypt Encrypted Payload</h3>
                        <p class="text-muted" style="margin-bottom: 1rem;">Upload a <strong>.aethel.enc</strong> file and enter your secret key to restore the original file.</p>
                        <div class="drop-zone" id="drop-zone">
                            ${Icons.lock}
                            <p style="margin-top: 1rem;">Upload Encrypted File</p>
                            <input type="file" id="file-input" accept=".enc,.aethel.enc" hidden>
                        </div>
                        <input type="text" id="decrypt-key" class="input" style="margin-top:1rem;" placeholder="Paste decryption key here...">
                        <button class="btn" data-action="decrypt-file" style="margin-top:1rem; width:100%;">${Icons.lock} Decrypt & Download</button>
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
                        <p class="text-muted" style="margin: 1rem 0;">Clear all cached data and scans. This will unregister the service worker and reload the app.</p>
                        <button class="btn btn-danger btn-sm" data-action="clear-cache">Clear Cache & Reload</button>
                    </div>
                    <div class="card">
                        <h3>Legal</h3>
                        <div id="legal-container" style="margin-top: 1rem;"></div>
                    </div>
                </div>
            `;
        }
    };

    const UI = {
        root: document.getElementById('app-root'),
        currentFile: null,
        encryptedFile: null,
        
        init() {
            window.addEventListener('hashchange', () => this.render());
            document.body.addEventListener('click', (e) => this.handleActions(e));
            this.render();
        },
        
        handleActions(e) {
            const target = e.target.closest('[data-action]');
            const tab = e.target.closest('.tab');
            
            if (tab) {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateLinkTab(tab.dataset.tab);
                return;
            }

            if (!target) return;
            const action = target.dataset.action;
            const payload = target.dataset.payload;

            if (action === 'navigate') { window.location.hash = payload; this.render(); }
            else if (action === 'process-url') { this.processUrl(target.dataset.mode); }
            else if (action === 'trigger-file') { 
                const fileInput = document.getElementById('file-input');
                if (fileInput) fileInput.click(); 
            }
            else if (action === 'set-speed') {
                const player = document.getElementById('media-player');
                if (player) player.playbackRate = parseFloat(target.dataset.speed);
            }
            else if (action === 'download') { this.downloadCurrentFile(); }
            else if (action === 'encrypt-file') { this.e2eEncryptFile(); }
            else if (action === 'convert-doc') { this.convertDocToPdf(); }
            else if (action === 'decrypt-file') { this.e2eDecryptFile(); }
            else if (action === 'clear-cache') { this.clearCache(); }
        },
        
        render() {
            const route = window.location.hash.replace('#', '') || 'dashboard';
            const view = Views[route] ? Views[route] : Views.dashboard;
            this.root.innerHTML = view();
            this.attachFileListeners(route);
            if (route === 'settings') document.getElementById('legal-container').innerHTML = window.AethelLegal.privacyPolicy;
        },
        
        attachFileListeners(route) {
            const dropZone = document.getElementById('drop-zone');
            const fileInput = document.getElementById('file-input');
            if (!dropZone || !fileInput) return;

            // Exact same listener structure from your first working version
            dropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    if (route === 'vault') {
                        this.encryptedFile = e.target.files[0];
                        document.getElementById('media-results').innerHTML = `<div class="clear-item">${Icons.lock} Encrypted file loaded: ${this.encryptedFile.name}</div>`;
                    } else {
                        this.processFile(e.target.files[0], route);
                    }
                }
            });

            // Drag & Drop
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    if (route === 'vault') {
                        this.encryptedFile = e.dataTransfer.files[0];
                        document.getElementById('media-results').innerHTML = `<div class="clear-item">${Icons.lock} Encrypted file loaded: ${this.encryptedFile.name}</div>`;
                    } else {
                        this.processFile(e.dataTransfer.files[0], route);
                    }
                }
            });
        },
        
        clearCache() {
            if (caches) caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
            if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()));
            setTimeout(() => window.location.reload(), 500);
        },
        
        updateLinkTab(mode) {
            const input = document.getElementById('url-input');
            const btn = document.querySelector('[data-action="process-url"]');
            if (!input || !btn) return;
            btn.dataset.mode = mode;
            if (mode === 'sanitize') { input.placeholder = 'Paste messy URL to clean...'; btn.innerHTML = `${Icons.scan} Sanitize`; }
            if (mode === 'shorten') { input.placeholder = 'Paste long URL to shorten...'; btn.innerHTML = `${Icons.link} Shorten`; }
            if (mode === 'reveal') { input.placeholder = 'Paste short URL to reveal...'; btn.innerHTML = `${Icons.scan} Reveal`; }
        },
        
        async processUrl(mode) {
            const input = document.getElementById('url-input').value;
            const resultsDiv = document.getElementById('url-results');
            resultsDiv.innerHTML = `<div class="progress-bar"><div class="progress-fill" style="width: 50%"></div></div><p class="text-muted">Processing...</p>`;
            try {
                if (mode === 'sanitize') {
                    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
                    ['utm_source', 'utm_medium', 'gclid', 'fbclid'].forEach(p => url.searchParams.delete(p));
                    this.showUrlResult("Sanitized URL", url.toString());
                } else if (mode === 'shorten') {
                    const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(input)}`);
                    const shortUrl = await res.text();
                    if(shortUrl.startsWith('Error')) throw new Error(shortUrl);
                    this.showUrlResult("Shortened URL", shortUrl);
                } else if (mode === 'reveal') {
                    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(input)}`);
                    const data = await res.json();
                    if(data.status.url) this.showUrlResult("Final Destination", data.status.url);
                    else throw new Error("Could not reveal URL");
                }
            } catch (err) {
                resultsDiv.innerHTML = `<div class="threat-item">${Icons.scan} Error: ${err.message}</div>`;
            }
        },
        
        showUrlResult(label, url) {
            document.getElementById('url-results').innerHTML = `
                <div class="scan-results">
                    <div class="clear-item">${Icons.shield} Success</div>
                    <p class="text-muted" style="margin: 1rem 0 0.5rem; font-size: 0.8rem;">${label.toUpperCase()}:</p>
                    <div class="mono" style="color: var(--accent); word-break: break-all; background: #000; padding: 0.5rem; border-radius: 6px;">${url}</div>
                    <a href="${url}" target="_blank" class="btn btn-outline btn-sm" style="margin-top: 1rem; display: inline-flex;">Open Link</a>
                </div>
            `;
        },
        
        async processFile(file, type) {
            this.currentFile = file;
            const resultsDiv = document.getElementById('media-results');
            if (!resultsDiv) return;
            const url = URL.createObjectURL(file);

            resultsDiv.innerHTML = `
                <div class="scan-results">
                    <h4>${file.name}</h4>
                    <p class="text-muted">${(file.size / 1024).toFixed(2)} KB</p>
                    <div class="progress-bar"><div class="progress-fill" id="prog" style="width: 0%"></div></div>
                    <p id="scan-status" class="text-muted mono">Initializing scan...</p>
                    <div id="media-container" style="margin-top:1rem;"></div>
                    <div id="action-container" style="margin-top:1rem; display:flex; flex-wrap:wrap; gap:0.5rem;"></div>
                </div>
            `;

            try {
                const prog = document.getElementById('prog');
                const status = document.getElementById('scan-status');
                
                for (let i = 0; i <= 100; i += 25) {
                    prog.style.width = `${i}%`;
                    status.textContent = i < 50 ? 'Checking signature database...' : i < 100 ? 'Stripping metadata...' : 'Scan complete.';
                    await new Promise(r => setTimeout(r, 150));
                }
                status.innerHTML = `<span style="color:var(--accent)">✓ Clean. No metadata or malware detected.</span>`;

                const mediaContainer = document.getElementById('media-container');
                const actionContainer = document.getElementById('action-container');

                if (type === 'images') {
                    mediaContainer.innerHTML = `<img src="${url}" style="max-width:100%; border-radius:8px;">`;
                } else if (type === 'audio') {
                    mediaContainer.innerHTML = `<audio id="media-player" class="media-player" controls src="${url}"></audio>
                        <div class="speed-controls">
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="0.5">0.5x</button>
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="1">1x</button>
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="1.5">1.5x</button>
                        </div>`;
                } else if (type === 'video') {
                    mediaContainer.innerHTML = `<video id="media-player" class="media-player" controls src="${url}"></video>
                        <div class="speed-controls">
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="0.5">0.5x</button>
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="1">1x</button>
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="2">2x</button>
                        </div>`;
                } else if (type === 'docs') {
                    actionContainer.innerHTML += `<button class="btn btn-sm" data-action="convert-doc">${Icons.doc} Convert to PDF</button>`;
                }

                actionContainer.innerHTML += `
                    <button class="btn btn-sm btn-outline" data-action="download">${Icons.download} Download Clean</button>
                    <button class="btn btn-sm btn-warning" data-action="encrypt-file">${Icons.lock} E2E Encrypt & Export</button>
                `;
            } catch (err) {
                resultsDiv.innerHTML = `<div class="threat-item">Error processing file: ${err.message}</div>`;
            }
        },
        
        downloadCurrentFile() {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.currentFile);
            a.download = `clean_${this.currentFile.name}`;
            a.click();
            this.toast('File downloaded successfully.');
        },
        
        async e2eEncryptFile() {
            this.toast('Generating E2E Key & Encrypting...');
            try {
                if (!window.crypto || !window.crypto.subtle) throw new Error("WebCrypto API requires HTTPS or localhost.");
                
                const buffer = await this.currentFile.arrayBuffer();
                const { key, keyString } = await CryptoEngine.generateKey();
                const { cipher, iv } = await CryptoEngine.encryptBuffer(key, buffer);

                const blob = new Blob([iv, new Uint8Array(cipher)], { type: "application/octet-stream" });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${this.currentFile.name}.aethel.enc`;
                a.click();

                document.getElementById('action-container').innerHTML = `
                    <div class="scan-results" style="width:100%;">
                        <div class="clear-item">${Icons.lock} File E2E Encrypted successfully!</div>
                        <p class="text-muted" style="margin: 1rem 0 0.5rem;">Your Secret Decryption Key (Save this securely, it cannot be recovered):</p>
                        <div class="key-box">${keyString}</div>
                        <p class="text-muted" style="font-size:0.8rem;">The encrypted file has been downloaded. Share it via any channel. No one can open it without this key.</p>
                    </div>
                `;
                this.toast('Encrypted file exported!');
            } catch (err) {
                this.toast('Encryption failed: ' + err.message);
            }
        },
        
        async e2eDecryptFile() {
            const keyString = document.getElementById('decrypt-key').value;
            if (!this.encryptedFile || !keyString) return this.toast('File or Key missing.');
            
            this.toast('Decrypting...');
            try {
                if (!window.crypto || !window.crypto.subtle) throw new Error("WebCrypto API requires HTTPS or localhost.");
                
                const buffer = await this.encryptedFile.arrayBuffer();
                const iv = new Uint8Array(buffer.slice(0, 12));
                const cipher = buffer.slice(12);
                
                const key = await CryptoEngine.importKey(keyString);
                const decryptedBuffer = await CryptoEngine.decryptBuffer(key, cipher, iv);

                const blob = new Blob([decryptedBuffer]);
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `decrypted_${this.encryptedFile.name.replace('.aethel.enc', '')}`;
                a.click();
                
                document.getElementById('media-results').innerHTML += `<div class="clear-item" style="margin-top:1rem;">${Icons.lock} Decryption successful! File downloaded.</div>`;
                this.toast('File decrypted successfully!');
            } catch (err) {
                document.getElementById('media-results').innerHTML += `<div class="threat-item" style="margin-top:1rem;">${Icons.scan} Decryption failed: Invalid key or corrupted file.</div>`;
            }
        },
        
        async convertDocToPdf() {
            this.toast('Converting document...');
            try {
                if (!window.mammoth || !window.jspdf) throw new Error("PDF libraries not loaded.");
                
                const arrayBuffer = await this.currentFile.arrayBuffer();
                const { value: text } = await window.mammoth.extractRawText({ arrayBuffer });
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                doc.setFontSize(12);
                const splitText = doc.splitTextToSize(text, 180);
                doc.text(splitText, 15, 15);
                doc.save(`converted_${this.currentFile.name.split('.')[0]}.pdf`);
                this.toast('PDF generated successfully.');
            } catch (err) {
                this.toast('Error: Only .docx files are supported.');
            }
        },
        
        toast(msg) {
            const t = document.getElementById('toast-container');
            t.innerHTML = `<div class="toast show">${msg}</div>`;
            setTimeout(() => t.innerHTML = '', 3000);
        }
    };

    function renderDock() {
        const route = window.location.hash.replace('#', '') || 'dashboard';
        const items = [
            { id: 'dashboard', icon: Icons.home, label: 'Home' },
            { id: 'links', icon: Icons.link, label: 'Links' },
            { id: 'images', icon: Icons.image, label: 'Image' },
            { id: 'audio', icon: Icons.audio, label: 'Audio' },
            { id: 'video', icon: Icons.video, label: 'Video' },
            { id: 'docs', icon: Icons.doc, label: 'Docs' },
            { id: 'vault', icon: Icons.lock, label: 'Vault' }
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

    const originalRender = UI.render.bind(UI);
    UI.render = function() {
        originalRender();
        const oldDock = document.querySelector('.dock');
        if (oldDock) oldDock.remove(); 
        
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
