Aethel Core: Zero-Knowledge Cyber Workspace
Live Demo: https://aethel-core.aetherom.workers.dev/

Aethel Core is a Progressive Web App (PWA) designed as a zero-knowledge, client-side cybersecurity suite. Unlike cloud-based tools, all cryptographic operations, file processing, and malware scanning occur entirely in the browser thread. No user data, plaintext, or encryption keys ever leave the device.

🚀 Technical Architecture & Innovation
This project was built to solve a specific problem: How to provide enterprise-grade file processing and cryptography without the liability of hosting user data.

Zero-Knowledge Design: Utilizes the native WebCrypto API (AES-GCM 256-bit) to ensure the server acts merely as a static file host.
Memory-Hard Key Derivation: Dynamically loads WebAssembly (WASM) to execute Argon2id for plausible deniability vaults, making brute-force attacks computationally impossible.
Shamir's Secret Sharing (GF(256)): Custom implementation of finite field arithmetic to split cryptographic keys into distributed shares.
Network-First PWA: Offline-capable architecture using Service Workers, achieving a perfect 100/100 PWA Builder score.
Steganography (LSB): Custom Least Significant Bit algorithm to embed encrypted payloads into the pixel data of PNG carriers.

🛠️ Tech Stack
Frontend: Vanilla JavaScript (ES6+), CSS3, Web Components
Cryptography: WebCrypto API, Argon2-browser (WASM), Ethers.js (BIP39)
PWA: Service Workers, Web App Manifest
Deployment: Cloudflare Workers (Edge Network)

🛡️ Features
File & Media Processing: Malware scanning (SHA-256 signature matching & heuristic macro detection), EXIF/GPS metadata stripping, document conversion (PDF/Word/TXT).
Cryptography: E2E File Encryption, Deniable Vaults, Key Splitting, Offline BIP39 Wallet Generation.
Security & OSINT: Phishing URL Analysis, Dark Web Breach Checking (K-Anonymity SHA-1), TOTP 2FA Generator.

📄 License
MIT License - See LICENSE for details.

⚖️ Legal & Compliance
Built with GDPR/CCPA compliance by design. View the SECURITY.md file for the liability waiver and architecture notes.

2. A SECURITY.md File (Shows Commercial Maturity)
Tech Nation loves to see that you understand the legal and commercial implications of security tools. Create a file named SECURITY.md in your repo:

Security & Privacy Architecture
Zero-Knowledge Liability Waiver
Aethel Core operates strictly on a Zero-Knowledge framework. The application is hosted on Cloudflare's Edge network purely as a static asset delivery system.

No server-side code executes. Therefore:

We do not possess the capability to decrypt, view, or intercept user files.
We do not log IP addresses, user agents, or traffic metadata.
Cryptographic keys are generated locally and never transmitted.
K-Anonymity Implementation
The Dark Web Breach Checker utilizes a K-Anonymity model. Only the first 5 characters of a password's SHA-1 hash are queried against the Have I Been Pwned API, ensuring the plaintext password is never sent over the network.

Reporting a Vulnerability
If you discover a security vulnerability within Aethel Core, please report it immediately by opening a GitHub Issue tagged security. We aim to review and patch security issues within 48 hours.
