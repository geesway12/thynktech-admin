# TechThynk Admin Interface

This repository contains the production-ready admin interface for TechThynk Health Management System.

## 🌐 Live Demo
[View Admin Interface](https://geesway12.github.io/thynktech-admin/)

## 📁 Repository Structure
```
thynktech-admin/
├── docs/              # Production files (served by GitHub Pages)
│   ├── index.html     # Main admin interface
│   ├── admin.js       # Admin functionality
│   ├── styles.css     # Optimized styles
│   ├── manifest.json  # PWA manifest
│   └── ...            # Other optimized assets
└── README.md          # This file
```

## 📱 Features
- Progressive Web App (PWA)
- Offline functionality
- Patient management
- Visit logging
- Reports and analytics
- User management
- Data export/import

## 🚀 Quick Start
1. Clone this repository:
   ```bash
   git clone https://github.com/geesway12/thynktech-admin.git
   cd thynktech-admin
   ```

2. Serve files using any static server:
   ```bash
   # Option 1: Python
   cd docs && python3 -m http.server 8080
   
   # Option 2: Node.js
   npx serve docs
   
   # Option 3: Live Server (VS Code extension)
   # Right-click on docs/index.html → "Open with Live Server"
   ```

3. Open http://localhost:8080

## 🔧 GitHub Pages Configuration
This repository is configured to serve from the `/docs` folder:
- Go to repository **Settings** → **Pages**
- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/ (root)** → Change to **docs**

## 📋 Last Updated
**2025-07-12T14:25:49.089Z**

## 🔗 Source Repository
Main repository: [TechThynk](https://github.com/geesway12/techthynk)

---
*This is an automatically deployed repository. All changes should be made in the main [techthynk](https://github.com/geesway12/techthynk) repository.*