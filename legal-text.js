window.AethelLegal = {
    privacyPolicy: `
        <div class="legal-container">
            <h2 class="legal-title" style="color: #00E5A0;">E2E Cryptography Privacy Policy</h2>
            <div class="legal-content" style="color: #E0E0DC; font-size: 0.95rem; line-height: 1.6; margin-top: 1rem;">
                <h4 style="color: #8B9BB4; margin-top: 1.5rem;">1. Zero-Knowledge Architecture</h4>
                <p>Aethel Core operates strictly on a Zero-Knowledge, End-to-End Encrypted (E2EE) framework. Utilizing the native WebCrypto API, all file encryption (AES-GCM 256-bit) occurs locally in your browser thread. We do not possess the capability to decrypt, view, or intercept your files.</p>
                
                <h4 style="color: #8B9BB4; margin-top: 1.5rem;">2. Key Management & Sovereignty</h4>
                <p>When you encrypt a file, a cryptographically secure symmetric key is generated. This key is displayed to you once and never stored on any server. You assume full responsibility for safeguarding this key. Without it, encrypted payloads are mathematically unrecoverable.</p>

                <h4 style="color: #8B9BB4; margin-top: 1.5rem;">3. Traffic & Metadata</h4>
                <p>We do not log IP addresses, user agents, or traffic metadata. Link sanitization and unshortening requests are routed through secure, tokenized third-party proxies to mask your origin identity.</p>
            </div>
        </div>
    `
};
