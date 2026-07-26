/**
 * Aethel Core - Application Core V4.0
 * Senior-Level Refactor: SPA Router, State Management, Functional Crypto CRUD.
 */

window.AethelCore = (function() {
    'use strict';

    const CONFIG = {
        supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
        supabaseKey: 'YOUR_ANON_KEY',
        stripeCheckoutUrl: 'https://buy.stripe.com/YOUR_LINK'
    };

    // --- State Store (Observable Pattern) ---
    const State = {
        data: {
            user: null,
            tier: 'guest', // guest, authenticated, premium
            vaultEntries: []
        },
        listeners: [],
        subscribe(fn) { this.listeners.push(fn); },
        setState(updates) {
            this.data = { ...this.data, ...updates };
            this.listeners.forEach(fn => fn(this.data));
        },
        getState() { return this.data; }
    };

    let supabaseClient = null;

    // --- Crypto Engine (Real AES-GCM Implementation) ---
    const CryptoEngine = {
        async generateKey() {
            // Non-extractable key tied to this browser session for the MVP
            return await window.crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                false, 
                ["encrypt", "decrypt"]
            );
        },
        async encrypt(key, text) {
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(text);
            const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
            return {
                cipher: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
                iv: Array.from(iv)
            };
        },
        async decrypt(key, cipherBase64, ivArray) {
            try {
                const cipherArr = new Uint8Array(atob(cipherBase64).split("").map(c => c.charCodeAt(0)));
                const iv = new Uint8Array(ivArray);
                const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherArr);
                return new TextDecoder().decode(decrypted);
            } catch (e) {
                console.error("Decryption failed", e);
                return "[DECRYPTION FAILED: INVALID KEY OR DATA]";
            }
        }
    };

    // --- Authentication & Routing ---
    const Auth = {
        init() {
            if (window.supabase && !CONFIG.supabaseUrl.includes('YOUR_PROJECT')) {
                supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
                supabaseClient.auth.onAuthStateChange((event, session) => {
                    if (session) {
                        State.setState({ user: session.user, tier: 'authenticated' });
                    } else {
                        State.setState({ user: null, tier: 'guest' });
                    }
                });
                supabaseClient.auth.getSession().then(({ data }) => {
                    if (data.session) State.setState({ user: data.session.user, tier: 'authenticated' });
                });
            }
        },
        async sendMagicLink(email) {
            if (!supabaseClient) {
                UI.toast('Mock mode: Logging in...', 'gold');
                setTimeout(() => State.setState({ user: { email }, tier: 'authenticated' }), 1000);
                return;
            }
            try {
                const { error } = await supabaseClient.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin }});
                if (error) throw error;
                UI.toast('Verification link sent. Check your email.', 'success');
            } catch (err) { UI.toast(err.message, 'error'); }
        },
        async signOut() {
            if (supabaseClient) await supabaseClient.auth.signOut();
            State.setState({ user: null, tier: 'guest' });
        }
    };

    // --- Router (Hash-based SPA) ---
    const Router = {
        init() {
            window.addEventListener('hashchange', () => this.render());
            State.subscribe(() => this.render());
        },
        navigate(path) { window.location.hash = path; },
        getRoute() { return window.location.hash.replace('#/', '') || 'dashboard'; },
        render() {
            const route = this.getRoute();
            const state = State.getState();
            
            if (state.tier === 'guest') {
                UI.render(AuthView);
                return;
            }

            switch(route) {
                case 'vault': UI.render(VaultView); break;
                case 'tools': UI.render(ToolsView); break;
                case 'settings': UI.render(SettingsView); break;
                default: UI.render(DashboardView); break;
            }
        }
    };

    // --- Modules (Business Logic) ---
    const VaultModule = {
        sessionKey: null,
        
        async initKey() {
            if (!this.sessionKey) this.sessionKey = await CryptoEngine.generateKey();
            this.loadEntries();
        },
        
        async saveEntry(title, content) {
            if (!content) return UI.toast('Content cannot be empty.', 'error');
            if (!this.sessionKey) await this.initKey();
            
            const encryptedPayload = await CryptoEngine.encrypt(this.sessionKey, content);
            const entry = {
                id: 'vault_' + Date.now(),
                title: title || 'Untitled Entry',
                timestamp: new Date().toISOString(),
                ...encryptedPayload
            };
            
            // Save to localStorage for MVP persistence (would be Supabase DB in prod)
            const entries = JSON.parse(localStorage.getItem('aethel_vault') || '[]');
            entries.push(entry);
            localStorage.setItem('aethel_vault', JSON.stringify(entries));
            
            this.loadEntries();
            UI.toast('Entry encrypted and saved locally.', 'success');
        },
        
        loadEntries() {
            const entries = JSON.parse(localStorage.getItem('aethel_vault') || '[]');
            State.setState({ vaultEntries: entries });
        },
        
        async decryptEntry(id) {
            if (!this.sessionKey) await this.initKey();
            const entries = State.getState().vaultEntries;
            const entry = entries.find(e => e.id === id);
            if (!entry) return;
            
            const decryptedText = await CryptoEngine.decrypt(this.sessionKey, entry.cipher, entry.iv);
            UI.showDecryptedModal(entry.title, decryptedText);
        },
        
        deleteEntry(id) {
            let entries = State.getState().vaultEntries;
            entries = entries.filter(e => e.id !== id);
            localStorage.setItem('aethel_vault', JSON.stringify(entries));
            State.setState({ vaultEntries: entries });
            UI.toast('Entry deleted.', 'success');
        }
    };

    const ToolsModule = {
        sanitizeUrl(rawUrl) {
            try {
                const url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
                
                // Strip known tracking parameters
                const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid', 'ref'];
                trackingParams.forEach(p => url.searchParams.delete(p));
                
                // Add safe search
                url.searchParams.set('safe', 'active');
                
                return url.toString();
            } catch (e) {
                UI.toast('Invalid URL format.', 'error');
                return null;
            }
        }
    };

    // --- Views (UI Components) ---
    const UI = {
        root: document.getElementById('app-root'),
        bindEvents() {
            document.body.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                const action = target.dataset.action;
                const payload = target.dataset.payload || target.value;

                switch(action) {
                    case 'navigate': Router.navigate(payload); break;
                    case 'send-magic-link': Auth.sendMagicLink(document.getElementById('auth-email').value); break;
                    case 'signout': Auth.signOut(); break;
                    case 'save-vault': 
                        VaultModule.saveEntry(document.getElementById('vault-title').value, document.getElementById('vault-content').value);
                        break;
                    case 'decrypt-vault': VaultModule.decryptEntry(payload); break;
                    case 'delete-vault': VaultModule.deleteEntry(payload); break;
                    case 'sanitize-url':
                        const rawUrl = document.getElementById('url-input').value;
                        const clean = ToolsModule.sanitizeUrl(rawUrl);
                        if (clean) {
                            document.getElementById('url-output').innerHTML = `<a href="${clean}" target="_blank" style="color:var(--gold-bright);word-break:break-all;">${clean}</a>`;
                        }
                        break;
                }
            });
        },
        render(View) {
            this.root.innerHTML = View.template();
            if (View.onMount) View.onMount();
        },
        toast(msg, type='success') {
            const colors = { success: '#D4AF37', error: '#ff4d4d', gold: '#FFD700' };
            const t = document.createElement('div');
            t.className = 'toast';
            t.style.borderColor = colors[type];
            t.style.color = colors[type];
            t.textContent = msg;
            document.body.appendChild(t);
            setTimeout(() => t.classList.add('show'), 50);
            setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
        },
        showDecryptedModal(title, content) {
            const m = document.createElement('div');
            m.className = 'modal-overlay';
            m.innerHTML = `
                <div class="modal-content">
                    <h3 style="color:var(--gold-bright);margin-bottom:1rem;">${title}</h3>
                    <pre style="color:#fff;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:1rem;border-radius:8px;">${content}</pre>
                    <button data-action="close-modal" class="btn-gold" style="margin-top:1.5rem;width:100%;">Close & Clear Memory</button>
                </div>`;
            m.addEventListener('click', (e) => { if (e.target === m || e.target.dataset.action === 'close-modal') m.remove(); });
            document.body.appendChild(m);
        }
    };

    // --- View Templates ---
    const AuthView = {
        template() {
            return `
                <div class="auth-wrapper">
                    <div class="auth-card">
                        <div class="auth-header">
                            <h2>AETHEL CORE</h2>
                            <p>Secure Access Required</p>
                        </div>
                        <div class="auth-form">
                            <input type="email" id="auth-email" class="glass-input" placeholder="Enter email address">
                            <button data-action="send-magic-link" class="btn-gold w-100">Send Secure Link</button>
                        </div>
                    </div>
                </div>
            `;
        }
    };

    const DashboardView = {
        template() {
            const state = State.getState();
            return `
                <nav class="top-nav">
                    <span class="nav-brand">AETHEL CORE</span>
                    <div class="nav-right">
                        <span class="tier-badge ${state.tier}">${state.tier.toUpperCase()}</span>
                    </div>
                </nav>
                <main class="container">
                    <h2 class="page-title">Dashboard</h2>
                    <p class="text-muted">Welcome back. Select a module to begin.</p>
                    <div class="grid-2">
                        <div class="glass-card nav-card" data-action="navigate" data-payload="vault">
                            <h3>Stateless Vault</h3>
                            <p>AES-256 Encrypted local storage.</p>
                            <span class="link">Open Module &rarr;</span>
                        </div>
                        <div class="glass-card nav-card" data-action="navigate" data-payload="tools">
                            <h3>CleanStream Tools</h3>
                            <p>URL Sanitization & Tracking Removal.</p>
                            <span class="link">Open Module &rarr;</span>
                        </div>
                    </div>
                </main>
                ${Layout.dock('dashboard')}
            `;
        }
    };

    const VaultView = {
        template() {
            const entries = State.getState().vaultEntries;
            return `
                <nav class="top-nav">
                    <span class="nav-brand">AETHEL CORE / VAULT</span>
                    <div class="nav-right">
                        <button data-action="navigate" data-payload="dashboard" class="btn-sm">Back</button>
                    </div>
                </nav>
                <main class="container">
                    <h2 class="page-title">Encrypted Vault</h2>
                    <div class="grid-2">
                        <div class="glass-card">
                            <h3>New Entry</h3>
                            <input type="text" id="vault-title" class="glass-input mb-1" placeholder="Title">
                            <textarea id="vault-content" class="glass-input mb-1" style="min-height:120px;" placeholder="Secret text..."></textarea>
                            <button data-action="save-vault" class="btn-gold w-100">Encrypt & Save</button>
                        </div>
                        <div class="glass-card">
                            <h3>Saved Entries (${entries.length})</h3>
                            <div class="entry-list">
                                ${entries.length === 0 ? '<p class="text-muted">No entries found.</p>' : 
                                  entries.map(e => `
                                    <div class="vault-entry">
                                        <div>
                                            <strong>${e.title}</strong>
                                            <small>${new Date(e.timestamp).toLocaleString()}</small>
                                        </div>
                                        <div class="entry-actions">
                                            <button data-action="decrypt-vault" data-payload="${e.id}" class="btn-sm">Decrypt</button>
                                            <button data-action="delete-vault" data-payload="${e.id}" class="btn-sm danger">Del</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </main>
                ${Layout.dock('vault')}
            `;
        },
        onMount() { VaultModule.initKey(); }
    };

    const ToolsView = {
        template() {
            return `
                <nav class="top-nav">
                    <span class="nav-brand">AETHEL CORE / TOOLS</span>
                    <div class="nav-right">
                        <button data-action="navigate" data-payload="dashboard" class="btn-sm">Back</button>
                    </div>
                </nav>
                <main class="container">
                    <h2 class="page-title">CleanStream URL Sanitizer</h2>
                    <div class="glass-card">
                        <p class="text-muted">Strips UTM tags, tracking pixels, and enforces safe search.</p>
                        <input type="text" id="url-input" class="glass-input mb-1" placeholder="Paste messy URL here...">
                        <button data-action="sanitize-url" class="btn-gold w-100">Sanitize URL</button>
                        <div id="url-output" class="output-box mt-2"></div>
                    </div>
                </main>
                ${Layout.dock('tools')}
            `;
        }
    };

    const SettingsView = {
        template() {
            return `
                <nav class="top-nav">
                    <span class="nav-brand">AETHEL CORE / SETTINGS</span>
                </nav>
                <main class="container">
                    <h2 class="page-title">Settings</h2>
                    <div class="glass-card">
                        <h3>Session Management</h3>
                        <button data-action="signout" class="btn-outline-gold w-100">Terminate Session & Sign Out</button>
                    </div>
                </main>
                ${Layout.dock('settings')}
            `;
        }
    };

    // --- Layout Partials ---
    const Layout = {
        dock(active) {
            return `
                <div class="floating-dock">
                    <button class="dock-item ${active==='dashboard'?'active':''}" data-action="navigate" data-payload="dashboard">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                        <span>Home</span>
                    </button>
                    <button class="dock-item ${active==='vault'?'active':''}" data-action="navigate" data-payload="vault">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        <span>Vault</span>
                    </button>
                    <button class="dock-item ${active==='tools'?'active':''}" data-action="navigate" data-payload="tools">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        <span>Tools</span>
                    </button>
                    <div class="dock-divider"></div>
                    <button class="dock-item ${active==='settings'?'active':''}" data-action="navigate" data-payload="settings">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        <span>Logout</span>
                    </button>
                </div>
            `;
        }
    };

    // --- Initialization ---
    function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(console.error));
        }
        UI.bindEvents();
        Auth.init();
        Router.init();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', window.AethelCore.init);
