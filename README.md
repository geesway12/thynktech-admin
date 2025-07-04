# ThynkTech

**ThynkTech** is a modern, offline-first, modular health records & register app (PWA) for rural clinics and health posts.

## Features

- IPS-compliant patient registration with smart ID
- Digitize *any* paper register (form builder)
- Custom fields and XLSForm-like data types (text, date, image, QR, etc.)
- Role-based access (admin, nurse, records, clinician, custom)
- Full visit logging and service records
- CSV export for all records (patients, visits, services)
- Data never leaves device/network unless exported
- PWA: installable, works offline, secure local backup/restore

## Getting Started

1. **Clone/download** the repo
2. Place all files in one folder, including:
    - `index.html`
    - `app.js`, `db.js`, `utils.js`, `formsUtils.js`, etc.
    - `manifest.json`
    - `icon-192.png`, `icon-512.png`
3. Open `index.html` in your browser (or serve via a local web server)
4. On first run, complete facility setup and create super admin
5. Build registers/forms, users, and start data capture!

## Development

- Written in vanilla JS, Bootstrap 5, and PWA standards
- Data is stored **locally** in browser (IndexedDB/localStorage)
- **No server or external API required**
- Ready for extension and integration with national systems

## Customization

- Add or edit registers via the **Register Management** module (drag-and-drop, add custom fields)
- Create new roles and assign specific module or register access
- Use service worker for full offline support (add `service-worker.js`)

## License

MIT — feel free to use and adapt for your facility or project!

---

*Built for the realities of rural Africa, by [Your Name/Team].*
