
import * as exportUtils from './export.js';

export function injectUserExportSection(root) {
  if (!root || root.querySelector('#userExportSection')) return;
  const section = document.createElement('div');
  section.id = 'userExportSection';
  section.className = 'card shadow my-4';
  section.innerHTML = `
    <div class="card-header bg-secondary text-white">
      <h5 class="mb-0"><i class="bi bi-cloud-arrow-down"></i> Export, Backup & Restore</h5>
    </div>
    <div class="card-body">
      <div class="list-group mb-3">
        <button class="list-group-item list-group-item-action" id="userExportPatients"><i class="bi bi-people me-2"></i> Export Patients</button>
        <button class="list-group-item list-group-item-action" id="userExportVisits"><i class="bi bi-journal-medical me-2"></i> Export Visits</button>
        <button class="list-group-item list-group-item-action" id="userExportServices"><i class="bi bi-ui-checks-grid me-2"></i> Export Services</button>
        <button class="list-group-item list-group-item-action" id="userExportRegisters"><i class="bi bi-clipboard-data me-2"></i> Export Registers</button>
        <button class="list-group-item list-group-item-action" id="userExportAll"><i class="bi bi-cloud-arrow-up me-2"></i> Export All (Setup)</button>
        <button class="list-group-item list-group-item-action" id="userBackupBtn"><i class="bi bi-download me-2"></i> Download System Backup</button>
        <label class="list-group-item list-group-item-action" style="cursor:pointer;">
          <i class="bi bi-upload me-2"></i> Restore System Backup
          <input type="file" id="userRestoreFile" accept="application/json" hidden>
        </label>
      </div>
      <div id="userExportMsg" class="small mt-2 text-muted"></div>
    </div>
  `;

  root.prepend(section);

  section.querySelector('#userExportPatients').onclick = () => {
    const encrypted = exportUtils.encryptData(JSON.stringify({patients: db.patients||[]}));
    const blob = new Blob([encrypted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patients.json';
    a.click();
    URL.revokeObjectURL(url);
    section.querySelector('#userExportMsg').textContent = 'Patients exported (encrypted).';
  };
  section.querySelector('#userExportVisits').onclick = () => {
    const encrypted = exportUtils.encryptData(JSON.stringify({visits: db.visits||[]}));
    const blob = new Blob([encrypted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visits.json';
    a.click();
    URL.revokeObjectURL(url);
    section.querySelector('#userExportMsg').textContent = 'Visits exported (encrypted).';
  };
  section.querySelector('#userExportServices').onclick = () => {
    const encrypted = exportUtils.encryptData(JSON.stringify({services: db.services||[]}));
    const blob = new Blob([encrypted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'services.json';
    a.click();
    URL.revokeObjectURL(url);
    section.querySelector('#userExportMsg').textContent = 'Services exported (encrypted).';
  };
  section.querySelector('#userExportRegisters').onclick = () => {
    const encrypted = exportUtils.encryptData(JSON.stringify({registers: db.registers||[]}));
    const blob = new Blob([encrypted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registers.json';
    a.click();
    URL.revokeObjectURL(url);
    section.querySelector('#userExportMsg').textContent = 'Registers exported (encrypted).';
  };
  section.querySelector('#userExportAll').onclick = () => {
    const setupData = {
      facility: db.facility,
      settings: db.settings,
      users: db.users,
      registers: db.registers,
      roles: db.roles,
      servicesList: db.servicesList,
      customPatientFields: db.customPatientFields
    };
    const encrypted = exportUtils.encryptData(JSON.stringify(setupData));
    const blob = new Blob([encrypted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'system-setup.json';
    a.click();
    URL.revokeObjectURL(url);
    section.querySelector('#userExportMsg').textContent = 'All data exported (encrypted).';
  };

  section.querySelector('#userBackupBtn').onclick = () => {
    const encrypted = exportUtils.encryptData(JSON.stringify(db));
    const blob = new Blob([encrypted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thynktech-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    section.querySelector('#userExportMsg').textContent = 'Encrypted system backup downloaded.';
  };

  section.querySelector('#userRestoreFile').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Are you sure you want to restore from backup? This will overwrite all current data.')) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let decrypted;
        try {
          decrypted = exportUtils.decryptData(ev.target.result);
        } catch {
          decrypted = ev.target.result; // fallback to plain text (legacy)
        }
        const restored = JSON.parse(decrypted);
        Object.keys(db).forEach(k => delete db[k]);
        Object.assign(db, restored);
        if (typeof saveDb === 'function') saveDb();
        section.querySelector('#userExportMsg').textContent = 'Restore complete. Please reload the page.';
      } catch (err) {
        section.querySelector('#userExportMsg').textContent = 'Restore failed: Invalid or corrupted encrypted file.';
      }
    };
    reader.readAsText(file);
  };
}
import { db, saveDb } from './db.js';

export function renderLogin(container) {

  container.innerHTML = `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card shadow">
            <div class="card-header bg-primary text-white">
              <h2 class="mb-0"><i class="bi bi-person-lock"></i> Thynktech Login</h2>
            </div>
            <div class="card-body">
              <form id="loginForm" autocomplete="off">
                <div class="mb-3">
                  <input type="text" class="form-control" id="username" placeholder="Username" required autofocus>
                </div>
                <div class="mb-3">
                  <input type="password" class="form-control" id="password" placeholder="Password" required>
                </div>
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-box-arrow-in-right"></i> Login</button>
              </form>
              <div id="importSetupContainer" class="mt-3">
                <button id="importSetupBtn" class="btn btn-outline-secondary w-100 mb-2"><i class="bi bi-upload"></i> Import Setup</button>
                <input type="file" id="importSetupFile" accept="application/json" style="display:none">
                <div id="importSetupMsg" class="small mt-2 text-muted"></div>
              </div>
              <div id="loginError" class="alert alert-danger mt-3 d-none"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('loginForm').onsubmit = function(e) {
    e.preventDefault();
    const username = this.username.value.trim();
    const password = this.password.value;
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
      db.currentUser = user;
      saveDb();
      if (user.role && user.role.toLowerCase() === "admin") {
        window.location.hash = "#admin-dashboard";
      } else {
        window.location.hash = "#user-dashboard";
      }
    } else {
      const err = document.getElementById("loginError");
      err.textContent = "Invalid username or password!";
      err.classList.remove("d-none");
    }
  }

  const btn = document.getElementById('importSetupBtn');
  const fileInput = document.getElementById('importSetupFile');
  const msg = document.getElementById('importSetupMsg');
  if (btn && fileInput && msg) {
    btn.onclick = () => fileInput.click();
    fileInput.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        try {
          const setup = JSON.parse(ev.target.result);
          if (!setup.users || !setup.registers) throw new Error('Invalid setup file');
          db.facility = setup.facility || {};
          db.settings = setup.settings || {};
          db.users = setup.users || [];
          db.registers = setup.registers || [];
          db.roles = setup.roles || [];
          db.servicesList = setup.servicesList || [];
          db.customPatientFields = setup.customPatientFields || [];
          saveDb();
          msg.textContent = 'Setup imported! You can now log in.';
          msg.className = 'small mt-2 text-success';
        } catch (err) {
          msg.textContent = 'Import failed: Invalid or corrupted setup file.';
          msg.className = 'small mt-2 text-danger';
        }
      };
      reader.readAsText(file);
    };
  }
}
