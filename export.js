import { db } from './db.js';

function toCSV(data, columns, opts = {}) {
  const header = columns.join(',');
  const rows = data.map(row =>
    columns.map(col => `"${(row[col] ?? '').toString().replace(/"/g, '""')}"`).join(',')
  );
  let csv = [header, ...rows].join('\r\n');
  if (opts.footer) csv += `\r\n${opts.footer}`;
  if (opts.title) csv = `${opts.title}\r\n${csv}`;
  return csv;
}

function facilityMeta() {
  const f = db.facility || {};
  return [
    `Facility: ${f.name || ''}`,
    `Region: ${f.region || ''}`,
    `District: ${f.district || ''}`,
    `Community: ${f.community || ''}`,
    `Contact: ${f.contact || ''}`,
    `Generated: ${new Date().toLocaleString()}`
  ].filter(Boolean).join(' | ');
}

function downloadFile(filename, content, type = "text/csv") {

  if (!filename.endsWith('.html') && !filename.endsWith('.htm')) {
    content = btoa(unescape(encodeURIComponent(content))); // handle unicode
    type = "application/json";
  }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function exportPatientsJSON() {
  const data = {
    meta: {
      type: "patients",
      facility: db.facility || {},
      generated: new Date().toISOString()
    },
    patients: db.patients || []
  };
  const encrypted = encryptData(JSON.stringify(data));
  downloadFile("patients_export.json", encrypted, "application/json");
}

export function exportVisitsJSON() {
  const data = {
    meta: {
      type: "visits",
      facility: db.facility || {},
      generated: new Date().toISOString()
    },
    visits: db.visits || []
  };
  const encrypted = encryptData(JSON.stringify(data));
  downloadFile("visits_export.json", encrypted, "application/json");
}

export function exportServiceDeliveryJSON() {
  const data = {
    meta: {
      type: "services",
      facility: db.facility || {},
      generated: new Date().toISOString()
    },
    services: db.services || []
  };
  const encrypted = encryptData(JSON.stringify(data));
  downloadFile("services_export.json", encrypted, "application/json");
}

export function exportRegistersJSON() {
  const data = {
    meta: {
      type: "registers",
      facility: db.facility || {},
      generated: new Date().toISOString()
    },
    registers: db.registers || []
  };
  const encrypted = encryptData(JSON.stringify(data));
  downloadFile("registers_export.json", encrypted, "application/json");
}

export function exportSummaryReport() {
  const f = db.facility || {};
  const report = [
    `SUMMARY REPORT - ${f.name || ''}`,
    `Region: ${f.region || ''} | District: ${f.district || ''} | Community: ${f.community || ''}`,
    `Contact: ${f.contact || ''}`,
    `----------------------------------------`,
    `Total Patients: ${(db.patients || []).length}`,
    `Total Visits: ${(db.visits || []).length}`,
    `Total Services: ${(db.services || []).length}`,
    `Active Registers: ${(db.registers || []).filter(r => r.status === 'active').length}`,
    `Inactive Registers: ${(db.registers || []).filter(r => r.status === 'inactive').length}`,
    `Report Date: ${new Date().toLocaleString()}`
  ].join('\n');
  downloadFile("summary_report.txt", report, "text/plain");
}

export function exportFullBackup() {
  const data = {
    meta: {
      type: "full-backup",
      facility: db.facility || {},
      generated: new Date().toISOString()
    },
    patients: db.patients || [],
    visits: db.visits || [],
    services: db.services || [],
    registers: db.registers || [],
    customPatientFields: db.customPatientFields || []
  };
  const encrypted = encryptData(JSON.stringify(data));
  downloadFile("full_backup.json", encrypted, "application/json");
}

export async function importEncryptedData(file, onComplete) {
  if (!file) return alert("No file selected");
  const reader = new FileReader();
  reader.onload = function(e) {
    let raw = e.target.result;
    let json = null;
    try {
      json = JSON.parse(decryptData(raw));
    } catch (err) {
      alert("Invalid or corrupted file.\n" + err);
      return;
    }
    if (!json || typeof json !== 'object') {
      alert("Invalid file format");
      return;
    }

    const mergeUnique = (arr, key, existing) => {
      const map = new Map((existing||[]).map(x => [x[key], x]));
      (arr||[]).forEach(x => { if (x && x[key] && !map.has(x[key])) map.set(x[key], x); });
      return Array.from(map.values());
    };
    if (json.patients) db.patients = mergeUnique(json.patients, 'patientID', db.patients);
    if (json.visits) db.visits = mergeUnique(json.visits, 'visitID', db.visits);
    if (json.services) db.services = mergeUnique(json.services, 'serviceID', db.services);
    if (json.registers) db.registers = mergeUnique(json.registers, 'registerID', db.registers);
    if (json.customPatientFields) db.customPatientFields = mergeUnique(json.customPatientFields, 'name', db.customPatientFields);
    if (json.meta && json.meta.facility) db.facility = Object.assign({}, db.facility, json.meta.facility);
    if (typeof onComplete === 'function') onComplete(json);
    saveDb();
    alert("Data imported and merged successfully.");
  };
  reader.readAsText(file);
}

export function exportPatientA4(patientID) {
  const f = db.facility || {};
  const p = (db.patients || []).find(x => x.patientID === patientID);
  if (!p) return alert("Patient not found!");
  const visits = (db.visits || []).filter(v => v.patientID === patientID);
  const services = (db.services || []).filter(s => s.patientID === patientID);

  const fullName = `${p.surname || ''} ${p.otherNames || ''}`.trim();

  const html = `
    <html>
    <head>
      <title>Patient Report - ${fullName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h2 { border-bottom: 1px solid #333; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #999; padding: 6px 8px; }
        th { background: #eee; }
        .facility-header { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
        .facility-meta { font-size: 0.95em; color: #555; margin-bottom: 20px; }
        .footer { margin-top:40px;font-size:12px;color:#888; }
        .logo { max-height: 60px; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      ${f.image ? `<img src="${f.image}" class="logo"><br>` : ""}
      <div class="facility-header">${f.name || ''}</div>
      <div class="facility-meta">
        ${[
          f.region && `Region: ${f.region}`,
          f.district && `District: ${f.district}`,
          f.community && `Community: ${f.community}`,
          f.contact && `Contact: ${f.contact}`
        ].filter(Boolean).join(' | ')}
      </div>
      <h2>Patient Report</h2>
      <table>
        <tr><th>ID</th><td>${p.patientID}</td></tr>
        <tr><th>Name</th><td>${fullName}</td></tr>
        <tr><th>Date of Birth</th><td>${p.dob || ''}</td></tr>
        <tr><th>Age</th><td>${p.age || ''}</td></tr>
        <tr><th>Sex</th><td>${p.sex || ''}</td></tr>
        <tr><th>Phone</th><td>${p.phone || ''}</td></tr>
        <tr><th>Address</th><td>${p.address || ''}</td></tr>
        <tr><th>ID Type</th><td>${p.idType || ''}</td></tr>
        <tr><th>ID Number</th><td>${p.idNumber || ''}</td></tr>
        <tr><th>Registration Date</th><td>${p.registrationDate || ''}</td></tr>
      </table>
      <h3>Visits</h3>
      <table>
        <tr><th>Date</th><th>Service</th><th>Provider</th><th>Notes</th></tr>
        ${visits.map(v => `<tr>
          <td>${v.date || ''}</td>
          <td>${v.service || ''}</td>
          <td>${v.provider || ''}</td>
          <td>${v.notes || ''}</td>
        </tr>`).join('')}
      </table>
      <h3>Services Delivered</h3>
      <table>
        <tr><th>Date</th><th>Service</th><th>Provider</th><th>Outcome</th></tr>
        ${services.map(s => `<tr>
          <td>${s.date || ''}</td>
          <td>${s.service || ''}</td>
          <td>${s.provider || ''}</td>
          <td>${s.outcome || ''}</td>
        </tr>`).join('')}
      </table>
      <footer class="footer">
        ${facilityMeta()}<br>
        Generated: ${new Date().toLocaleString()}
      </footer>
    </body>
    </html>
  `;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.print();
}

export function encryptData(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
export function decryptData(str) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return str; // fallback for legacy/plain files
  }
}