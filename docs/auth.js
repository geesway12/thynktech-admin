
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
import { wrapWithLayout } from './layout.js';

export function renderLogin(container) {
  const loginContent = `
    <style>
      .compact-login-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(100vh - 200px);
        padding: 2rem 1rem;
      }
      
      .login-card-compact {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(15px);
        border-radius: 16px;
        box-shadow: 0 15px 35px rgba(25, 118, 210, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 2rem 2rem 1.5rem;
        width: 100%;
        max-width: 380px;
        position: relative;
        animation: cardSlideIn 0.8s ease-out;
      }
      
      @keyframes cardSlideIn {
        0% { transform: translateY(30px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      
      .login-header-compact {
        text-align: center;
        margin-bottom: 1.5rem;
      }
      
      .login-header-compact .logo-compact {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #1976d2, #2196f3);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 0.75rem;
        box-shadow: 0 6px 12px rgba(25, 118, 210, 0.3);
      }
      
      .login-header-compact h1 {
        color: #1976d2;
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0.25rem 0 0.15rem;
      }
      
      .login-header-compact p {
        color: #666;
        font-size: 0.85rem;
        margin: 0;
      }
      
      .form-group-compact {
        margin-bottom: 1.25rem;
        position: relative;
      }
      
      .form-group-compact label {
        color: #1976d2;
        font-weight: 600;
        font-size: 0.85rem;
        margin-bottom: 0.4rem;
        display: block;
      }
      
      .form-control-compact {
        width: 100%;
        padding: 0.75rem 0.875rem;
        border: 2px solid #e3f2fd;
        border-radius: 10px;
        font-size: 0.95rem;
        background: rgba(255, 255, 255, 0.9);
        transition: all 0.3s ease;
        box-sizing: border-box;
      }
      
      .form-control-compact:focus {
        outline: none;
        border-color: #2196f3;
        background: white;
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        transform: translateY(-1px);
      }
      
      .btn-login-compact {
        width: 100%;
        padding: 0.75rem;
        background: linear-gradient(135deg, #1976d2, #2196f3);
        border: none;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        font-size: 0.95rem;
        transition: all 0.3s ease;
        cursor: pointer;
        margin-bottom: 1rem;
      }
      
      .btn-login-compact:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(25, 118, 210, 0.4);
      }
      
      .btn-login-compact:active {
        transform: translateY(0);
      }
      
      .import-section-compact {
        border-top: 1px solid #e3f2fd;
        padding-top: 1rem;
        margin-top: 1rem;
      }
      
      .btn-import-compact {
        width: 100%;
        padding: 0.6rem;
        background: rgba(25, 118, 210, 0.1);
        border: 2px solid #e3f2fd;
        border-radius: 10px;
        color: #1976d2;
        font-weight: 500;
        font-size: 0.85rem;
        transition: all 0.3s ease;
        cursor: pointer;
      }
      
      .btn-import-compact:hover {
        background: rgba(25, 118, 210, 0.15);
        border-color: #2196f3;
      }
      
      .error-message-compact {
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        color: #d32f2f;
        padding: 0.6rem;
        border-radius: 8px;
        margin-top: 0.75rem;
        font-size: 0.85rem;
      }
      
      .success-message-compact {
        background: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
        color: #388e3c;
        padding: 0.6rem;
        border-radius: 8px;
        margin-top: 0.75rem;
        font-size: 0.85rem;
      }
      
      @media (max-width: 768px) {
        .compact-login-container {
          padding: 1rem;
          min-height: calc(100vh - 180px);
        }
        .login-card-compact {
          padding: 1.5rem 1.25rem;
        }
      }
    </style>
    
    <div class="compact-login-container">
      <div class="login-card-compact">
        <div class="login-header-compact">
          <div class="logo-compact">
            <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1>🏥 TechThynk Login</h1>
          <p>Sign in to start healthcare management</p>
        </div>
        
        <form id="loginForm" autocomplete="off">
          <div class="form-group-compact">
            <label for="username">Username</label>
            <input type="text" class="form-control-compact" id="username" placeholder="Enter your username" required autofocus>
          </div>
          
          <div class="form-group-compact">
            <label for="password">Password</label>
            <input type="password" class="form-control-compact" id="password" placeholder="Enter your password" required>
          </div>
          
          <button type="submit" class="btn-login-compact">
            Sign In
          </button>
        </form>
        
        <div class="import-section-compact">
          <button id="importSetupBtn" class="btn-import-compact">
            📁 Import Setup Configuration
          </button>
          <input type="file" id="importSetupFile" accept="application/json" style="display:none">
          <div id="importSetupMsg" class="mt-2"></div>
        </div>
        
        <div id="loginError" class="error-message-compact" style="display:none;"></div>
      </div>
    </div>
  `;

  container.innerHTML = wrapWithLayout(loginContent, 'login', true, true);

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
      err.textContent = "Invalid username or password! Please check your credentials.";
      err.style.display = "block";

      setTimeout(() => {
        err.style.display = "none";
      }, 5000);
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
          msg.innerHTML = '<div class="success-message-compact">✅ Setup imported successfully! You can now log in with your credentials.</div>';
        } catch (err) {
          msg.innerHTML = '<div class="error-message-compact">❌ Import failed: Invalid or corrupted setup file.</div>';
        }
      };
      reader.readAsText(file);
    };
  }
}
