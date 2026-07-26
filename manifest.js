{
  "id": "com.aethelcore.secure.pwa",
  "name": "Aethel Core Secure Ecosystem",
  "short_name": "Aethel Core",
  "description": "Enterprise-Grade Decentralized Privacy-Preserving Web Workspace with Sovereign Local WebCrypto Sharding.",
  "lang": "en-GB",
  "start_url": "/index.html?source=pwa",
  "scope": "/",
  "display": "standalone",
  "display_override": [
    "window-controls-overlay",
    "standalone",
    "minimal-ui",
    "browser"
  ],
  "orientation": "portrait",
  "background_color": "#0D0D0C",
  "theme_color": "#0D0D0C",
  "categories": [
    "productivity",
    "utilities",
    "security"
  ],
  "icons": [
    {
      "src": "assets/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "assets/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "assets/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "assets/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "assets/screenshots/desktop-dashboard.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Aethel Core Desktop Dashboard"
    },
    {
      "src": "assets/screenshots/mobile-vault.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Aethel Core Stateless Vault"
    }
  ],
  "shortcuts": [
    {
      "name": "Open Secure Vault",
      "short_name": "Vault",
      "description": "Instantly launch local stateless text encryption workspace.",
      "url": "/index.html?action=vault",
      "icons": [
        {
          "src": "assets/icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "CleanStream Engine",
      "short_name": "CleanStream",
      "description": "Route web requests through the safe-search query interceptor.",
      "url": "/index.html?action=cleanstream",
      "icons": [
        {
          "src": "assets/icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        }
      ]
    }
  ],
  "prefer_related_applications": false,
  "launch_handler": {
    "client_mode": "focus-existing"
  }
}
