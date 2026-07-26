/**
 * Aethel Core - Legal & Compliance Text Module
 * UK GDPR / DPA 2018 Compliant | Decentralized Liability Framework
 */

window.AethelLegal = {

    /**
     * UK GDPR & DPA 2018 Privacy Policy Template
     * Emphasizes zero-PII, zero-traffic logging, and tokenized external handlers.
     */
    privacyPolicy: `
        <div class="legal-container aethel-glass-panel">
            <div class="legal-header text-center mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 12l2 2 4-4"></path>
                </svg>
                <h2 class="legal-title" style="color: #FFD700; font-weight: 800; letter-spacing: -0.5px;">Privacy Policy</h2>
                <p class="legal-subtitle" style="color: #8A8A85; font-size: 0.9rem;">UK GDPR & Data Protection Act 2018 Compliant</p>
            </div>

            <div class="legal-content" style="color: #E0E0DC; font-size: 0.95rem; line-height: 1.6;">
                <h4 class="legal-heading" style="color: #D4AF37; margin-top: 2rem;">1. Zero Data Architecture</h4>
                <p>Aethel Core operates on a strict Zero Personal Identifiable Information (Zero-PII) architecture. We do not collect, store, or process your personal data, browsing history, or biometric information on any central server. All cryptographic operations occur locally within your browser thread via the native WebCrypto API.</p>

                <h4 class="legal-heading" style="color: #D4AF37; margin-top: 1.5rem;">2. Traffic & Logging Policy</h4>
                <p>We do not log IP addresses, user agents, or traffic metadata. Aethel Core is engineered as a decentralized toolkit; data packets routed through P2P tunnels or CleanStream are obfuscated and do not pass through Aethel Core-controlled infrastructure.</p>

                <h4 class="legal-heading" style="color: #D4AF37; margin-top: 1.5rem;">3. Tokenized External Handlers</h4>
                <p>To facilitate authentication and payment processing, we utilize tokenized webhooks via secure, GDPR-compliant third-party subprocessors:</p>
                <ul style="color: #A0A0A5; padding-left: 1.5rem;">
                    <li><strong style="color: #E0E0DC;">Authentication:</strong> Handled by Supabase Inc. Email addresses are hashed and tokenized; passwords never touch Aethel Core infrastructure.</li>
                    <li><strong style="color: #E0E0DC;">Payments:</strong> Processed entirely by Stripe Payments Europe Ltd. Aethel Core only receives a cryptographically signed boolean token confirming subscription status.</li>
                </ul>

                <h4 class="legal-heading" style="color: #D4AF37; margin-top: 1.5rem;">4. Local Storage Consent</h4>
                <p>By utilizing Aethel Core, you consent to the local storage of encrypted session shards within your browser's local storage mechanism. This data is ephemeral, inaccessible to our systems, and can be purged by clearing your browser data or using the native "Purge Vault" function.</p>
                
                <h4 class="legal-heading" style="color: #D4AF37; margin-top: 1.5rem;">5. Your Rights (UK GDPR)</h4>
                <p>Under the UK GDPR, you have the right to access, rectify, erase, and restrict the processing of your data. Because Aethel Core holds no such data, these rights are inherently preserved. You maintain 100% sovereignty over your local data shards.</p>
            </div>
        </div>
    `,

    /**
     * Decentralized Terms of Service Template
     * Enforces user liability for routed data and explicitly sets the Age Rating to 17+.
     */
    termsOfService: `
        <div class="legal-container aethel-glass-panel">
            <div class="legal-header text-center mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <h2 class="legal-title" style="color: #FFD700; font-weight: 800; letter-spacing: -0.5px;">Terms of Service</h2>
                <p class="legal-subtitle" style="color: #8A8A85; font-size: 0.9rem;">Decentralized Protocol & User Liability Framework</p>
            </div>

            <div class="legal-content" style="color: #E0E0DC; font-size: 0.95rem; line-height: 1.6;">
                <h4 class="legal-heading" style="color: #D4AF37; margin-top: 2rem;">1. Decentralized Nature of the Platform</h4>
                <p>Aethel Core is a decentralized web workspace, P2P toolkit, and cryptographic routing engine. We do not host, control, or monitor the destination or origination of data packets routed through the platform's node tunnels or CleanStream engine.</p>

                <h4 class="legal-heading" style="color: #D4AF37; margin-top: 1.5rem;">2. User Responsibility & Liability</h4>
                <p>By routing data packets through Aethel Core, you explicitly acknowledge and agree that <strong style="color: #FFD700;">you maintain 100% legal responsibility</strong> for the data, content, and metadata you transmit. You agree not to use the toolkit to violate UK local laws or international regulations regarding illegal content distribution, copyright infringement, or cyber-terrorism.</p>

                <h4 class="legal-heading" style="color: #D4AF37; margin-top: 1.5rem;">3. Age Rating Notice (Mature)</h4>
                <div style="background: rgba(255, 215, 0, 0.05); border: 1px solid #FFD700; border-radius: 8px; padding: 1rem; margin-top: 0.5rem;">
                    <p style="margin: 0; color: #FFD700; font-weight: 700; display: flex; align-items: center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                        </svg>
                        Age 17+ / Mature Rating
                    </p>
                    <p style="margin-top: 10px; margin-bottom: 0; color: #E0E0DC; font-size: 0.9rem;">Due to the uncensored, decentralized nature of P2P web routing and potential exposure to unmoderated web content, Aethel Core is strictly rated for users aged 17 and older. Minors are explicitly prohibited from utilizing the node tunneling or stealth skinning features.</p>
                </div>

                <h4 class="legal-heading" style="color: #D4AF37; margin-top: 1.5rem;">4. Cryptographic Service Availability</h4>
                <p>The WebCrypto subsystem, stateless vault, and local sharding logic are provided "as is" without warranty of absolute unbreakability. While we utilize industry-standard AES-GCM 256-bit encryption, the security of your local session keys is dependent on the physical security of your device.</p>
                
                <h4 class="legal-heading" style="color: #D4AF37; margin-top: 1.5rem;">5. Premium Tier Subscriptions</h4>
                <p>Premium features (P2P Node Tunnels, Advanced UI Stealth Skinning) are gated via Stripe payment integrations. Subscriptions auto-renew monthly. You may cancel at any time; access persists until the end of the current billing cycle. Refunds are subject to Stripe's consumer protection policies.</p>
            </div>
        </div>
    `,

    /**
     * Local Storage & Cookie Consent Banner HTML
     * Functional banner prompting user consent for local crypto-shards.
     */
    consentBanner: `
        <div id="consentBanner" style="position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(13, 13, 12, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-top: 1px solid #FFD700; z-index: 9999; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; transform: translateY(100%); transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);">
            <div style="display: flex; align-items: center; gap: 1rem; max-width: 700px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <p style="margin: 0; color: #E0E0DC; font-size: 0.9rem;">
                    <strong style="color: #FFD700;">Local Sovereignty Notice:</strong> Aethel Core uses local storage to save your encrypted session shards and UI preferences. We log zero traffic and collect zero PII.
                </p>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button id="declineConsent" style="background: transparent; border: 1px solid #4A4A45; color: #A0A0A5; padding: 0.6rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Decline</button>
                <button id="acceptConsent" style="background: linear-gradient(135deg, #FFD700, #D4AF37); border: none; color: #0D0D0C; padding: 0.6rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: 800; transition: all 0.2s; box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);">Accept & Continue</button>
            </div>
        </div>
    `
};
