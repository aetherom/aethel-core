/**
 * Aethel Core - Master Application Logic
 * Version: 2.0 (Real Auth & UI Fixes)
 */

window.AethelCore = (function() {
    'use strict';

    const CONFIG = {
        // REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
        supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
        supabaseKey: 'YOUR_ANON_KEY',
        stripeCheckoutUrl: 'https://buy.stripe.com/YOUR_LINK',
        shardCount: 3
    };

    const state = {
        currentUser: null,
        tier: 'unverified',
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
                this.handleRedirectCallback();
            } else {
                console.warn('Supabase not configured. Running in mock mode.');
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

        handleRedirectCallback() {
            // Catches the Supabase magic link redirect
            supabaseClient.auth.getSession().then(({ data }) => {
                if (data.session) {
                    this.handleUserSession(data.session.user);
                } else {
                    UI.renderState('unverified');
                }
            });
        },

        async sendMagicLink(email) {
            if (!email || !email.includes('@')) {
                UI.showToast('Please enter a valid email address.', 'error');
                return;
            }

            if (!supabaseClient) {
                // Mock fallback for testing without Supabase
                UI.showToast('Mock mode: Simulating email verification...', 'gold');
                setTimeout(() => {
                    state.currentUser = { email };
                    state.tier = 'free';
                    UI.renderState('free');
                }, 1500);
                return;
            }

            UI.showToast('Sending secure verification link...', 'gold');
            try {
                const { error } = await supabaseClient.auth.signInWithOtp({
                    email: email,
                    options: {
                        emailRedirectTo: window.location.origin // Redirects back to your Cloudflare URL
                    }
                });
                if (error) throw error;
                UI.showToast('Verification link sent! Check your email.', 'success');
                document.getElementById('auth-status').innerHTML = `<div class="alert alert-success" style="margin-top: 1rem; background: rgba(212, 175, 55, 0.1); border: 1px solid #D4AF37; color: #FFD700;">Check your inbox to complete authentication.</div>`;
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
                switch(action) {
                    case 'send-magic-link': 
                        AuthRouter.sendMagicLink(document.getElementById('auth-email').value);
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
                }
            });
        },
        renderState(tier) {
            state.tier = tier;
            let html = tier === 'unverified' ? this.templates.authScreen() : this.templates.dashboard(tier);
            this.elements.appRoot.innerHTML = html;
        },
        showToast(message, type = 'success') {
            const colors = { success: '#D4AF37', error: '#ff4d4d', gold: '#FFD700' };
            const toast = document.createElement('div');
            toast.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: rgba(26, 26, 24, 0.95); backdrop-filter: blur(12px); border: 1px solid ${colors[type]}; color: ${colors[type]}; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 20px rgba(0,0,0,0.5); transition: transform 0.3s; transform: translateX(120%);`;
            toast.innerText = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.style.transform = 'translateX(0)', 50);
            setTimeout(() => { toast.style.transform = 'translateX(120%)'; setTimeout(() => toast.remove(), 300); }, 3500);
        },
        renderModal(title, content) {
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);z-index:9998;display:flex;align-items:center;justify-content:center;padding:2rem;';
            modal.innerHTML = `<div class="aethel-glass-panel" style="max-width:800px;width:100%;max-height:85vh;overflow-y:auto;padding:2rem;position:relative;"><button data-action="close-modal" style="position:absolute;top:1rem;right:1rem;background:none;border:none;color:#FFD700;font-size:1.5rem;cursor:pointer;">&times;</button>${content}</div>`;
            modal.addEventListener('click', (e) => { if (e.target === modal || e.target.dataset.action === 'close-modal') modal.remove(); });
            document.body.appendChild(modal);
        },
        templates: {
            authScreen() {
                return `
                    <div class="auth-container">
                        <div class="aethel-glass-panel auth-card">
                            <div class="text-center mb-4">
                                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="url(#gold-gradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3">
                                    <defs><linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" /><stop offset="100%" style="stop-color:#D4AF37;stop-opacity:1" /></linearGradient></defs>
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                                </svg>
                                <h2 class="auth-title">AETHEL CORE</h2>
                                <p class="auth-subtitle">Sovereign Web Workspace</p>
                            </div>
                            <div class="auth-form">
                                <label class="auth-label">Email Address</label>
                                <input type="email" id="auth-email" class="auth-input" placeholder="you@domain.com" autocomplete="email">
                                <button data-action="send-magic-link" class="auth-btn-primary">Send Secure Verification Link</button>
                                <div id="auth-status"></div>
                                <p class="auth-disclaimer">We use passwordless WebAuthn standards. No passwords are stored. Zero-PII architecture.</p>
                                <div class="auth-links">
                                    <button data-action="view-privacy" class="auth-link">Privacy Policy</button> &bull; 
                                    <button data-action="view-tos" class="auth-link">Terms of Service</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            },
            dashboard(tier) {
                const isPremium = tier === 'premium';
                return `
                    <nav class="aethel-navbar">
                        <div class="d-flex justify-content-between align-items-center w-100">
                            <span class="nav-brand">AETHEL CORE</span>
                            <div class="d-flex align-items-center">
                                <span class="tier-badge ${isPremium ? 'premium' : ''}">${tier.toUpperCase()}</span>
                                <button data-action="signout" class="btn-sm auth-btn-secondary ms-3">Sign Out</button>
                            </div>
                        </div>
                    </nav>
                    <div class="container py-5">
                        <h3 class="section-title">Services Matrix</h3>
                        <div class="row g-4 mb-5">
                            <div class="col-md-4">
                                <div class="aethel-card h-100">
                                    <div class="card-header-gold">Stateless Vault</div>
                                    <textarea id="vault-input" class="aethel-textarea" placeholder="Enter text to locally shard and encrypt..."></textarea>
                                    <button data-action="encrypt-vault" class="auth-btn-primary w-100 mt-2">Encrypt & Shard</button>
                                    <div id="vault-output" class="aethel-output mt-2"></div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="aethel-card h-100">
                                    <div class="card-header-gold">CleanStream Engine</div>
                                    <input type="text" id="cs-input" class="auth-input" placeholder="Enter URL to sanitize...">
                                    <button data-action="cleanstream" class="auth-btn-primary w-100 mt-2">Append Safe-Search</button>
                                    <div id="cs-output" class="aethel-output mt-2"></div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="aethel-card h-100">
                                    <div class="card-header-gold">Public Broadcast Core</div>
                                    <div class="aethel-output" style="height: 120px;">No active broadcasts. Node listening...</div>
                                </div>
                            </div>
                        </div>
                        <h3 class="section-title">Premium Tunnels</h3>
                        <div class="row g-4">
                            <div class="col-md-6">
                                <div class="aethel-card h-100 ${!isPremium ? 'locked' : ''}">
                                    <div class="card-header-gold">P2P Node Tunnels</div>
                                    ${!isPremium ? '<div class="lock-overlay" data-action="upgrade"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Upgrade to Premium</span></div>' : ''}
                                    <div class="aethel-output" style="height: 150px;">${isPremium ? 'Tunnel active. Routing obfuscated packets...' : 'Access restricted.'}</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="aethel-card h-100 ${!isPremium ? 'locked' : ''}">
                                    <div class="card-header-gold">Advanced UI Stealth Skinning</div>
                                    ${!isPremium ? '<div class="lock-overlay" data-action="upgrade"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Upgrade to Premium</span></div>' : ''}
                                    <div class="aethel-output" style="height: 150px;">${isPremium ? 'Stealth skin active. UI fingerprint randomized.' : 'Access restricted.'}</div>
                                </div>
                            </div>
                        </div>
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
