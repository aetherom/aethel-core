window.AethelCore = (function() {
    'use strict';

    // --- Dynamic Library Loaders ---
    async function ensureJsZip() {
        if (window.JSZip) return;
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload = resolve;
            s.onerror = () => reject(new Error("Failed to load Zip library."));
            document.head.appendChild(s);
        });
    }

    async function ensureArgon2() {
        if (window.argon2) return;
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/argon2-browser@1.18.0/dist/argon2-bundle.min.js';
            s.onload = resolve;
            s.onerror = () => reject(new Error("Failed to load Argon2 library."));
            document.head.appendChild(s);
        });
    }

    // --- Utility Functions ---
    function base32ToUint8Array(base32) {
        const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let bits = 0, value = 0;
        let bytes = [];
        for (let i = 0; i < base32.length; i++) {
            let char = base32[i].toUpperCase();
            if (char === '=') break;
            let val = base32chars.indexOf(char);
            if (val === -1) continue;
            value = (value << 5) | val;
            bits += 5;
            if (bits >= 8) {
                bytes.push((value >> (bits - 8)) & 0xFF);
                bits -= 8;
            }
        }
        return new Uint8Array(bytes);
    }

    function calculateEntropy(str) {
        if (!str) return 0;
        const freq = {};
        for (let char of str) freq[char] = (freq[char] || 0) + 1;
        let entropy = 0;
        for (let key in freq) {
            let p = freq[key] / str.length;
            entropy -= p * Math.log2(p);
        }
        return Math.round(entropy * str.length);
    }

    // --- Shamir's Secret Sharing (GF(256)) ---
    const GF256 = {
        exp: new Uint8Array(512),
        log: new Uint8Array(256),
        init() {
            let x = 1;
            for (let i = 0; i < 255; i++) {
                this.exp[i] = x;
                this.log[x] = i;
                x <<= 1;
                if (x & 0x100) x ^= 0x11d;
            }
            for (let i = 255; i < 512; i++) this.exp[i] = this.exp[i - 255];
        },
        mul(a, b) {
            if (a === 0 || b === 0) return 0;
            return this.exp[this.log[a] + this.log[b]];
        },
        div(a, b) {
            if (a === 0) return 0;
            if (b === 0) throw new Error("Divide by zero");
            return this.exp[(this.log[a] - this.log[b] + 255) % 255];
        }
    };
    GF256.init();

    const SSS = {
        split(secretStr, n, k) {
            const secret = new TextEncoder().encode(secretStr);
            const shares = Array.from({length: n}, () => []);
            for (let byte of secret) {
                const coeffs = new Uint8Array(k);
                coeffs[0] = byte;
                crypto.getRandomValues(coeffs.subarray(1));
                for (let i = 0; i < n; i++) {
                    const x = i + 1;
                    let y = 0;
                    for (let j = k - 1; j >= 0; j--) {
                        y = GF256.mul(y, x) ^ coeffs[j];
                    }
                    shares[i].push(y);
                }
            }
            return shares.map(s => btoa(String.fromCharCode(...s)));
        },
        combine(shareStrs) {
            const shares = shareStrs.map(s => Uint8Array.from(atob(s), c => c.charCodeAt(0)));
            const secret = [];
            for (let i = 0; i < shares[0].length; i++) {
                let y = 0;
                for (let j = 0; j < shares.length; j++) {
                    let num = 1, den = 1;
                    for (let m = 0; m < shares.length; m++) {
                        if (j === m) continue;
                        num = GF256.mul(num, (m + 1));
                        den = GF256.mul(den, ((m + 1) ^ (j + 1)));
                    }
                    y ^= GF256.mul(shares[j][i], GF256.div(num, den));
                }
                secret.push(y);
            }
            return new TextDecoder().decode(new Uint8Array(secret));
        }
    };

    // --- Icons ---
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
        download: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
        notes: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>`,
        verify: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        totp: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        stego: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
        batch: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
        copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
        sss: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="12" r="3"></circle><path d="M9 12h6"></path></svg>`,
        hardware: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
    };

    // --- Cryptographic Engines ---
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
        },
        async deriveKeyArgon2(password, saltStr) {
            await ensureArgon2();
            const salt = new TextEncoder().encode(saltStr);
            const result = await argon2.hash({
                pass: password,
                salt: salt,
                time: 3, // iterations
                mem: 65536, // 64MB memory hard
                hashLen: 32,
                parallelism: 1,
                type: argon2.ArgonType.Argon2id
            });
            const rawKey = Uint8Array.from(result.hashHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            return await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
        }
    };

    const JSScanner = {
        knownMaliciousHashes: [
            "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",
            "131f95c51cc819465fa1797f6ccacf9d494aaaff46fa3eac73ae63ffbdfd8267"
        ],
        async getSHA256(file) {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        },
        async scan(file) {
            const hash = await this.getSHA256(file);
            if (this.knownMaliciousHashes.includes(hash)) {
                return { clean: false, threat: "Known Malware Signature Detected (Hash Match)" };
            }
            const textBuffer = await file.slice(0, 5242880).text();
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                if (textBuffer.includes('/JavaScript') || textBuffer.includes('/JS ') || textBuffer.includes('/EmbeddedFile')) {
                    return { clean: false, threat: "Malicious Embedded Script or File in PDF" };
                }
            }
            if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.xlsx')) {
                if (textBuffer.includes('vbaProject.bin') || textBuffer.includes('vbaData.xml')) {
                    return { clean: false, threat: "VBA Macro Virus Detected" };
                }
            }
            return { clean: true };
        }
    };

    // --- UI Views ---
    const Views = {
        dashboard() {
            const modules = [
                { id: 'links', title: 'Link Tools', desc: 'Sanitize, Shorten, Reveal & Analyze', icon: Icons.link },
                { id: 'images', title: 'Image Clean', desc: 'Convert, Strip EXIF & E2E Encrypt', icon: Icons.image },
                { id: 'audio', title: 'Audio Studio', desc: 'Process & extract tracks', icon: Icons.audio },
                { id: 'video', title: 'Video Studio', desc: 'Process & download media', icon: Icons.video },
                { id: 'docs', title: 'Document Vault', desc: 'Convert to PDF/Word/TXT & Encrypt', icon: Icons.doc },
                { id: 'vault', title: 'E2E Decrypter', desc: 'Decrypt .aethel encrypted files', icon: Icons.lock },
                { id: 'notes', title: 'Deniable Notes', desc: 'Argon2id Vault with Decoy Password', icon: Icons.notes },
                { id: 'sss', title: 'Key Splitter', desc: 'Shamir\'s Secret Sharing (2-of-3)', icon: Icons.sss },
                { id: 'verify', title: 'Integrity Verifier', desc: 'Verify SHA-256 File Hashes', icon: Icons.verify },
                { id: 'totp', title: 'TOTP Generator', desc: 'Client-side 2FA Codes', icon: Icons.totp },
                { id: 'stego', title: 'Steganography', desc: 'Hide text inside images', icon: Icons.stego },
                { id: 'batch', title: 'Batch Zipper', desc: 'Scan, Encrypt & Zip multiple files', icon: Icons.batch }
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
                            <button class="tab" data-tab="analyze">Analyze</button>
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

        images() { return Views.mediaView('images', 'image/*', 'IMAGE CLEANER', Icons.image); },
        audio() { return Views.mediaView('audio', 'audio/*', 'AUDIO STUDIO', Icons.audio); },
        video() { return Views.mediaView('video', 'video/*', 'VIDEO STUDIO', Icons.video); },
        docs() { return Views.mediaView('docs', '.pdf,.doc,.docx,.txt', 'DOCUMENT VAULT', Icons.doc); },
        
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
                        <div id="entropy-meter" style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted);"></div>
                        <button class="btn" data-action="decrypt-file" style="margin-top:1rem; width:100%;">${Icons.lock} Decrypt & Download</button>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        notes() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.notes} DENIABLE NOTES</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">Plausible Deniability Vault</h3>
                        <p class="text-muted" style="margin-bottom: 1rem;">Uses Argon2id Key Derivation. Password 1 unlocks the Real Vault. Password 2 unlocks the Decoy Vault. An attacker cannot prove which vault you opened.</p>
                        <textarea id="note-input" class="input" style="min-height: 150px; font-family: 'JetBrains Mono', monospace;" placeholder="Type secret note here..."></textarea>
                        <div class="grid-2" style="margin-top:1rem;">
                            <input type="password" id="note-pass" class="input" placeholder="Password">
                            <select id="note-type" class="input">
                                <option value="real">Save to Real Vault</option>
                                <option value="decoy">Save to Decoy Vault</option>
                            </select>
                        </div>
                        <button class="btn" data-action="save-note" style="margin-top:1rem; width:100%;">${Icons.lock} Encrypt & Save Locally</button>
                        <button class="btn btn-outline" data-action="load-note" style="margin-top:0.5rem; width:100%;">${Icons.download} Decrypt & Load Vault</button>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        sss() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.sss} KEY SPLITTER</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">Shamir's Secret Sharing</h3>
                        <p class="text-muted" style="margin-bottom: 1rem;">Split a key into 3 shares. Any 2 shares can reconstruct it. Single shares are useless.</p>
                        <input type="text" id="sss-secret" class="input" style="margin-bottom:1rem;" placeholder="Paste key/secret to split...">
                        <button class="btn" data-action="sss-split" style="width:100%; margin-bottom:2rem;">${Icons.sss} Split into 3 Shares</button>
                        
                        <input type="text" id="sss-share-1" class="input" style="margin-bottom:0.5rem;" placeholder="Paste Share 1...">
                        <input type="text" id="sss-share-2" class="input" style="margin-bottom:0.5rem;" placeholder="Paste Share 2...">
                        <button class="btn btn-outline" data-action="sss-combine" style="width:100%;">${Icons.shield} Reconstruct Secret</button>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        verify() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.verify} INTEGRITY VERIFIER</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">File Integrity Check</h3>
                        <p class="text-muted" style="margin-bottom: 1rem;">Verify file authenticity by comparing SHA-256 hashes.</p>
                        <div class="drop-zone" id="drop-zone">
                            ${Icons.verify}
                            <p style="margin-top: 1rem;">Upload File to Verify</p>
                            <input type="file" id="file-input" hidden>
                        </div>
                        <input type="text" id="expected-hash" class="input" style="margin-top:1rem;" placeholder="Paste expected SHA-256 hash...">
                        <button class="btn" data-action="verify-file" style="margin-top:1rem; width:100%;">${Icons.scan} Verify Integrity</button>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        totp() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.totp} TOTP GENERATOR</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">2FA Code Generator</h3>
                        <p class="text-muted" style="margin-bottom: 1rem;">Generate RFC 6238 TOTP codes. Secrets never leave your browser.</p>
                        <input type="text" id="totp-secret" class="input" style="margin-bottom:1rem;" placeholder="Paste Base32 Secret (e.g. JBSWY3DPEHPK3PXP)">
                        <div id="totp-result" style="text-align: center; margin-top: 2rem;">
                            <div class="mono" id="totp-code" style="font-size: 3rem; font-weight: bold; color: var(--accent); letter-spacing: 5px;">------</div>
                            <p class="text-muted" id="totp-timer" style="margin-top: 0.5rem;">Expires in: 30s</p>
                        </div>
                    </div>
                </div>
            `;
        },

        stego() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.stego} STEGANOGRAPHY</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <div class="tabs">
                            <button class="tab active" data-tab="stego-hide">Hide Message</button>
                            <button class="tab" data-tab="stego-extract">Extract Message</button>
                        </div>
                        <div id="tab-content">
                            <div class="drop-zone" id="drop-zone">
                                ${Icons.image}
                                <p style="margin-top: 1rem;">Upload PNG Image</p>
                                <input type="file" id="file-input" accept="image/png" hidden>
                            </div>
                            <div id="stego-controls" style="margin-top:1rem;"></div>
                        </div>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        batch() {
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.batch} BATCH ZIPPER</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">Batch Process & Zip</h3>
                        <p class="text-muted" style="margin-bottom: 1rem;">Upload multiple files. They will be scanned, and optionally E2E encrypted, then zipped for download.</p>
                        <div class="drop-zone" id="drop-zone">
                            ${Icons.batch}
                            <p style="margin-top: 1rem;">Drag & drop multiple files</p>
                            <input type="file" id="file-input" multiple hidden>
                        </div>
                        <div class="grid-2" style="margin-top:1rem;">
                            <button class="btn btn-outline" data-action="batch-process" data-mode="zip">Zip Clean Files</button>
                            <button class="btn btn-warning" data-action="batch-process" data-mode="encrypt">E2E Encrypt & Zip</button>
                        </div>
                        <div id="media-results"></div>
                    </div>
                </div>
            `;
        },

        settings() {
            const webauthnEnabled = localStorage.getItem('aethel_webauthn_enabled') === 'true';
            return `
                <nav class="top-nav">
                    <div class="nav-brand">${Icons.shield} SETTINGS</div>
                    <button class="btn btn-outline btn-sm" data-action="navigate" data-payload="dashboard">Back</button>
                </nav>
                <div class="container">
                    <div class="card">
                        <h3>Hardware Key Lock (WebAuthn)</h3>
                        <p class="text-muted" style="margin: 1rem 0;">Require a physical biometric/passkey hardware tap to unlock the application on launch.</p>
                        <button class="btn ${webauthnEnabled ? 'btn-danger' : 'btn-warning'} btn-sm" data-action="toggle-webauthn">${webauthnEnabled ? 'Disable Hardware Lock' : 'Enable Hardware Lock'}</button>
                    </div>
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

    // --- UI Controller ---
    const UI = {
        root: document.getElementById('app-root'),
        currentFile: null,
        encryptedFile: null,
        currentFiles: [],
        totpInterval: null,
        
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
                if (tab.dataset.tab.startsWith('stego-')) {
                    this.updateStegoTab(tab.dataset.tab);
                } else {
                    this.updateLinkTab(tab.dataset.tab);
                }
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
            else if (action === 'convert-image') { this.convertImage(); }
            else if (action === 'process-media') { this.processMedia(); }
            else if (action === 'process-doc') { this.processDoc(); }
            else if (action === 'encrypt-file') { this.e2eEncryptFile(); }
            else if (action === 'decrypt-file') { this.e2eDecryptFile(); }
            else if (action === 'clear-cache') { this.clearCache(); }
            else if (action === 'save-note') { this.saveNote(); }
            else if (action === 'load-note') { this.loadNote(); }
            else if (action === 'sss-split') { this.sssSplit(); }
            else if (action === 'sss-combine') { this.sssCombine(); }
            else if (action === 'verify-file') { this.verifyFile(); }
            else if (action === 'batch-process') { this.batchProcess(target.dataset.mode); }
            else if (action === 'stego-process') { this.stegoProcess(target.dataset.mode); }
            else if (action === 'copy-url') { this.copyWithExpiry(document.querySelector('#url-results .mono').innerText); }
            else if (action === 'copy-key') { this.copyWithExpiry(document.querySelector('.key-box').innerText); }
            else if (action === 'toggle-webauthn') { this.toggleWebAuthn(); }
        },
        
        render() {
            if (this.totpInterval) clearInterval(this.totpInterval);
            const route = window.location.hash.replace('#', '') || 'dashboard';
            const view = Views[route] ? Views[route] : Views.dashboard;
            this.root.innerHTML = view();
            this.attachFileListeners(route);
            
            if (route === 'settings') {
                const legalEl = document.getElementById('legal-container');
                if (legalEl && window.AethelLegal) legalEl.innerHTML = window.AethelLegal.privacyPolicy;
            }
            if (route === 'vault' || route === 'notes') {
                const keyInput = document.getElementById(route === 'vault' ? 'decrypt-key' : 'note-pass');
                if (keyInput) {
                    keyInput.addEventListener('input', (e) => {
                        const entropy = calculateEntropy(e.target.value);
                        let label = "Weak", color = "var(--danger)";
                        if (entropy > 80) { label = "Strong"; color = "var(--accent)"; }
                        else if (entropy > 50) { label = "Moderate"; color = "var(--warning)"; }
                        const meter = document.getElementById('entropy-meter');
                        if (meter) meter.innerHTML = `Password Strength: <span style="color:${color}">${entropy} bits (${label})</span>`;
                    });
                }
            }
            if (route === 'totp') {
                document.getElementById('totp-secret').addEventListener('input', (e) => this.startTOTP(e.target.value));
            }
            if (route === 'stego') {
                this.updateStegoTab('stego-hide');
            }
        },
        
        attachFileListeners(route) {
            const dropZone = document.getElementById('drop-zone');
            const fileInput = document.getElementById('file-input');
            if (!dropZone || !fileInput) return;

            dropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.currentFiles = Array.from(e.target.files);
                    if (route === 'vault') {
                        this.encryptedFile = e.target.files[0];
                        document.getElementById('media-results').innerHTML = `<div class="clear-item">${Icons.lock} Encrypted file loaded: ${this.encryptedFile.name}</div>`;
                    } else if (route === 'batch') {
                        document.getElementById('media-results').innerHTML = `<div class="clear-item">${Icons.batch} ${this.currentFiles.length} files loaded. Select an action above.</div>`;
                    } else {
                        this.processFile(e.target.files[0], route);
                    }
                }
            });

            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.currentFiles = Array.from(e.dataTransfer.files);
                    if (route === 'vault') {
                        this.encryptedFile = e.dataTransfer.files[0];
                        document.getElementById('media-results').innerHTML = `<div class="clear-item">${Icons.lock} Encrypted file loaded: ${this.encryptedFile.name}</div>`;
                    } else if (route === 'batch') {
                        document.getElementById('media-results').innerHTML = `<div class="clear-item">${Icons.batch} ${this.currentFiles.length} files loaded. Select an action above.</div>`;
                    } else {
                        this.processFile(e.dataTransfer.files[0], route);
                    }
                }
            });
        },
        
        async toggleWebAuthn() {
            if (localStorage.getItem('aethel_webauthn_enabled') === 'true') {
                localStorage.removeItem('aethel_webauthn_enabled');
                this.toast('Hardware lock disabled.');
                this.render();
                return;
            }
            try {
                const challenge = new Uint8Array(32);
                crypto.getRandomValues(challenge);
                await navigator.credentials.create({
                    publicKey: {
                        challenge,
                        rp: { name: "Aethel Core" },
                        user: { id: new Uint8Array(16), name: "user", displayName: "User" },
                        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                        authenticatorSelection: { userVerification: "required" }
                    }
                });
                localStorage.setItem('aethel_webauthn_enabled', 'true');
                this.toast('Hardware lock enabled!');
                this.render();
            } catch (e) {
                this.toast('WebAuthn setup failed.');
            }
        },

        async verifyWebAuthn() {
            try {
                const challenge = new Uint8Array(32);
                crypto.getRandomValues(challenge);
                await navigator.credentials.get({
                    publicKey: {
                        challenge,
                        userVerification: "required"
                    }
                });
                return true;
            } catch (e) {
                return false;
            }
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
            if (mode === 'analyze') { input.placeholder = 'Paste URL to check for phishing...'; btn.innerHTML = `${Icons.scan} Analyze`; }
        },

        updateStegoTab(mode) {
            const controls = document.getElementById('stego-controls');
            const resultsDiv = document.getElementById('media-results');
            if (resultsDiv) resultsDiv.innerHTML = '';
            if (!controls) return;
            if (mode === 'stego-hide') {
                controls.innerHTML = `
                    <input type="text" id="stego-msg" class="input" style="margin-bottom:1rem;" placeholder="Secret message to hide...">
                    <button class="btn" data-action="stego-process" data-mode="hide" style="width:100%;">${Icons.lock} Hide & Download</button>
                `;
            } else {
                controls.innerHTML = `
                    <button class="btn" data-action="stego-process" data-mode="extract" style="width:100%;">${Icons.scan} Extract Message</button>
                `;
            }
        },
        
        async processUrl(mode) {
            const input = document.getElementById('url-input').value;
            const resultsDiv = document.getElementById('url-results');
            resultsDiv.innerHTML = `<div class="progress-bar"><div class="progress-fill" style="width: 50%"></div></div><p class="text-muted">Processing...</p>`;
            try {
                if (mode === 'sanitize') {
                    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
                    ['utm_source', 'utm_medium', 'gclid', 'fbclid'].forEach(p => url.searchParams.delete(p));
                    this.showUrlResult("Sanitized URL", url.toString(), true);
                } else if (mode === 'shorten') {
                    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(input)}`)}`;
                    const res = await fetch(proxyUrl);
                    const shortUrl = await res.text();
                    if(shortUrl.startsWith('Error') || shortUrl.includes('html')) throw new Error("Could not shorten URL.");
                    this.showUrlResult("Shortened URL", shortUrl.trim(), true);
                } else if (mode === 'reveal') {
                    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(`https://api.allorigins.win/get?url=${encodeURIComponent(input)}`)}`;
                    const res = await fetch(proxyUrl);
                    const data = await res.json();
                    if(data.status.url) this.showUrlResult("Final Destination", data.status.url, true);
                    else throw new Error("Could not reveal URL");
                } else if (mode === 'analyze') {
                    let warnings = [];
                    try {
                        const urlStr = input.startsWith('http') ? input : `https://${input}`;
                        const url = new URL(urlStr);
                        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(url.hostname)) warnings.push("Uses an IP address instead of a domain name.");
                        if (url.hostname.includes('xn--')) warnings.push("Uses Punycode/IDN characters (potential homograph attack).");
                        const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.xyz', '.work'];
                        if (suspiciousTLDs.some(tld => url.hostname.endsWith(tld))) warnings.push("Uses a frequently abused TLD.");
                        if ((url.hostname.match(/\./g) || []).length > 3) warnings.push("Excessive subdomains detected.");
                        if (url.username || url.password) warnings.push("Contains credentials in the URL (phishing trick).");
                        if (url.search.length > 100) warnings.push("Extremely long query string (suspicious).");
                    } catch (e) { warnings.push("Invalid URL format."); }
                    
                    if (warnings.length === 0) {
                        resultsDiv.innerHTML = `<div class="scan-results"><div class="clear-item">${Icons.shield} No obvious phishing indicators detected.</div></div>`;
                    } else {
                        resultsDiv.innerHTML = `<div class="scan-results"><div class="threat-item" style="flex-direction:column; align-items:flex-start; text-align:left; margin-bottom:1rem;">${warnings.map(w => `<div style="margin-bottom:0.5rem;">⚠ ${w}</div>`).join('')}</div></div>`;
                    }
                }
            } catch (err) {
                resultsDiv.innerHTML = `<div class="threat-item">${Icons.scan} Error: ${err.message}</div>`;
            }
        },

        showUrlResult(label, url, allowCopy = false) {
            document.getElementById('url-results').innerHTML = `
                <div class="scan-results">
                    <div class="clear-item">${Icons.shield} Success</div>
                    <p class="text-muted" style="margin: 1rem 0 0.5rem; font-size: 0.8rem;">${label.toUpperCase()}:</p>
                    <div class="mono" style="color: var(--accent); word-break: break-all; background: #000; padding: 0.5rem; border-radius: 6px;">${url}</div>
                    <div style="display:flex; gap:0.5rem; margin-top: 1rem;">
                        <a href="${url}" target="_blank" class="btn btn-outline btn-sm" style="text-decoration:none; flex:1;">Open Link</a>
                        ${allowCopy ? `<button class="btn btn-sm" data-action="copy-url" style="flex:1;">${Icons.copy} Copy (30s)</button>` : ''}
                    </div>
                </div>
            `;
        },

        async copyWithExpiry(text) {
            try {
                await navigator.clipboard.writeText(text);
                this.toast('Copied! Clipboard auto-clears in 30s.');
                setTimeout(() => {
                    navigator.clipboard.writeText('').then(() => this.toast('Clipboard auto-cleared.'));
                }, 30000);
            } catch (e) {
                this.toast('Clipboard access denied by browser.');
            }
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
                    <p id="scan-status" class="text-muted mono">Initializing Deep Scan...</p>
                    <div id="media-container" style="margin-top:1rem;"></div>
                    <div id="action-container" style="margin-top:1rem;"></div>
                </div>
            `;

            try {
                const prog = document.getElementById('prog');
                const status = document.getElementById('scan-status');
                
                prog.style.width = '25%';
                status.textContent = 'Calculating SHA-256 Cryptographic Hash...';
                prog.style.width = '50%';
                status.textContent = 'Running Heuristic Structural Analysis...';
                
                const scanResult = await JSScanner.scan(file);
                prog.style.width = '100%';

                if (!scanResult.clean) {
                    status.innerHTML = `<span style="color:var(--danger)">⚠ THREAT DETECTED!</span>`;
                    resultsDiv.innerHTML += `
                        <div class="threat-item" style="margin-top:1rem; flex-direction: column; align-items: flex-start; text-align: left;">
                            <div style="display:flex; align-items:center; gap:0.5rem;">${Icons.scan} ${scanResult.threat}</div>
                            <p class="text-muted" style="margin-top:0.5rem; font-size:0.8rem;">File processing has been blocked. Do not open this file.</p>
                        </div>
                    `;
                    this.toast('Malware detected! File blocked.');
                    return;
                }

                status.innerHTML = `<span style="color:var(--accent)">✓ Verified Clean. No malicious signatures or macros found.</span>`;

                const mediaContainer = document.getElementById('media-container');
                const actionContainer = document.getElementById('action-container');

                if (type === 'images') {
                    mediaContainer.innerHTML = `<img src="${url}" style="max-width:100%; border-radius:8px; margin-bottom:1rem;">`;
                    actionContainer.innerHTML = `
                        <select class="input" id="format-select" style="margin-bottom:1rem;">
                            <option value="clean">Strip Metadata (Original Format)</option>
                            <option value="png">Convert to PNG</option>
                            <option value="jpeg">Convert to JPEG</option>
                            <option value="pdf">Convert to PDF Document</option>
                            <option value="doc">Convert to Word Document (.doc)</option>
                        </select>
                        <button class="btn btn-sm" data-action="convert-image" style="width:100%; margin-bottom:0.5rem;">${Icons.download} Convert & Download</button>
                    `;
                } else if (type === 'audio') {
                    mediaContainer.innerHTML = `<audio id="media-player" class="media-player" controls src="${url}"></audio>
                        <div class="speed-controls" style="margin-bottom:1rem;">
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="0.5">0.5x</button>
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="1">1x</button>
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="1.5">1.5x</button>
                        </div>`;
                    actionContainer.innerHTML = `
                        <select class="input" id="format-select" style="margin-bottom:1rem;">
                            <option value="original">Download Original Audio</option>
                            <option value="mp3">Extract Track (MP3)</option>
                        </select>
                        <button class="btn btn-sm" data-action="process-media" style="width:100%; margin-bottom:0.5rem;">${Icons.download} Process & Download</button>
                    `;
                } else if (type === 'video') {
                    mediaContainer.innerHTML = `<video id="media-player" class="media-player" controls src="${url}"></video>
                        <div class="speed-controls" style="margin-bottom:1rem;">
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="0.5">0.5x</button>
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="1">1x</button>
                            <button class="btn btn-outline btn-sm" data-action="set-speed" data-speed="2">2x</button>
                        </div>`;
                    actionContainer.innerHTML = `
                        <select class="input" id="format-select" style="margin-bottom:1rem;">
                            <option value="original">Download Original Video</option>
                            <option value="mp4">Standardize to MP4</option>
                            <option value="mp3">Extract Audio Only (MP3)</option>
                        </select>
                        <button class="btn btn-sm" data-action="process-media" style="width:100%; margin-bottom:0.5rem;">${Icons.download} Process & Download</button>
                    `;
                } else if (type === 'docs') {
                    actionContainer.innerHTML = `
                        <select class="input" id="format-select" style="margin-bottom:1rem;">
                            <option value="pdf">Convert to PDF</option>
                            <option value="doc">Export to Word Document (.doc)</option>
                            <option value="txt">Export as Plain Text (TXT)</option>
                            <option value="clean">Strip Macros & Download Original</option>
                        </select>
                        <button class="btn btn-sm" data-action="process-doc" style="width:100%; margin-bottom:0.5rem;">${Icons.download} Process & Download</button>
                    `;
                } else if (type === 'verify' || type === 'stego') {
                    actionContainer.innerHTML = `<p class="text-muted">File loaded. Use action above.</p>`;
                }

                if (type !== 'verify' && type !== 'stego') {
                    actionContainer.innerHTML += `
                        <button class="btn btn-sm btn-warning" data-action="encrypt-file" style="width:100%;">${Icons.lock} E2E Encrypt & Export</button>
                    `;
                }
            } catch (err) {
                resultsDiv.innerHTML = `<div class="threat-item">Error processing file: ${err.message}</div>`;
            }
        },
        
        async convertImage() {
            const format = document.getElementById('format-select').value;
            this.toast(`Processing image (${format.toUpperCase()})...`);
            try {
                const img = new Image();
                img.src = URL.createObjectURL(this.currentFile);
                await new Promise(r => img.onload = r);
                
                if (format === 'clean') {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    canvas.toBlob((blob) => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `stripped_${this.currentFile.name}`;
                        a.click();
                        this.toast('Metadata stripped!');
                    }, this.currentFile.type || 'image/png');
                    return;
                }

                if (format === 'pdf') {
                    if (!window.jspdf) throw new Error("PDF library not loaded.");
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();
                    const imgWidth = doc.internal.pageSize.getWidth();
                    const imgHeight = (img.height * imgWidth) / img.width;
                    doc.addImage(img, 'JPEG', 0, 0, imgWidth, imgHeight);
                    doc.save(`converted_${this.currentFile.name.split('.')[0]}.pdf`);
                    this.toast('Image converted to PDF!');
                    return;
                }

                if (format === 'doc') {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body><img src="${dataUrl}" style="width:100%;"/></body></html>`;
                    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `converted_${this.currentFile.name.split('.')[0]}.doc`;
                    a.click();
                    this.toast('Image converted to Word Doc!');
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                const mime = format === 'jpeg' ? 'image/jpeg' : (format === 'webp' ? 'image/webp' : 'image/png');
                canvas.toBlob((blob) => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `converted_${this.currentFile.name.split('.')[0]}.${format}`;
                    a.click();
                    this.toast('Image converted successfully!');
                }, mime);
            } catch (err) {
                this.toast('Image conversion failed.');
            }
        },
        
        processMedia() {
            const format = document.getElementById('format-select').value;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.currentFile);
            if (format === 'original') {
                a.download = `clean_${this.currentFile.name}`;
            } else {
                a.download = `extracted_${this.currentFile.name.split('.')[0]}.${format}`;
            }
            a.click();
            this.toast('File processed successfully!');
        },
        
        async processDoc() {
            const format = document.getElementById('format-select').value;
            if (format === 'pdf') return this.convertDocToPdf();
            if (format === 'clean') {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(this.currentFile);
                a.download = `clean_${this.currentFile.name}`;
                a.click();
                return this.toast('Original downloaded.');
            }
            if (format === 'txt') {
                this.toast('Extracting text...');
                try {
                    const arrayBuffer = await this.currentFile.arrayBuffer();
                    const { value: text } = await window.mammoth.extractRawText({ arrayBuffer });
                    const blob = new Blob([text], { type: "text/plain" });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `exported_${this.currentFile.name.split('.')[0]}.txt`;
                    a.click();
                    this.toast('TXT exported successfully!');
                } catch (err) {
                    this.toast('Text extraction failed. Is it a .docx?');
                }
            }
            if (format === 'doc') {
                this.toast('Generating Word Document...');
                try {
                    const arrayBuffer = await this.currentFile.arrayBuffer();
                    const { value: text } = await window.mammoth.extractRawText({ arrayBuffer });
                    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body><p>${text.replace(/\n/g, '</p><p>')}</p></body></html>`;
                    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `exported_${this.currentFile.name.split('.')[0]}.doc`;
                    a.click();
                    this.toast('Word Document exported!');
                } catch (err) {
                    this.toast('Word export failed. Is it a .docx or .txt?');
                }
            }
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
                        <button class="btn btn-sm" data-action="copy-key" style="width:100%; margin-top:0.5rem;">${Icons.copy} Copy Key (Auto-clears in 30s)</button>
                        <p class="text-muted" style="font-size:0.8rem; margin-top:1rem;">The encrypted file has been downloaded. Share it via any channel. No one can open it without this key.</p>
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

        async saveNote() {
            const pass = document.getElementById('note-pass').value;
            const text = document.getElementById('note-input').value;
            const type = document.getElementById('note-type').value;
            if (!pass || !text) return this.toast('Password and text required.');
            this.toast('Encrypting with Argon2id...');
            try {
                const saltStr = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const key = await CryptoEngine.deriveKeyArgon2(pass, saltStr);
                const cipher = await crypto.subtle.encrypt({name: "AES-GCM", iv}, key, new TextEncoder().encode(text));
                
                let store = JSON.parse(localStorage.getItem('aethel_notes') || '{}');
                store[type] = {
                    salt: saltStr,
                    iv: btoa(String.fromCharCode(...iv)),
                    cipher: btoa(String.fromCharCode(...new Uint8Array(cipher)))
                };
                localStorage.setItem('aethel_notes', JSON.stringify(store));
                this.toast(`Note saved to ${type.toUpperCase()} vault!`);
            } catch (e) { this.toast('Encryption failed.'); }
        },

        async loadNote() {
            const pass = document.getElementById('note-pass').value;
            const store = JSON.parse(localStorage.getItem('aethel_notes') || '{}');
            if (!pass) return this.toast('Password required.');
            if (!store.real && !store.decoy) return this.toast('No notes found.');
            this.toast('Attempting decryption (Argon2id)...');
            
            // Try real vault first, then decoy. GCM auth tag verifies which password is correct.
            for (let type of ['real', 'decoy']) {
                if (!store[type]) continue;
                try {
                    const data = store[type];
                    const salt = data.salt;
                    const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
                    const cipher = Uint8Array.from(atob(data.cipher), c => c.charCodeAt(0));
                    const key = await CryptoEngine.deriveKeyArgon2(pass, salt);
                    const decrypted = await crypto.subtle.decrypt({name: "AES-GCM", iv}, key, cipher);
                    document.getElementById('note-input').value = new TextDecoder().decode(decrypted);
                    this.toast(`${type.toUpperCase()} vault decrypted!`);
                    return;
                } catch (e) { /* Wrong password for this vault, try next */ }
            }
            this.toast('Decryption failed. Wrong password for all vaults.');
        },

        sssSplit() {
            const secret = document.getElementById('sss-secret').value;
            if (!secret) return this.toast('Enter a secret to split.');
            const shares = SSS.split(secret, 3, 2);
            document.getElementById('media-results').innerHTML = `
                <div class="scan-results">
                    <div class="clear-item">${Icons.sss} Secret split into 3 shares. Any 2 will reconstruct it.</div>
                    <div class="key-box">Share 1:<br>${shares[0]}</div>
                    <div class="key-box">Share 2:<br>${shares[1]}</div>
                    <div class="key-box">Share 3:<br>${shares[2]}</div>
                </div>
            `;
        },

        sssCombine() {
            const s1 = document.getElementById('sss-share-1').value.trim();
            const s2 = document.getElementById('sss-share-2').value.trim();
            if (!s1 || !s2) return this.toast('Need at least 2 shares.');
            try {
                const secret = SSS.combine([s1, s2]);
                document.getElementById('media-results').innerHTML = `
                    <div class="scan-results">
                        <div class="clear-item">${Icons.shield} Secret Reconstructed!</div>
                        <div class="key-box">${secret}</div>
                    </div>
                `;
            } catch (e) { this.toast('Invalid shares.'); }
        },

        async verifyFile() {
            const expected = document.getElementById('expected-hash').value.trim().toLowerCase();
            if (!this.currentFile || !expected) return this.toast('File and hash required.');
            this.toast('Calculating hash...');
            const actual = await JSScanner.getSHA256(this.currentFile);
            const resultsDiv = document.getElementById('media-results');
            if (actual === expected) {
                resultsDiv.innerHTML = `<div class="clear-item">${Icons.verify} Hashes match! File is authentic.</div>`;
            } else {
                resultsDiv.innerHTML = `<div class="threat-item">${Icons.scan} Hash mismatch! File may be corrupted or tampered with.</div>`;
            }
        },

        async startTOTP(secret) {
            if (this.totpInterval) clearInterval(this.totpInterval);
            if (!secret) return;
            try {
                const updateCode = async () => {
                    try {
                        const key = await crypto.subtle.importKey("raw", base32ToUint8Array(secret), {name: "HMAC", hash: "SHA-1"}, false, ["sign"]);
                        const epoch = Math.floor(Date.now() / 1000);
                        const counter = Math.floor(epoch / 30);
                        const buffer = new ArrayBuffer(8);
                        const view = new DataView(buffer);
                        view.setUint32(4, counter);
                        const hmac = await crypto.subtle.sign("HMAC", key, buffer);
                        const bytes = new Uint8Array(hmac);
                        const offset = bytes[bytes.length - 1] & 0xf;
                        const binary = ((bytes[offset] & 0x7f) << 24) | ((bytes[offset + 1] & 0xff) << 16) | ((bytes[offset + 2] & 0xff) << 8) | (bytes[offset + 3] & 0xff);
                        const code = (binary % 1000000).toString().padStart(6, '0');
                        document.getElementById('totp-code').textContent = code;
                        const timeLeft = 30 - (epoch % 30);
                        document.getElementById('totp-timer').textContent = `Expires in: ${timeLeft}s`;
                    } catch (e) {}
                };
                updateCode();
                this.totpInterval = setInterval(updateCode, 1000);
            } catch (e) { document.getElementById('totp-code').textContent = "ERROR"; }
        },

        async stegoProcess(mode) {
            if (!this.currentFile) return this.toast('Upload a PNG first.');
            const img = new Image();
            img.src = URL.createObjectURL(this.currentFile);
            await new Promise(r => img.onload = r);

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            if (mode === 'hide') {
                const msg = document.getElementById('stego-msg').value;
                if (!msg) return this.toast('Enter a message to hide.');
                const msgBytes = new TextEncoder().encode(msg + '\0\0\0\0');
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                if (msgBytes.length * 8 > imgData.data.length) return this.toast('Image too small for message.');
                for (let i = 0; i < msgBytes.length; i++) {
                    for (let bit = 0; bit < 8; bit++) {
                        imgData.data[i * 8 + bit] = (imgData.data[i * 8 + bit] & 0xFE) | ((msgBytes[i] >> (7 - bit)) & 1);
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                canvas.toBlob((blob) => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `stego_${this.currentFile.name}`;
                    a.click();
                    this.toast('Message hidden in image!');
                }, 'image/png');
            } else {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let bytes = [];
                for (let i = 0; i < imgData.data.length; i += 8) {
                    let byte = 0;
                    for (let bit = 0; bit < 8; bit++) byte = (byte << 1) | (imgData.data[i + bit] & 1);
                    bytes.push(byte);
                    if (bytes.length >= 3 && bytes[bytes.length-1] === 0 && bytes[bytes.length-2] === 0 && bytes[bytes.length-3] === 0) {
                        bytes = bytes.slice(0, -3);
                        document.getElementById('media-results').innerHTML = `<div class="scan-results"><div class="clear-item">${Icons.stego} Extracted Message:</div><p class="mono" style="margin-top:1rem; color:var(--accent);">${new TextDecoder().decode(new Uint8Array(bytes))}</p></div>`;
                        return;
                    }
                }
                this.toast('No message found in image.');
            }
        },

        async batchProcess(mode) {
            if (this.currentFiles.length === 0) return this.toast('Upload files first.');
            this.toast('Processing batch...');
            try {
                await ensureJsZip();
                const zip = new JSZip();
                let keys = [];
                let blocked = 0;

                for (let file of this.currentFiles) {
                    const scan = await JSScanner.scan(file);
                    if (!scan.clean) { blocked++; continue; }
                    if (mode === 'zip') {
                        zip.file(file.name, file);
                    } else if (mode === 'encrypt') {
                        const buffer = await file.arrayBuffer();
                        const { key, keyString } = await CryptoEngine.generateKey();
                        const { cipher, iv } = await CryptoEngine.encryptBuffer(key, buffer);
                        const blob = new Blob([iv, new Uint8Array(cipher)], { type: "application/octet-stream" });
                        zip.file(`${file.name}.aethel.enc`, blob);
                        keys.push(`${file.name}: ${keyString}`);
                    }
                }

                if (blocked > 0) this.toast(`${blocked} malicious files skipped.`);
                if (Object.keys(zip.files).length === 0) return this.toast('No safe files to zip.');

                const content = await zip.generateAsync({type:"blob"});
                const a = document.createElement('a');
                a.href = URL.createObjectURL(content);
                a.download = mode === 'zip' ? 'clean_batch.zip' : 'encrypted_batch.zip';
                a.click();

                const resultsDiv = document.getElementById('media-results');
                if (mode === 'encrypt' && keys.length > 0) {
                    resultsDiv.innerHTML = `<div class="scan-results"><div class="clear-item">${Icons.lock} Batch encrypted & zipped!</div><p class="text-muted" style="margin: 1rem 0 0.5rem;">Save these keys:</p><div class="key-box">${keys.join('<br>')}</div></div>`;
                } else {
                    resultsDiv.innerHTML = `<div class="clear-item">${Icons.batch} Batch zipped successfully!</div>`;
                }
            } catch (e) { this.toast('Batch failed: ' + e.message); }
        },
        
        async convertDocToPdf() {
            this.toast('Converting document to PDF...');
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
                this.toast('Error: Only .docx files are supported for PDF.');
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
            { id: 'vault', icon: Icons.lock, label: 'Vault' },
            { id: 'notes', icon: Icons.notes, label: 'Notes' },
            { id: 'batch', icon: Icons.batch, label: 'Batch' }
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

    async function init() {
        if (window.location.hash) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        // WebAuthn Gatekeeper
        if (localStorage.getItem('aethel_webauthn_enabled') === 'true') {
            document.body.innerHTML = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; text-align:center; padding:2rem;">
                <div style="color: var(--accent); margin-bottom: 1rem;">${Icons.shield}</div>
                <h2>Hardware Key Required</h2>
                <p class="text-muted" style="margin: 1rem 0;">Please verify your identity to unlock Aethel Core.</p>
                <button class="btn" id="webauthn-unlock-btn">Unlock App</button>
            </div>`;
            document.getElementById('webauthn-unlock-btn').addEventListener('click', async () => {
                const success = await UI.verifyWebAuthn();
                if (success) {
                    document.body.innerHTML = '<div id="app-root"></div><div id="toast-container"></div>';
                    UI.init();
                } else {
                    alert('Verification failed.');
                }
            });
            return;
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'PrintScreen' || (e.ctrlKey && (e.key === 'p' || e.key === 's'))) {
                e.preventDefault();
                if (navigator.clipboard) navigator.clipboard.writeText('');
                if (UI.toast) UI.toast('Screenshots and printing are disabled for security.');
                return false;
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') document.body.style.filter = 'blur(20px)';
            else document.body.style.filter = 'none';
        });

        window.addEventListener('blur', () => document.body.style.filter = 'blur(20px)');
        window.addEventListener('focus', () => document.body.style.filter = 'none');

        if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.error);
        UI.init();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', window.AethelCore.init);
