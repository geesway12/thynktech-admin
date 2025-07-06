/* admin.js – Thynktech version */

import { db, saveDb } from './db.js';
import * as exportUtils from './export.js';
// import { renderRegisterMgmt } from './registers.js';
import { renderServiceVisitSelector, renderServiceEntry } from './services.js';
import { renderPatientList } from './patients.js';
import { renderVisitLog } from './visits.js';
import { renderReports } from './reports.js';
import { renderAppointmentList } from './appointments.js';
// themePicker references removed for admin build

// Helper: Check if admin password is expired (older than 30 days)
function isAdminPasswordExpired() {
  const admin = db.users.find(u => u.role?.toLowerCase() === "admin");
  if (!admin) return false;
  const last = admin.lastPasswordChange || 0;
  const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return daysSince > 30;
}

// Helper: Show admin password change modal
function showAdminPasswordChange(root, force = false) {
  const modal = document.createElement("div");
  modal.className = "modal active";
  modal.innerHTML = `
    <div class="modal-content mx-auto" style="max-width:400px;">
      <h5>Change Admin Password</h5>
      ${force ? `<div class="alert alert-warning small">Password expired. Please set a new password.</div>` : ""}
      <form id="adminPassForm">
        <div class="mb-3">
          <label>Current Password</label>
          <input type="password" class="form-control" name="currentPassword" required>
        </div>
        <div class="mb-3">
          <label>New Password</label>
          <input type="password" class="form-control" name="newPassword" required>
        </div>
        <div class="d-flex justify-content-between">
          <button type="submit" class="btn btn-primary btn-sm">Save</button>
          <button type="button" class="btn btn-secondary btn-sm" id="cancelAdminPass">Cancel</button>
        </div>
        <div id="adminPassMsg" class="mt-2 small"></div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById("cancelAdminPass").onclick = () => {
    if (force) return; // Don't allow cancel if forced
    document.body.removeChild(modal);
  };

  document.getElementById("adminPassForm").onsubmit = function(e) {
    e.preventDefault();
    const currentPassword = this.currentPassword.value;
    const newPassword = this.newPassword.value;
    const admin = db.users.find(u => u.role?.toLowerCase() === "admin");
    if (!admin || admin.password !== currentPassword) {
      this.querySelector("#adminPassMsg").textContent = "Current password is incorrect.";
      this.querySelector("#adminPassMsg").className = "text-danger mt-2 small";
      return;
    }
    admin.password = newPassword;
    admin.lastPasswordChange = Date.now();
    saveDb();
    this.querySelector("#adminPassMsg").textContent = "Password updated!";
    this.querySelector("#adminPassMsg").className = "text-success mt-2 small";
    setTimeout(() => document.body.removeChild(modal), 1200);
  };
}

// Facility Setup (ensure lastPasswordChange is set)
export function renderFacilitySetup(root) {
  root.innerHTML = `
    <div class="container my-5">
      <div class="card shadow-lg">
        <div class="card-header bg-primary text-white">
          <h3><i class="bi bi-hospital"></i> Facility Setup</h3>
        </div>
        <div class="card-body">
          <form id="facForm" autocomplete="off">
            <select class="form-select mb-2" id="regionSelect" required>
              <option value="">Select Region</option>
            </select>
            <select class="form-select mb-2" id="districtSelect" required disabled>
              <option value="">Select District</option>
            </select>
            <select class="form-select mb-2" id="subDistrictSelect" required disabled>
              <option value="">Select Sub-district</option>
            </select>
            <select class="form-select mb-2" id="facilitySelect" required disabled>
              <option value="">Select Facility</option>
            </select>
            <input class="form-control mb-2" id="facilityNameManual" placeholder="Facility Name (if not listed)">
            <input class="form-control mb-2" id="community"     placeholder="Community"     required>
            <input class="form-control mb-2" id="latlong"       placeholder="Latitude, Longitude (optional)">
            <input class="form-control mb-2" type="file" id="facilityImage" accept="image/*">
            <input class="form-control mb-3" id="facilityContact" placeholder="Contact Info (optional)">

            <hr><h5>Super-Admin Account</h5>
            <input class="form-control mb-2" id="adminUser" placeholder="Admin Username" required>
            <input class="form-control mb-3" id="adminPass" type="password" placeholder="Admin Password" required>

            <button class="btn btn-primary w-100"><i class="bi bi-save"></i> Save & Continue</button>
          </form>
        </div>
      </div>
    </div>
  `;

  // Begin region/district/sub-district/facility dropdown JS
  // List of region files (these should correspond to your JSON files in the public directory)
  const regionFiles = [
    "data/Ahafo.json",
    "data/Ashanti.json",
    "data/Bono_East.json",
    "data/Bono.json",
    "data/Central.json",
    "data/Eastern.json",
    "data/Greater_Accra.json",
    "data/North_East.json",
    "data/Northern.json",
    "data/Oti.json",
    "data/Savannah.json",
    "data/Upper_East.json",
    "data/Upper_West.json",
    "data/Volta.json",
    "data/Western.json",
    "data/Western_North.json"
  ];
  // Populate regionSelect with file value and plain name as text
  const regionSel = document.getElementById("regionSelect");
  // Use filename as value, plain region name (no spaces) as textContent
  const regionNames = regionFiles.map(f =>
    f.split('/').pop().replace('.json', '').replace(/_/g, ' ')
  );
  regionNames.forEach((r, i) => {
    const opt = document.createElement("option");
    opt.value = regionFiles[i];
    opt.textContent = r;
    regionSel.appendChild(opt);
  });
  // Add fallback "Other" option
  regionSel.appendChild(Object.assign(document.createElement("option"), {value:"Other", textContent:"Other"}));

  const districtSel = document.getElementById("districtSelect");
  const subDistrictSel = document.getElementById("subDistrictSelect");
  const facilitySel = document.getElementById("facilitySelect");
  const facilityManual = document.getElementById("facilityNameManual");

  // Helper to clear and disable child selects
  function resetSelect(sel, label) {
    sel.innerHTML = `<option value="">Select ${label}</option>`;
    sel.disabled = true;
  }

  regionSel.addEventListener("change", async function() {
    resetSelect(districtSel, "District");
    resetSelect(subDistrictSel, "Sub-district");
    resetSelect(facilitySel, "Facility");
    facilityManual.value = "";
    if (!regionSel.value || regionSel.value === "Other") {
      districtSel.disabled = true;
      subDistrictSel.disabled = true;
      facilitySel.disabled = true;
      // If "Other", allow manual entry in facilityNameManual
      facilityManual.disabled = false;
      return;
    }
    districtSel.disabled = false;
    // Fetch region JSON
    try {
      const res = await fetch(regionSel.value);
      const data = await res.json();
      const districts = [...new Set(data.map(item => item.District))];
      districts.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        districtSel.appendChild(opt);
      });
      // Add fallback
      districtSel.appendChild(Object.assign(document.createElement("option"), {value:"Other", textContent:"Other"}));
    } catch(e) {
      // fallback
      districtSel.appendChild(Object.assign(document.createElement("option"), {value:"Other", textContent:"Other"}));
    }
  });

  districtSel.addEventListener("change", async function() {
    resetSelect(subDistrictSel, "Sub-district");
    resetSelect(facilitySel, "Facility");
    facilityManual.value = "";
    if (!districtSel.value || districtSel.value === "Other" || regionSel.value === "Other") {
      subDistrictSel.disabled = true;
      facilitySel.disabled = true;
      facilityManual.disabled = false;
      return;
    }
    subDistrictSel.disabled = false;
    // Fetch region JSON again to get sub-districts
    try {
      const res = await fetch(regionSel.value);
      const data = await res.json();
      const subDistricts = [...new Set(data.filter(item => item.District === districtSel.value).map(item => item["Sub-district"]))];
      subDistricts.forEach(sd => {
        const opt = document.createElement("option");
        opt.value = sd;
        opt.textContent = sd;
        subDistrictSel.appendChild(opt);
      });
      // Add fallback
      subDistrictSel.appendChild(Object.assign(document.createElement("option"), {value:"Other", textContent:"Other"}));
    } catch(e) {
      subDistrictSel.appendChild(Object.assign(document.createElement("option"), {value:"Other", textContent:"Other"}));
    }
  });

  subDistrictSel.addEventListener("change", async function() {
    resetSelect(facilitySel, "Facility");
    facilityManual.value = "";
    if (!subDistrictSel.value || subDistrictSel.value === "Other" || districtSel.value === "Other" || regionSel.value === "Other") {
      facilitySel.disabled = true;
      facilityManual.disabled = false;
      return;
    }
    facilitySel.disabled = false;
    // Fetch region JSON again to get facilities
    try {
      const res = await fetch(regionSel.value);
      const data = await res.json();
      const facilities = data
        .filter(item => item.District === districtSel.value && item["Sub-district"] === subDistrictSel.value)
        .map(item => item.Facility);
      facilities.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f;
        opt.textContent = f;
        facilitySel.appendChild(opt);
      });
      // Add fallback
      facilitySel.appendChild(Object.assign(document.createElement("option"), {value:"Other", textContent:"Other"}));
    } catch(e) {
      facilitySel.appendChild(Object.assign(document.createElement("option"), {value:"Other", textContent:"Other"}));
    }
  });

  facilitySel.addEventListener("change", function() {
    if (facilitySel.value === "Other" || !facilitySel.value) {
      facilityManual.disabled = false;
    } else {
      facilityManual.disabled = true;
      facilityManual.value = "";
    }
  });
  // If user types in manual name, deselect facilitySelect
  facilityManual.addEventListener("input", function() {
    if (facilityManual.value.trim()) {
      facilitySel.value = "";
    }
  });

  // End dropdown JS

  document.getElementById("facForm").onsubmit = e => {
    e.preventDefault();
    // Use facilitySelect value, else facilityNameManual
    const facilityName = e.target.facilitySelect.value && e.target.facilitySelect.value !== "Other"
      ? e.target.facilitySelect.value
      : e.target.facilityNameManual.value.trim() || e.target.facilityName.value.trim();
    db.facility = {
      name : facilityName,
      region: (() => {
        if (e.target.regionSelect.value === "Other") return "Other";
        const idx = regionFiles.indexOf(e.target.regionSelect.value);
        return idx >= 0 ? regionNames[idx] : "";
      })(),
      district: e.target.districtSelect.value === "Other" ? "Other" : e.target.districtSelect.value,
      subDistrict: e.target.subDistrictSelect.value === "Other" ? "Other" : e.target.subDistrictSelect.value,
      community : e.target.community.value,
      latlong   : e.target.latlong.value,
      image     : e.target.facilityImage.files[0] ? URL.createObjectURL(e.target.facilityImage.files[0]) : null,
      contact   : e.target.facilityContact.value
    };
    db.users = [{
      username: e.target.adminUser.value,
      password: e.target.adminPass.value,
      role: "Admin",
      lastPasswordChange: Date.now()
    }];
    db.roles = [{ name: "Admin", permissions: ["all"] }];
    db.currentUser = db.users[0];
    saveDb();
    window.location.hash = "#admin-dashboard";
  };
}

/* ------------------------------------------------------------------ */
/*  2.  Admin Dashboard                                               */
/* ------------------------------------------------------------------ */
export function renderAdminDashboard(root) {
  // Force password change if expired
  if (isAdminPasswordExpired()) {
    showAdminPasswordChange(root, true);
  }

  const f = db.facility || {};
  // Show admin username in meta if logged in
  let adminUser = db.currentUser && db.currentUser.role?.toLowerCase() === 'admin' ? db.currentUser.username : '';
  const meta = `
    <div class="alert alert-info small mb-2 d-flex align-items-center">
      <img src="${f.image || 'logo.png'}" height="36" class="me-2" style="border-radius:8px;">
      <b>${f.name || ''}</b>
      <span class="ms-2 text-muted">${f.region || ''} / ${f.district || ''} / ${f.community || ''}</span>
      ${adminUser ? `<span class='ms-auto'><a href="#profile" id="adminProfileLink" class="text-decoration-none text-dark"><i class='bi bi-person-circle'></i> <b>${adminUser}</b></a></span>` : ''}
    </div>`;
  // Prompt for password update if expired (after render)
  setTimeout(() => {
    if (db.currentUser && db.currentUser.lastPasswordChange) {
      const daysSince = (Date.now() - db.currentUser.lastPasswordChange) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) {
        alert('Your password is expired. Please update your password.');
        window.location.hash = '#profile';
      }
    }
  }, 200);

  // Profile link click (delegated)
  setTimeout(() => {
    const profileLink = document.getElementById('adminProfileLink');
    if (profileLink) {
      profileLink.onclick = (e) => {
        e.preventDefault();
        window.location.hash = '#profile';
      };
    }
    // Appointments quick action and View All button
    root.querySelectorAll('a[href="#appointments"]').forEach(aptLink => {
      aptLink.onclick = (e) => {
        e.preventDefault();
        let appRoot = document.getElementById('app') || root;
        renderAppointmentList(appRoot);
        window.location.hash = '#appointments';
      };
    });
  }, 100);

  root.innerHTML = `
  <style>
    @media (min-width: 768px) {
      .dashboard-row-equal {
        display: flex;
        flex-wrap: wrap;
      }
      .dashboard-row-equal > [class^='col-'] {
        display: flex;
        flex-direction: column;
      }
      .dashboard-row-equal .card {
        flex: 1 1 auto;
        height: 100%;
        min-height: 350px;
      }
    }
    @media (max-width: 767.98px) {
      .dashboard-row-equal .card {
        min-height: unset;
      }
    }
  </style>
  <div class="container my-4">
    ${db.facility ? meta : ""}
    <div class="row mt-4 g-3 dashboard-row-equal">
      <div class="col-12 col-md-6 d-flex">
        <div class="card shadow mb-4 flex-fill">
          <div class="card-body d-flex flex-column">
            <h5><i class="bi bi-person-gear"></i> Admin Quick Actions</h5>
            <div class="list-group mb-3 flex-grow-1">
              <a href="#user-mgmt" class="list-group-item list-group-item-action"><i class="bi bi-people me-2"></i>User Management</a>
              <a href="#patient-reg" class="list-group-item list-group-item-action"><i class="bi bi-person-plus me-2"></i>Patient Registration</a>
              <a href="#visit-log" class="list-group-item list-group-item-action"><i class="bi bi-journal-text me-2"></i>Visit Logging</a>
              <a href="#register-mgmt" class="list-group-item list-group-item-action"><i class="bi bi-journals me-2"></i>Register Management</a>
              <a href="#appointments" class="list-group-item list-group-item-action"><i class="bi bi-calendar-event me-2"></i>Appointments</a>
              <a href="#reports" class="list-group-item list-group-item-action"><i class="bi bi-bar-chart me-2"></i>Reports</a>
              ${ db.registers?.length
                  ? `<a href="#service-entry?reg=${encodeURIComponent(db.registers[0].name)}" class="list-group-item list-group-item-action"><i class="bi bi-clipboard-plus me-2"></i>Open Service Registers</a>`
                  : "" }
              <a href="#admin-export" class="list-group-item list-group-item-action"><i class="bi bi-cloud-arrow-down me-2"></i>Export & Backup</a>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-6 d-flex">
        <div class="card shadow mb-4 flex-fill">
          <div class="card-body d-flex flex-column">
            <h5><i class="bi bi-calendar-event"></i> Appointments</h5>
            <div id="adminAptList" class="flex-grow-1"></div>
            <div class="text-end mt-3">
              <a href="#appointments" class="btn btn-outline-primary btn-sm"><i class="bi bi-calendar-event"></i> View All</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  `;
  // Re-render upcoming appointments if db changes (optional: for live updates)
  // If you want to update after marking as completed, call renderUpcomingAppointments() again after saveDb().
  // For now, we call it once on dashboard load.

  // --- Top 10 Upcoming Appointments ---
  function renderUpcomingAppointments() {
    const listDiv = root.querySelector('#adminAptList');
    if (!listDiv) return;
    // Show all appointments for the next 7 days (including today), any status
    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);
    let appointments = (db.appointments || [])
      .filter(a => a.appointmentDate)
      .map(a => ({
        ...a,
        due: new Date(a.appointmentDate)
      }))
      .filter(a => !isNaN(a.due) && a.due >= new Date(today.toDateString()) && a.due <= weekFromNow)
      .sort((a, b) => a.due - b.due)
      .slice(0, 10);

    if (!appointments.length) {
      listDiv.innerHTML = `<div class="text-muted small">No upcoming appointments for this week.</div>`;
      return;
    }

    listDiv.innerHTML = `
      <ul class="list-group list-group-flush">
        ${appointments.map(a => {
          const daysLeft = Math.ceil((a.due - today) / (1000*60*60*24));
          let badge = '';
          if (daysLeft < 0) badge = '<span class="badge bg-danger ms-2">Overdue</span>';
          else if (daysLeft === 0) badge = '<span class="badge bg-warning text-dark ms-2">Today</span>';
          else if (daysLeft <= 3) badge = `<span class="badge bg-info text-dark ms-2">${daysLeft} day${daysLeft>1?'s':''}</span>`;
          let statusBadge = '';
          if (a.status) {
            let color = a.status === 'Completed' ? 'success' : (a.status === 'Scheduled' ? 'primary' : 'secondary');
            statusBadge = `<span class="badge bg-${color} ms-2">${a.status}</span>`;
          }
          return `
            <li class="list-group-item d-flex align-items-center justify-content-between py-2">
              <div>
                <i class="bi bi-person-circle me-1"></i>
                <b>${a.patientName || a.patientID}</b>
                <span class="text-muted small ms-2">${a.serviceType || ''}</span>
              </div>
              <div>
                <span class="small">${a.appointmentDate}</span>
                ${badge} ${statusBadge}
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    `;
  }
  renderUpcomingAppointments();

  // Export buttons removed from dashboard (only present in export/backup page)

  // Removed Change Password button; handled via profile page

  const logoutBtn = root.querySelector("#logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      db.currentUser = null;
      saveDb();
      window.location.hash = "#login";
    };
  }

  // --- Backup/Restore logic ---
  const backupBtn = root.querySelector("#backupBtn");
  if (backupBtn) {
    backupBtn.onclick = () => {
      const encrypted = exportUtils.encryptData(JSON.stringify(db));
      const blob = new Blob([encrypted], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "system-backup.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      root.querySelector("#backupMsg").innerHTML = `<div class="text-success">Encrypted backup downloaded.</div>`;
    };
  }

  const restoreInput = root.querySelector("#restoreFile");
  if (restoreInput) {
    restoreInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm("Are you sure you want to restore from backup? This will overwrite all current data.")) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        try {
          let decrypted;
          try {
            decrypted = exportUtils.decryptData(ev.target.result);
          } catch {
            decrypted = ev.target.result; // Fallback to plain text (legacy)
          }
          const restored = JSON.parse(decrypted);
          Object.keys(db).forEach(k => delete db[k]);
          Object.assign(db, restored);
          saveDb();
          root.querySelector("#backupMsg").innerHTML = `<div class="text-success">Restore complete. Please reload the page.</div>`;
        } catch (err) {
          root.querySelector("#backupMsg").innerHTML = `<div class="text-danger">Restore failed: Invalid or corrupted encrypted file.</div>`;
        }
      };
      reader.readAsText(file);
    });
  }

  // --- Sharing section event handlers ---
  const chooseBtn = root.querySelector("#chooseShareBtn");
  const shareModal = root.querySelector("#shareModal");

  if (chooseBtn && shareModal) {
    chooseBtn.onclick = () => {
      shareModal.className = "active";
      // Dynamic register checkboxes for service entries
      const regSection = `
        <label class="form-label mt-3">Select Specific Registers (optional)</label>
        ${(db.registers || []).map(reg => `
          <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${reg.name}" id="reg-${reg.name}">
            <label class="form-check-label" for="reg-${reg.name}">${reg.name}</label>
          </div>
        `).join("")}
      `;
      shareModal.innerHTML = `
        <div class="modal-content mx-auto">
          <h5>Select Data to Export</h5>
          <form id="shareForm">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="patients" id="sharePatients" checked>
              <label class="form-check-label" for="sharePatients">Patients</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="visits" id="shareVisits" checked>
              <label class="form-check-label" for="shareVisits">Visits</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="services" id="shareServices" checked>
              <label class="form-check-label" for="shareServices">Service Entries</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="registers" id="shareRegisters" checked>
              <label class="form-check-label" for="shareRegisters">Service Registers</label>
            </div>
            ${regSection}
            <div class="d-flex justify-content-between mt-3">
              <button type="submit" class="btn btn-primary btn-sm"><i class="bi bi-check-circle"></i> Export</button>
              <button type="button" class="btn btn-secondary btn-sm" id="cancelShare"><i class="bi bi-x-circle"></i> Cancel</button>
            </div>
          </form>
        </div>`;
      document.getElementById("cancelShare").onclick = () => {
        shareModal.className = ""; shareModal.innerHTML = "";
      };
      document.getElementById("shareForm").onsubmit = e => {
        e.preventDefault();
        const toShare = {};
        if (document.getElementById("sharePatients").checked) toShare.patients = db.patients || [];
        if (document.getElementById("shareVisits").checked) toShare.visits = db.visits || [];
        if (document.getElementById("shareServices").checked) {
          const selectedRegs = Array.from(document.querySelectorAll("input[id^=reg-]:checked")).map(cb => cb.value);
          toShare.services = selectedRegs.length
            ? (db.services || []).filter(s => selectedRegs.includes(s.formName))
            : db.services || [];
        }
        if (document.getElementById("shareRegisters").checked) {
          // Share only selected registers if any are checked, else share all
          const selectedRegs = Array.from(document.querySelectorAll("input[id^=reg-]:checked")).map(cb => cb.value);
          toShare.registers = selectedRegs.length
            ? (db.registers || []).filter(r => selectedRegs.includes(r.name))
            : db.registers || [];
        }
        const encrypted = exportUtils.encryptData(JSON.stringify(toShare));
        const blob = new Blob([encrypted], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "shared-data.json";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        root.querySelector("#shareMsg").innerHTML = `<div class="text-success">Selected data exported. Share via USB or SD card.</div>`;
        shareModal.className = ""; shareModal.innerHTML = "";
      };
    };
  }
  const importSharedInput = root.querySelector("#importSharedFile");
  if (importSharedInput) {
    importSharedInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        try {
          let decrypted;
          try {
            decrypted = exportUtils.decryptData(ev.target.result);
          } catch {
            decrypted = ev.target.result;
          }
          const shared = JSON.parse(decrypted);
          let newCount = { patients: 0, visits: 0, services: 0, registers: 0 };

          shared.patients?.forEach(p => {
            if (!db.patients.some(existing => existing.id === p.id)) {
              db.patients.push(p);
              newCount.patients++;
            }
          });
          shared.visits?.forEach(v => {
            if (!db.visits.some(existing => existing.id === v.id)) {
              db.visits.push(v);
              newCount.visits++;
            }
          });
          shared.services?.forEach(s => {
            if (!db.services.some(existing => existing.id === s.id)) {
              db.services.push(s);
              newCount.services++;
            }
          });
          shared.registers?.forEach(r => {
            if (!db.registers.some(existing =>
              (existing.id && r.id && existing.id === r.id) ||
              (existing.name && r.name && existing.name === r.name)
            )) {
              db.registers.push(r);
              newCount.registers++;
            }
          });

          saveDb();
          root.querySelector("#shareMsg").innerHTML = `<div class="text-success">
            Import complete: ${newCount.patients} patients, ${newCount.visits} visits, ${newCount.services} service entries${newCount.registers ? `, ${newCount.registers} registers` : ""} added.
          </div>`;
        } catch (err) {
          root.querySelector("#shareMsg").innerHTML = `<div class="text-danger">Import failed: Invalid or corrupted file.</div>`;
        }
      };
      reader.readAsText(file);
    });
  }
}

/* ------------------------------------------------------------------ */
/*  3.  User & Role Management                                        */
/* ------------------------------------------------------------------ */
export function renderUserManagement(root) {
  root.innerHTML = `
    <div class="container my-4">
      <div class="card shadow">
        <div class="card-header">
          <h4 class="mb-0"><i class="bi bi-people"></i> User & Role Management</h4>
        </div>
        <div class="card-body">
          <button class="btn btn-primary mb-3" id="addUser"><i class="bi bi-person-plus"></i> Add User</button>
          <table class="table table-bordered table-sm table-hover align-middle">
            <thead class="table-light"><tr><th>Username</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody id="userBody"></tbody>
          </table>
          <hr>
          <h5>Role Management</h5>
          <button class="btn btn-outline-secondary btn-sm mb-2" id="addRole"><i class="bi bi-plus-circle"></i> Add Role</button>
          <ul class="list-group mb-3" id="roleList"></ul>
          <div id="uModal"></div>
          <a href="#admin-dashboard" class="btn btn-link mt-3"><i class="bi bi-arrow-left"></i> Back</a>
        </div>
      </div>
    </div>
  `;

  renderRows();
  renderRoles();

  document.getElementById("addUser").onclick = () => showForm();
  document.getElementById("addRole").onclick = () => showRoleForm();

  function renderRows() {
    document.getElementById("userBody").innerHTML = db.users.map((u, i) => `
      <tr>
        <td>${u.username}</td><td>${u.role}</td>
        <td>
          <button class="btn btn-sm btn-accent me-1" data-i="${i}" data-act="edit"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger" data-i="${i}" data-act="del"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join("");

    document.querySelectorAll("[data-act=edit]").forEach(b => b.onclick = () => showForm(db.users[b.dataset.i], b.dataset.i));
    document.querySelectorAll("[data-act=del]").forEach(b => b.onclick = () => {
      if (confirm("Delete user?")) {
        db.users.splice(b.dataset.i, 1); saveDb(); renderRows();
      }
    });
  }

  function renderRoles() {
    document.getElementById("roleList").innerHTML = db.roles.map((r, i) => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span><b>${r.name}</b> <small class="text-muted">(${r.permissions.join(", ")})</small></span>
        <div>
          <button class="btn btn-sm btn-accent me-1" data-i="${i}" data-act="editRole"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger" data-i="${i}" data-act="delRole"><i class="bi bi-trash"></i></button>
        </div>
      </li>`).join("");

    document.querySelectorAll("[data-act=editRole]").forEach(b => b.onclick = () => showRoleForm(db.roles[b.dataset.i], b.dataset.i));
    document.querySelectorAll("[data-act=delRole]").forEach(b => b.onclick = () => {
      if (confirm("Delete role?")) {
        db.roles.splice(b.dataset.i, 1); saveDb(); renderRoles();
      }
    });
  }

  function showRoleForm(role = {}, idx = null) {
    const m = document.getElementById("uModal");
    const permList = ["patient-reg", "visit-log", "service-entry", "reports", "all"];
    const perms = role.permissions || [];
    m.innerHTML = `
      <div class="modal-content mx-auto">
        <h5>${role.name ? "Edit" : "Add"} Role</h5>
        <form id="rForm" class="mt-2">
          <input class="form-control mb-2" id="rname" placeholder="Role Name" value="${role.name || ""}" required>
          <label class="form-label">Permissions</label>
          ${permList.map(p => `
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="perm-${p}" value="${p}" ${perms.includes(p) ? "checked" : ""}>
              <label class="form-check-label" for="perm-${p}">${p}</label>
            </div>`).join("")}
          <div class="d-flex justify-content-between mt-3">
            <button class="btn btn-primary">${role.name ? "Save" : "Add"}</button>
            <button type="button" class="btn btn-secondary" id="cancelR">Cancel</button>
          </div>
        </form>
      </div>`;
    m.className = "active";
    m.onclick = e => { if (e.target === m) close(); };
    document.getElementById("cancelR").onclick = close;

    document.getElementById("rForm").onsubmit = e => {
      e.preventDefault();
      const newRole = {
        name: e.target.rname.value.trim(),
        permissions: Array.from(e.target.querySelectorAll("input[type=checkbox]:checked")).map(cb => cb.value)
      };
      if (idx !== null) db.roles[idx] = newRole;
      else db.roles.push(newRole);
      saveDb(); close(); renderRoles();
    };
    function close() { m.className = ""; m.innerHTML = ""; }
  }

  function showForm(user = {}, idx = null) {
    const m = document.getElementById("uModal");
    user.assignedRegisters = user.assignedRegisters || [];
    m.innerHTML = `
      <div class="modal-content mx-auto">
        <h5>${user.username ? "Edit" : "Add"} User</h5>
        <form id="uForm" class="mt-2">
          <input class="form-control mb-2" id="uname" placeholder="Username" value="${user.username || ""}" required>
          <input class="form-control mb-2" id="upass" type="password" placeholder="${user.username ? 'New password (optional)' : 'Password'}" ${user.username ? '' : 'required'}>
          <select class="form-select mb-3" id="urole" required>
            <option value="">Role...</option>
            ${db.roles.map(r => `<option ${user.role === r.name ? 'selected' : ''}>${r.name}</option>`).join("")}
          </select>
          <label class="form-label mt-2">Allow Access To:</label>
          <div class="form-check mb-1">
            <input class="form-check-input" type="checkbox" id="canPatientReg" ${user.canPatientReg ? 'checked' : ''}>
            <label class="form-check-label" for="canPatientReg">Patient Registration</label>
          </div>
          <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" id="canVisitLog" ${user.canVisitLog ? 'checked' : ''}>
            <label class="form-check-label" for="canVisitLog">Visit Logging</label>
          </div>
          <label class="form-label">Assigned Service Forms</label>
          <select class="form-select mb-3" id="uregisters" multiple>
            ${db.registers.map(r => `<option value="${r.name}" ${user.assignedRegisters?.includes(r.name) ? "selected" : ""}>${r.name}</option>`).join("")}
          </select>
          <div class="d-flex justify-content-between">
            <button class="btn btn-primary">${user.username ? "Save" : "Add"}</button>
            <button type="button" class="btn btn-secondary" id="cancelU">Cancel</button>
          </div>
        </form>
      </div>`;
    m.className = "active";
    m.onclick = e => { if (e.target === m) close(); };
    document.getElementById("cancelU").onclick = close;

    document.getElementById("uForm").onsubmit = e => {
      e.preventDefault();
      const rec = {
        username: e.target.uname.value.trim(),
        role: e.target.urole.value,
        password: e.target.upass.value || user.password,
        canPatientReg: e.target.canPatientReg.checked,
        canVisitLog: e.target.canVisitLog.checked,
        assignedRegisters: Array.from(e.target.uregisters.selectedOptions).map(o => o.value)
      };
      if (idx !== null) Object.assign(db.users[idx], rec);
      else db.users.push(rec);
      saveDb(); close(); renderRows();
    };
function close() { m.className = ""; m.innerHTML = ""; }
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Export/Import & Backup Page (matches user.js layout)
------------------------------------------------------------------ */
export function renderAdminExportBackupPage(root) {
  const f = db.facility || {};
  const meta = `
    <div class="facility-meta mb-3">
      ${f.image ? `<img src="${f.image}" alt="Facility Logo" style="max-height:60px; margin-bottom:8px;"><br>` : ""}
      <span class="fw-bold">${f.name || ''}</span>
      <div class="text-muted small">
        ${[
          f.region && `Region: ${f.region}`,
          f.district && `District: ${f.district}`,
          f.community && `Community: ${f.community}`,
          f.contact && `Contact: ${f.contact}`
        ].filter(Boolean).join(' | ')}
      </div>
    </div>
  `;

  root.innerHTML = `
    <style>
      @media (min-width: 768px) {
        .dashboard-row-equal {
          display: flex;
          flex-wrap: wrap;
        }
        .dashboard-row-equal > [class^='col-'] {
          display: flex;
          flex-direction: column;
        }
        .dashboard-row-equal .card {
          flex: 1 1 auto;
          height: 100%;
          min-height: 350px;
        }
      }
      @media (max-width: 767.98px) {
        .dashboard-row-equal .card {
          min-height: unset;
        }
      }
    </style>
    <div class="container my-4">
      ${meta}
      <div class="row mt-4 g-3 dashboard-row-equal">
        <div class="col-12 col-md-6 d-flex">
          <div class="card shadow mb-4 flex-fill">
            <div class="card-body d-flex flex-column">
              <h5><i class="bi bi-cloud-arrow-down"></i> Export & Backup</h5>
              <div class="list-group mb-3 flex-grow-1">
                <button class="list-group-item list-group-item-action" id="exportPatients"><i class="bi bi-people me-2"></i> Export Patients</button>
                <button class="list-group-item list-group-item-action" id="exportVisits"><i class="bi bi-journal-medical me-2"></i> Export Visits</button>
                <button class="list-group-item list-group-item-action" id="exportServices"><i class="bi bi-ui-checks-grid me-2"></i> Export Services</button>
                <button class="list-group-item list-group-item-action" id="exportSingle"><i class="bi bi-file-earmark-pdf me-2"></i> Single Patient (PDF)</button>
                <button class="list-group-item list-group-item-action" id="exportRegisters"><i class="bi bi-clipboard-data me-2"></i> Export Registers</button>
                <button class="list-group-item list-group-item-action" id="exportSetup"><i class="bi bi-cloud-arrow-up me-2"></i> Export Setup</button>
                <button class="list-group-item list-group-item-action" id="backupBtn"><i class="bi bi-download me-2"></i> Download Backup</button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-6 d-flex">
          <div class="card shadow mb-4 flex-fill">
            <div class="card-body d-flex flex-column">
              <h5><i class="bi bi-upload"></i> Import & Restore</h5>
              <div class="list-group mb-3 flex-grow-1">
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Import Patients
                  <input type="file" id="importPatients" hidden>
                </label>
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Import Visits
                  <input type="file" id="importVisits" hidden>
                </label>
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Import Services
                  <input type="file" id="importServices" hidden>
                </label>
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Restore Backup
                  <input type="file" id="restoreFile" hidden>
                </label>
              </div>
              <div id="importMsg" class="small mt-2 text-muted"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="text-center mt-4">
        <a href="#admin-dashboard" id="backToDashboardBtn" class="btn btn-link text-primary" style="font-size:1.1rem;">
          <i class="bi bi-arrow-left-circle-fill me-1"></i> Back to Dashboard
        </a>
      </div>
    </div>
  `;

  // Export handlers
  root.querySelector("#exportPatients")?.addEventListener("click", exportUtils.exportPatients);
  root.querySelector("#exportVisits")?.addEventListener("click", exportUtils.exportVisits);
  root.querySelector("#exportServices")?.addEventListener("click", exportUtils.exportServiceDelivery);
  root.querySelector("#exportSingle")?.addEventListener("click", () => {
    const id = prompt("Enter Patient ID to export:");
    if (id) exportUtils.exportPatientA4(id.trim());
  });
  root.querySelector("#exportRegisters")?.addEventListener("click", exportUtils.exportRegisters);
  root.querySelector("#exportSetup")?.addEventListener("click", () => {
    const username = prompt("Enter username to export (leave blank to export all users):");
    let usersToExport = db.users;
    let registersToExport = db.registers;
    if (username) {
      const user = db.users.find(u => u.username === username.trim());
      if (!user) return alert("User not found.");
      usersToExport = [user];
      // Only include registers assigned to this user
      if (Array.isArray(user.assignedRegisters) && user.assignedRegisters.length) {
        registersToExport = db.registers.filter(r => user.assignedRegisters.includes(r.name));
      } else {
        registersToExport = [];
      }
    }
    const setupData = {
      facility: db.facility, // ensures facility metadata (logo, name, etc) is included
      settings: db.settings,
      users: usersToExport,
      registers: registersToExport,
      roles: db.roles,
      servicesList: db.servicesList,
      customPatientFields: db.customPatientFields
    };
    const blob = new Blob([JSON.stringify(setupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "system-setup.json";
    a.click();
    URL.revokeObjectURL(url);
  });
  root.querySelector("#backupBtn")?.addEventListener("click", () => {
    const encrypted = exportUtils.encryptData(JSON.stringify(db));
    const blob = new Blob([encrypted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thynktech-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  });
  root.querySelector("#backToDashboardBtn")?.addEventListener("click", e => {
    e.preventDefault();
    window.location.hash = "#admin-dashboard";
  });

  // Import handlers (stub: you can implement your import logic here)
  root.querySelector("#importPatients")?.addEventListener("change", e => {
    // TODO: implement importPatients logic
    root.querySelector("#importMsg").textContent = "Import Patients not yet implemented.";
  });
  root.querySelector("#importVisits")?.addEventListener("change", e => {
    // TODO: implement importVisits logic
    root.querySelector("#importMsg").textContent = "Import Visits not yet implemented.";
  });
  root.querySelector("#importServices")?.addEventListener("change", e => {
    // TODO: implement importServices logic
    root.querySelector("#importMsg").textContent = "Import Services not yet implemented.";
  });
  root.querySelector("#restoreFile")?.addEventListener("change", e => {
    // TODO: implement restore backup logic
    root.querySelector("#importMsg").textContent = "Restore Backup not yet implemented.";
  });
}
