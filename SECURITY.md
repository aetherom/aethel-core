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
