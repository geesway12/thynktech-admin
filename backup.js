import { db, saveDb } from './db.js';

export function renderBackupRestore(container) {
  container.innerHTML = `
    <div class="container my-4">
      <div class="d-flex align-items-center justify-content-between">
        <h4><i class="bi bi-hdd"></i> Backup & Restore</h4>
      </div>
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h6>Backup Data</h6>
          <p class="small text-muted">Download a backup of all Thynktech system data to your device. Store it securely.</p>
          <button class="btn btn-primary" id="backupBtn"><i class="bi bi-download"></i> Download Backup</button>
        </div>
      </div>
      <div class="card shadow-sm">
        <div class="card-body">
          <h6>Restore Data</h6>
          <p class="small text-muted">Restore data from a Thynktech backup file. <b>This will overwrite all current data.</b></p>
          <input type="file" id="restoreFile" accept=".json" class="form-control mb-2">
          <button class="btn btn-danger" id="restoreBtn"><i class="bi bi-upload"></i> Restore Backup</button>
        </div>
      </div>
      <a href="#admin-dashboard" class="btn btn-link mt-3"><i class="bi bi-arrow-left"></i> Back</a>
      <div id="backupMsg" class="mt-3"></div>
    </div>
  `;

  container.querySelector("#backupBtn").onclick = () => {
    const encrypted = btoa(JSON.stringify(db));
    const blob = new Blob([encrypted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thynktech-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    container.querySelector("#backupMsg").innerHTML = `<div class="alert alert-success">Encrypted backup downloaded.</div>`;
  };

  container.querySelector("#restoreBtn").onclick = () => {
    const fileInput = container.querySelector("#restoreFile");
    const file = fileInput.files[0];
    if (!file) {
      container.querySelector("#backupMsg").innerHTML = `<div class="alert alert-warning">Please select an encrypted backup file to restore.</div>`;
      return;
    }
    if (!confirm("Are you sure you want to restore from backup? This will overwrite all current data.")) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const decrypted = atob(e.target.result);
        const restored = JSON.parse(decrypted);
        Object.keys(db).forEach(k => delete db[k]);
        Object.assign(db, restored);
        saveDb();
        container.querySelector("#backupMsg").innerHTML = `<div class="alert alert-success">Restore complete. Please reload the page.</div>`;
      } catch (err) {
        container.querySelector("#backupMsg").innerHTML = `<div class="alert alert-danger">Restore failed: Invalid or corrupted encrypted file.</div>`;
      }
    };
    reader.readAsText(file);
  };
}