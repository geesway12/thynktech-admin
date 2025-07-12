
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
      body {
        background: linear-gradient(135deg, #FFB020 0%, #FF8C00 50%, #FFA500 100%);
        margin: 0;
        padding: 0;
        min-height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      }
      
      .thynktech-login-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 2rem 1rem;
        background: linear-gradient(135deg, #FFB020 0%, #FF8C00 50%, #FFA500 100%);
      }
      
      .thynktech-login-card {
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        padding: 2.5rem;
        width: 100%;
        max-width: 420px;
        position: relative;
        animation: loginSlideIn 0.6s ease-out;
      }
      
      @keyframes loginSlideIn {
        0% { transform: translateY(20px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      
      .thynktech-login-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      
      .thynktech-flag {
        width: 24px;
        height: 16px;
        background: linear-gradient(to bottom, #CE1126 33%, #FCD116 33% 66%, #006B3F 66%);
        border-radius: 2px;
        display: inline-block;
        margin-right: 8px;
        vertical-align: middle;
      }
      
      .thynktech-login-header h1 {
        color: #333;
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0.5rem 0 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .thynktech-login-header p {
        color: #666;
        font-size: 0.95rem;
        margin: 0;
        font-weight: 400;
      }
      
      .thynktech-form-group {
        margin-bottom: 1.5rem;
        position: relative;
      }
      
      .thynktech-form-group label {
        color: #FFB020;
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
        display: block;
      }
      
      .thynktech-form-control {
        width: 100%;
        padding: 0.875rem 1rem;
        border: 2px solid #E5E5E5;
        border-radius: 12px;
        font-size: 1rem;
        background: #F9F9F9;
        transition: all 0.3s ease;
        box-sizing: border-box;
        color: #333;
      }
      
      .thynktech-form-control:focus {
        outline: none;
        border-color: #FFB020;
        background: white;
        box-shadow: 0 0 0 3px rgba(255, 176, 32, 0.1);
      }
      
      .thynktech-btn-login {
        width: 100%;
        padding: 0.875rem;
        background: linear-gradient(135deg, #FFB020, #FF8C00);
        border: none;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        font-size: 1rem;
        transition: all 0.3s ease;
        cursor: pointer;
        margin-bottom: 1.5rem;
        text-transform: none;
      }
      
      .thynktech-btn-login:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(255, 140, 0, 0.3);
        background: linear-gradient(135deg, #FF8C00, #FFB020);
      }
      
      .thynktech-btn-login:active {
        transform: translateY(0);
      }
      
      .thynktech-register-link {
        text-align: center;
        margin-bottom: 1.5rem;
      }
      
      .thynktech-register-link a {
        color: #FFB020;
        text-decoration: none;
        font-weight: 500;
        font-size: 0.95rem;
      }
      
      .thynktech-register-link a:hover {
        text-decoration: underline;
      }
      
      .thynktech-import-section {
        border-top: 1px solid #E5E5E5;
        padding-top: 1.5rem;
        margin-top: 1rem;
      }
      
      .thynktech-btn-import {
        width: 100%;
        padding: 0.75rem;
        background: #CCCCCC;
        border: none;
        border-radius: 12px;
        color: #666;
        font-weight: 500;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .thynktech-btn-import:hover {
        background: #B8B8B8;
      }
      
      .thynktech-error-message {
        background: rgba(220, 53, 69, 0.1);
        border: 1px solid rgba(220, 53, 69, 0.3);
        color: #dc3545;
        padding: 0.75rem;
        border-radius: 8px;
        margin-top: 1rem;
        font-size: 0.9rem;
      }
      
      .thynktech-success-message {
        background: rgba(25, 135, 84, 0.1);
        border: 1px solid rgba(25, 135, 84, 0.3);
        color: #198754;
        padding: 0.75rem;
        border-radius: 8px;
        margin-top: 1rem;
        font-size: 0.9rem;
      }
      
      @media (max-width: 768px) {
        .thynktech-login-container {
          padding: 1rem;
        }
        
        .thynktech-login-card {
          padding: 2rem 1.5rem;
        }
      }
    </style>

    <div class="thynktech-login-container">
      <div class="thynktech-login-card">
        <div class="thynktech-login-header">
          <h1>
            <span class="thynktech-flag"></span>
            ThynkTech Login
          </h1>
          <p>Sign in to start managing healthcare responsibly</p>
        </div>
        
        <form id="loginForm">
          <div class="thynktech-form-group">
            <label for="username">Email Address</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              class="thynktech-form-control" 
              required 
              autocomplete="username"
            >
          </div>
          
          <div class="thynktech-form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              class="thynktech-form-control" 
              required 
              autocomplete="current-password"
            >
          </div>
          
          <button type="submit" class="thynktech-btn-login">
            Login
          </button>
        </form>
        
        <div class="thynktech-register-link">
          <a href="#register" onclick="showRegisterForm()">Register here</a>
        </div>
        
        <div class="thynktech-import-section" id="importSection" style="display: none;">
          <button type="button" class="thynktech-btn-import" onclick="showImportOptions()">
            🔧 Member Data Import Setup
          </button>
        </div>
        
        <div id="loginMessage"></div>
      </div>
    </div>
  `;

  container.innerHTML = loginContent;

  const isAdminPage = window.location.pathname.includes('/admin/') || 
                      window.location.href.includes('/admin/') ||
                      document.title.includes('Admin');

  const shouldShowImport = !isAdminPage;

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
      const messageDiv = document.getElementById("loginMessage");
      messageDiv.innerHTML = '<div class="thynktech-error-message">Invalid username or password! Please check your credentials.</div>';

      setTimeout(() => {
        messageDiv.innerHTML = '';
      }, 5000);
    }
  }

  if (shouldShowImport) {
    document.getElementById('importSection').style.display = 'block';
  }

  window.showImportOptions = function() {
    if (!shouldShowImport) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = function(e) {
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
          const messageDiv = document.getElementById("loginMessage");
          messageDiv.innerHTML = '<div class="thynktech-success-message">✅ Setup imported successfully! You can now log in with your credentials.</div>';
        } catch (err) {
          const messageDiv = document.getElementById("loginMessage");
          messageDiv.innerHTML = '<div class="thynktech-error-message">❌ Import failed: Invalid or corrupted setup file.</div>';
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  window.showRegisterForm = function() {

    console.log('Register functionality - to be implemented');
  }
}
