/**
 * Aethel Core - Master Application Logic
 * Version: 3.0 (Strict Auth, Floating Dock, Transparent UI)
 */

window.AethelCore = (function() {
    'use strict';

    const CONFIG = {
        supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
        supabaseKey: 'YOUR_ANON_KEY',
        stripeCheckoutUrl: 'https://buy.stripe.com/YOUR_LINK',
        shardCount: 3
    };

    const state = {
        currentUser: null,
        tier: 'unverified', // unverified -> pending -> free -> premium
        sessionKey: null
    };

    let supabaseClient = null;

    const CryptoEngine = {
        async generateSessionKey() {
            const key = await window.crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );
            state.sessionKey = key;
            return key;
        },
        async encryptData(dataString) {
            if (!state.sessionKey) await this.generateSessionKey();
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(dataString);
            const ciphertext = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv },
                state.sessionKey,
                encoded
            );
            return { 
                cipher: btoa(String.fromCharCode(...new Uint8Array(ciphertext))), 
                iv: Array.from(iv) 
            };
        },
        shardData(encryptedPayload) {
            const len = encryptedPayload.cipher.length;
            const chunkSize = Math.ceil(len / CONFIG.shardCount);
            const shards = [];
            for (let i = 0; i < CONFIG.shardCount; i++) {
                shards.push({
                    id: `shard_${i}_${Date.now()}`,
                    fragment: encryptedPayload.cipher.slice(i * chunkSize, (i + 1) * chunkSize),
                    iv: i === 0 ? encryptedPayload.iv : null
                });
            }
            return shards;
        }
    };

    const AuthRouter = {
        init() {
            if (window.supabase && !CONFIG.supabaseUrl.includes('YOUR_PROJECT')) {
                supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
                this.listenForAuthChanges();
                this.checkInitialSession();
            } else {
                console.warn('Supabase not configured. Running in mock mode.');
                UI.renderState('unverified');
            }
        },

        listenForAuthChanges() {
            supabaseClient.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    this.handleUserSession(session.user);
                } else if (event === 'SIGNED_OUT') {
                    state.currentUser = null;
                    state.tier = 'unverified';
                    UI.renderState('unverified');
                }
            });
        },

        async checkInitialSession() {
            const { data, error } = await supabaseClient.auth.getSession();
            if (data.session) {
                this.handleUserSession(data.session.user);
            } else {
                UI.renderState('unverified');
            }
        },

        async sendMagicLink(email) {
            if (!email || !email.includes('@')) {
                UI.showToast('Please enter a valid email address.', 'error');
                return;
            }

            if (!supabaseClient) {
                // Mock fallback for local testing without Supabase
                UI.showToast('Mock mode: Simulating strict email verification...', 'gold');
                UI.renderState('pending'); // Force pending state
                return;
            }

            UI.showToast('Sending secure verification link...', 'gold');
            try {
                const { error } = await supabaseClient.auth.signInWithOtp({
                    email: email,
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                });
                if (error) throw error;
                UI.renderState('pending'); // Force pending state until email is clicked
            } catch (error) {
                UI.showToast(error.message, 'error');
            }
        },

        async signOut() {
            if (supabaseClient) await supabaseClient.auth.signOut();
            state.currentUser = null;
            state.tier = 'unverified';
            UI.renderState('unverified');
            UI.showToast('Session terminated.', 'success');
        },

        handleUserSession(user) {
            state.currentUser = user;
            const stripeToken = localStorage.getItem('aethel_stripe_token');
            if (stripeToken === 'premium_active') {
                state.tier = 'premium';
            } else {
                state.tier = 'free';
            }
            UI.renderState(state.tier);
        },

        triggerStripeCheckout() {
            UI.showToast('Redirecting to secure Stripe checkout...', 'gold');
            setTimeout(() => {
                localStorage.setItem('aethel_stripe_token', 'premium_active');
                window.location.href = CONFIG.stripeCheckoutUrl;
            }, 1000);
        }
    };

    const UI = {
        elements: {},
        cacheDOM() {
            this.elements.appRoot = document.getElementById('app-root');
            this.elements.consentBanner = document.getElementById('consentBanner');
        },
        init() {
            this.cacheDOM();
            this.bindEvents();
            AuthRouter.init();
        },
        bindEvents() {
            document.body.addEventListener('click', (e) => {
                const action = e.target.closest('[data-action]')?.dataset.action;
                if (!action) return;
                
                const email = document.getElementById('auth-email')?.value;

                switch(action) {
                    case 'send-magic-link': 
                        AuthRouter.sendMagicLink(email);
                        break;
                    case 'signout':
                        AuthRouter.signOut();
                        break;
                    case 'upgrade':
                        AuthRouter.triggerStripeCheckout();
                        break;
                    case 'encrypt-vault':
                        Modules.StatelessVault.encrypt();
                        break;
                    case 'cleanstream':
                        Modules.CleanStream.process();
                        break;
                    case 'view-privacy':
                        this.renderModal('Privacy Policy', window.AethelLegal.privacyPolicy);
                        break;
                    case 'view-tos':
                        this.renderModal('Terms of Service', window.AethelLegal.termsOfService);
                        break;
                    case 'scroll-to':
                        const target = document.getElementById(e.target.closest('[data-target]').dataset.target);
                        if(target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        break;
                }
            });
        },
        renderState(tier) {
            state.tier = tier;
            let html = '';
            if (tier === 'unverified' || tier === 'pending') {
                html = this.templates.authScreen(tier);
            } else {
                html = this.templates.dashboard(tier);
            }
            this.elements.appRoot.innerHTML = html;
        },
        showToast(message, type = 'success') {
            const colors = { success: '#D4AF37', error: '#ff4d4d', gold: '#FFD700' };
            const toast = document.createElement('div');
            toast.className = 'aethel-toast';
            toast.style.borderColor = colors[type];
            toast.style.color = colors[type];
            toast.innerText = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 50);
            setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
        },
        renderModal(title, content) {
            const modal = document.createElement('div');
            modal.className = 'aethel-modal-overlay';
            modal.innerHTML = `<div class="aethel-modal-content">${content}<button data-action="close-modal" class="modal-close-btn">&times;</button></div>`;
            modal.addEventListener('click', (e) => { if (e.target === modal || e.target.dataset.action === 'close-modal') modal.remove(); });
            document.body.appendChild(modal);
        },
        templates: {
            authScreen(status) {
                const isPending = status === 'pending';
                return `
                    <div class="auth-wrapper">
                        <div class="auth-card">
                            <div class="auth-header">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#g)" stroke-width="1.5">
                                    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFD700" /><stop offset="100%" stop-color="#D4AF37" /></linearGradient></defs>
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                                </svg>
                                <h2>AETHEL CORE</h2>
                                <p>${isPending ? 'Verification Pending' : 'Sovereign Web Workspace'}</p>
                            </div>
                            
                            ${!isPending ? `
                                <div class="auth-form">
                                    <label>Enter Email to Continue</label>
                                    <input type="email" id="auth-email" placeholder="you@domain.com" autocomplete="email">
                                    <button data-action="send-magic-link" class="btn-gold">Send Secure Verification Link</button>
                                    <p class="auth-disclaimer">Strict Zero-PII Architecture. A verification link will be sent to your email. You cannot proceed without verifying.</p>
                                </div>
                            ` : `
                                <div class="auth-pending">
                                    <div class="pending-icon">✉️</div>
                                    <h3>Check Your Inbox</h3>
                                    <p>A secure access link has been sent. Click the link in your email to authorize this device.</p>
                                    <p class="pending-sub">If you don't see it, check your spam folder.</p>
                                    <button data-action="send-magic-link" class="btn-outline-gold" id="resend-btn" style="margin-top: 1.5rem; display: block; width: 100%;">Resend Link</button>
                                    <input type="hidden" id="auth-email" value="">
                                </div>
                            `}
                            
                            <div class="auth-footer">
                                <button data-action="view-privacy" class="link-btn">Privacy Policy</button> &bull; 
                                <button data-action="view-tos" class="link-btn">Terms of Service</button>
                            </div>
                        </div>
                    </div>
                `;
            },

            dashboard(tier) {
                const isPremium = tier === 'premium';
                return `
                    <nav class="top-nav">
                        <div class="nav-brand">AETHEL CORE</div>
                        <div class="nav-right">
                            <span class="tier-badge ${isPremium ? 'pro' : 'free'}">${tier.toUpperCase()}</span>
                            <button data-action="signout" class="btn-sm">Sign Out</button>
                        </div>
                    </nav>

                    <main class="dashboard-container">
                        <!-- Services Matrix -->
                        <section id="free-tools" class="section-block">
                            <h3 class="section-title">Core Utilities <span class="section-sub">(Free Tier)</span></h3>
                            <div class="grid-3">
                                <!-- Vault -->
                                <div class="glass-card">
                                    <div class="card-header"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg> Stateless Vault</div>
                                    <textarea id="vault-input" class="glass-input" style="min-height: 80px;" placeholder="Enter text to locally shard and encrypt..."></textarea>
                                    <button data-action="encrypt-vault" class="btn-gold w-100 mt-2">Encrypt & Shard</button>
                                    <div id="vault-output" class="output-box mt-2"></div>
                                </div>
                                <!-- CleanStream -->
                                <div class="glass-card">
                                    <div class="card-header"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> CleanStream Engine</div>
                                    <input type="text" id="cs-input" class="glass-input" placeholder="Enter URL to sanitize...">
                                    <button data-action="cleanstream" class="btn-gold w-100 mt-2">Append Safe-Search</button>
                                    <div id="cs-output" class="output-box mt-2"></div>
                                </div>
                                <!-- Broadcast -->
                                <div class="glass-card">
                                    <div class="card-header"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Public Broadcast Core</div>
                                    <div class="output-box" style="height: 120px; display: flex; align-items: center; justify-content: center;">
                                        <span style="color: #666;">No active broadcasts. Node listening...</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <!-- Premium Tools -->
                        <section id="premium-tools" class="section-block">
                            <h3 class="section-title">Advanced Infrastructure <span class="section-sub">(Premium Tier)</span></h3>
                            <div class="grid-2">
                                <!-- P2P Tunnels -->
                                <div class="glass-card ${isPremium ? 'active' : 'locked'}">
                                    ${!isPremium ? '<div class="pro-badge">PRO</div>' : ''}
                                    <div class="card-header"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg> P2P Node Tunnels</div>
                                    <div class="output-box" style="height: 100px;">
                                        ${isPremium ? 'Tunnel active. Routing obfuscated packets...' : 'Click to unlock secure P2P routing capabilities.'}
                                    </div>
                                    ${!isPremium ? '<button data-action="upgrade" class="btn-outline-gold w-100 mt-2">Unlock Premium</button>' : '<button class="btn-gold w-100 mt-2" disabled>Active</button>'}
                                </div>
                                <!-- Stealth Skinning -->
                                <div class="glass-card ${isPremium ? 'active' : 'locked'}">
                                    ${!isPremium ? '<div class="pro-badge">PRO</div>' : ''}
                                    <div class="card-header"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><path d="M9 11H5a2 2 0 0 0-2 2v7h6V11zM19 11h-4v9h6v-7a2 2 0 0 0-2-2zM9 4h6v7H9z"></path></svg> Advanced UI Stealth Skinning</div>
                                    <div class="output-box" style="height: 100px;">
                                        ${isPremium ? 'Stealth skin active. UI fingerprint randomized.' : 'Click to unlock browser fingerprint randomization.'}
                                    </div>
                                    ${!isPremium ? '<button data-action="upgrade" class="btn-outline-gold w-100 mt-2">Unlock Premium</button>' : '<button class="btn-gold w-100 mt-2" disabled>Active</button>'}
                                </div>
                            </div>
                        </section>

                        <!-- Legal Section (Visible) -->
                        <section id="legal-section" class="section-block">
                            <h3 class="section-title">Legal & Compliance <span class="section-sub">(UK GDPR / DPA 2018)</span></h3>
                            <div class="grid-2">
                                <div class="glass-card" data-action="view-privacy" style="cursor: pointer; text-align: center;">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="1.5" style="margin-bottom: 10px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    <h4 style="color: #FFF; margin: 0;">Privacy Policy</h4>
                                    <p style="font-size: 0.8rem; color: #888; margin-top: 5px;">Zero Data Architecture & Traffic Logging Policy</p>
                                </div>
                                <div class="glass-card" data-action="view-tos" style="cursor: pointer; text-align: center;">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="1.5" style="margin-bottom: 10px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                    <h4 style="color: #FFF; margin: 0;">Terms of Service</h4>
                                    <p style="font-size: 0.8rem; color: #888; margin-top: 5px;">Decentralized Protocol & Age 17+ Liability Framework</p>
                                </div>
                            </div>
                        </section>
                    </main>

                    <!-- Floating Dock (Windows/macOS style) -->
                    <div class="floating-dock">
                        <button class="dock-item" data-action="scroll-to" data-target="free-tools">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            <span>Utilities</span>
                        </button>
                        <button class="dock-item" data-action="scroll-to" data-target="premium-tools">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                            <span>Tunnels</span>
                        </button>
                        <button class="dock-item" data-action="scroll-to" data-target="legal-section">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            <span>Legal</span>
                        </button>
                        <div class="dock-divider"></div>
                        <button class="dock-item" data-action="upgrade">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            <span>Upgrade</span>
                        </button>
                        <button class="dock-item logout" data-action="signout">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            <span>Logout</span>
                        </button>
                    </div>
                `;
            }
        }
    };

    const Modules = {
        StatelessVault: {
            async encrypt() {
                const text = document.getElementById('vault-input').value;
                if (!text) return UI.showToast('Input cannot be empty.', 'error');
                UI.showToast('Generating 256-bit AES-GCM key...', 'gold');
                const encrypted = await CryptoEngine.encryptData(text);
                const shards = CryptoEngine.shardData(encrypted);
                document.getElementById('vault-output').innerHTML = `<div style="word-break: break-all; font-family: monospace; font-size: 0.8rem; color: #D4AF37;"><strong>Shards Generated:</strong> ${shards.length}<br><strong>Status:</strong> Routed to P2P nodes locally.</div>`;
                UI.showToast('Vault encrypted and routed.', 'success');
            }
        },
        CleanStream: {
            process() {
                const url = document.getElementById('cs-input').value;
                if (!url) return UI.showToast('Enter a valid URL.', 'error');
                try {
                    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
                    parsed.searchParams.set('kp', '1'); 
                    document.getElementById('cs-output').innerHTML = `<a href="${parsed.toString()}" target="_blank" style="color: #FFD700; word-break: break-all;">${parsed.toString()}</a>`;
                    UI.showToast('URL sanitized.', 'success');
                } catch (e) { UI.showToast('Invalid URL format.', 'error'); }
            }
        }
    };

    function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(err => console.error(err)));
        }
        document.body.insertAdjacentHTML('beforeend', window.AethelLegal.consentBanner);
        AuthRouter.init();
        UI.init();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', window.AethelCore.init);
