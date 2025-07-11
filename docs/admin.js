import { renderProfile, isPasswordExpired, showModal } from './helpers.js';

import { db, saveDb } from './db.js';
import * as exportUtils from './export.js';
import { renderRegisterMgmt } from './registers.js'; // admin only
import { renderServiceVisitSelector, renderServiceEntry } from './services.js';
import { renderPatientList } from './patients.js';
import { renderVisitLog } from './visits.js';
import { renderReports } from './reports.js';
import { renderAppointmentList } from './appointments.js';

function isAdminPasswordExpired() {
  const admin = db.users.find(u => u.role?.toLowerCase() === "admin");
  if (!admin) return false;
  const last = admin.lastPasswordChange || 0;
  const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return daysSince > 30;
}

function showAdminPasswordChange(root, force = false) {
  const content = `
    <div style="max-width:400px;">
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

  const closeModal = showModal(content, force ? null : (() => {}));

  document.getElementById("cancelAdminPass").onclick = () => {
    if (force) return; // Don't allow cancel if forced
    closeModal();
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
    setTimeout(() => closeModal(), 1200);
  };
}

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

  const regionSel = document.getElementById("regionSelect");

  const regionNames = regionFiles.map(f =>
    f.split('/').pop().replace('.json', '').replace(/_/g, ' ')
  );
  regionNames.forEach((r, i) => {
    const opt = document.createElement("option");
    opt.value = regionFiles[i];
    opt.textContent = r;
    regionSel.appendChild(opt);
  });

  regionSel.appendChild(Object.assign(document.createElement("option"), {value:"Other", textContent:"Other"}));

  const districtSel = document.getElementById("districtSelect");
  const subDistrictSel = document.getElementById("subDistrictSelect");
  const facilitySel = document.getElementById("facilitySelect");
  const facilityManual = document.getElementById("facilityNameManual");

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

      facilityManual.disabled = false;
      return;
    }
    districtSel.disabled = false;

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

      districtSel.appendChild(Object.assign(document.createElement("option"), {value:"Other", textContent:"Other"}));
    } catch(e) {

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

  facilityManual.addEventListener("input", function() {
    if (facilityManual.value.trim()) {
      facilitySel.value = "";
    }
  });


  document.getElementById("facForm").onsubmit = e => {
    e.preventDefault();

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



export function renderAdminDashboard(root) {

  if (isPasswordExpired(db.currentUser)) {
    setTimeout(() => {
      alert('Your password is expired. Please update your password.');
      renderProfile(root, {
        getUser: () => db.currentUser,
        updateUser: (u) => { db.currentUser = u; saveDb(); },
        dashboardHash: '#admin-dashboard'
      });
    }, 500);
  }

  const f = db.facility || {};

  let adminUser = db.currentUser && db.currentUser.role?.toLowerCase() === 'admin' ? db.currentUser.username : '';
  const meta = `
    <div class="alert alert-info small mb-2 d-flex align-items-center">
      <img src="${f.image || 'logo.png'}" height="36" class="me-2" style="border-radius:8px;">
      <b>${f.name || ''}</b>
      <span class="ms-2 text-muted">${f.region || ''} / ${f.district || ''} / ${f.community || ''}</span>
      ${adminUser ? `<span class='ms-auto'><a href="#profile" id="adminProfileLink" class="text-decoration-none text-dark"><i class='bi bi-person-circle'></i> <b>${adminUser}</b></a></span>` : ''}
    </div>`;

  setTimeout(() => {
    if (db.currentUser && db.currentUser.lastPasswordChange) {
      const daysSince = (Date.now() - db.currentUser.lastPasswordChange) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) {
        alert('Your password is expired. Please update your password.');
        window.location.hash = '#profile';
      }
    }
  }, 200);

  setTimeout(() => {
    const profileLink = document.getElementById('adminProfileLink');
    if (profileLink) {
      profileLink.onclick = (e) => {
        e.preventDefault();
        renderProfile(root, {
          getUser: () => db.currentUser,
          updateUser: (u) => { db.currentUser = u; saveDb(); },
          dashboardHash: '#admin-dashboard'
        });
      };
    }

    const aptLink = root.querySelector('a[href="#appointments"]');
    if (aptLink) {
      aptLink.onclick = (e) => {
        e.preventDefault();

        let appRoot = document.getElementById('app') || root;
        renderAppointmentList(appRoot);
        window.location.hash = '#appointments';
      };
    }
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
    .apt-day-label { font-weight: bold; color: #2a2a2a; }
    .apt-day-list { margin-bottom: 1.2em; }
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
              <a href="#admin-export" class="list-group-item list-group-item-action"><i class="bi bi-cloud-arrow-up me-2"></i>Export Setup</a>
              ${ db.registers?.length
                  ? `<a href="#service-entry?reg=${encodeURIComponent(db.registers[0].name)}" class="list-group-item list-group-item-action"><i class="bi bi-clipboard-plus me-2"></i>Open Service Registers</a>`
                  : "" }
            </div>
            
            <!-- Export & Backup Quick Actions -->
            <div class="border-top pt-3">
              <h6 class="text-muted mb-2"><i class="bi bi-cloud-arrow-down me-1"></i> Export & Backup</h6>
              <div class="row g-2 mb-2">
                <div class="col-6">
                  <button class="btn btn-outline-primary btn-sm w-100" id="multiExportBtn">
                    <i class="bi bi-download me-1"></i>Export JSON
                  </button>
                </div>
                <div class="col-6">
                  <button class="btn btn-outline-success btn-sm w-100" id="csvExportBtn">
                    <i class="bi bi-file-earmark-csv me-1"></i>Export CSV
                  </button>
                </div>
              </div>
              <div class="row g-2">
                <div class="col-6">
                  <button class="btn btn-outline-secondary btn-sm w-100" id="backupBtn">
                    <i class="bi bi-shield-lock me-1"></i>Backup
                  </button>
                </div>
                <div class="col-6">
                  <button class="btn btn-outline-warning btn-sm w-100" onclick="document.getElementById('restoreFile').click()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Restore
                  </button>
                  <input type="file" id="restoreFile" accept=".json" style="display:none;">
                </div>
              </div>
              <div id="backupMsg" class="mt-2"></div>
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
              <!-- View All button removed as requested -->
            </div>
          </div>
        </div>
        <script>

        </script>
      </div>
    </div>
    
    <!-- Multi-Select Export Modal -->
    <div id="multiExportModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000;">
      <div class="modal-content mx-auto mt-5" style="max-width:500px; background:white; border-radius:8px; padding:20px;">
        <h5><i class="bi bi-download me-2"></i>Export Data (JSON)</h5>
        <p class="text-muted small">Select data types to export for sharing with another device:</p>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="exportPatients" checked>
          <label class="form-check-label" for="exportPatients">Patients (${(db.patients || []).length} records)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="exportVisits" checked>
          <label class="form-check-label" for="exportVisits">Visits (${(db.visits || []).length} records)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="exportServices">
          <label class="form-check-label" for="exportServices">Service Entries (${Object.keys(db.serviceEntries || {}).reduce((sum, key) => sum + (db.serviceEntries[key] || []).length, 0)} records)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="exportAppointments">
          <label class="form-check-label" for="exportAppointments">Appointments (${(db.appointments || []).length} records)</label>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="exportRegisters">
          <label class="form-check-label" for="exportRegisters">Registers/Forms (${(db.registers || []).length} records)</label>
        </div>
        <div class="d-flex justify-content-between">
          <button class="btn btn-primary" id="executeExport"><i class="bi bi-download me-1"></i>Export Selected</button>
          <button class="btn btn-secondary" id="cancelExport">Cancel</button>
        </div>
      </div>
    </div>
    
    <!-- CSV Export Modal -->
    <div id="csvExportModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000;">
      <div class="modal-content mx-auto mt-5" style="max-width:500px; background:white; border-radius:8px; padding:20px;">
        <h5><i class="bi bi-file-earmark-csv me-2"></i>Export CSV (De-identified)</h5>
        <p class="text-muted small">Export data as CSV files for external use. Personal identifiers will be removed:</p>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="csvPatients" checked>
          <label class="form-check-label" for="csvPatients">Patients (anonymized)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="csvVisits" checked>
          <label class="form-check-label" for="csvVisits">Visits (anonymized)</label>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="csvServices">
          <label class="form-check-label" for="csvServices">Service Entries (anonymized)</label>
        </div>
        <div class="d-flex justify-content-between">
          <button class="btn btn-success" id="executeCsvExport"><i class="bi bi-file-earmark-csv me-1"></i>Export CSV</button>
          <button class="btn btn-secondary" id="cancelCsvExport">Cancel</button>
        </div>
      </div>
    </div>
    
  </div>
  `;

  const adminAptList = root.querySelector('#adminAptList');
  if (adminAptList) {
    const today = new Date();

    const weekMap = {};
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);
      weekMap[dateStr] = [];
    }
    (db.appointments || []).forEach(apt => {
      if (!apt.appointmentDate) return;
      if (weekMap[apt.appointmentDate] !== undefined) {
        weekMap[apt.appointmentDate].push(apt);
      }
    });

    let html = '';
    Object.keys(weekMap).forEach(dateStr => {
      const dateObj = new Date(dateStr);
      const dayLabel = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      const apts = weekMap[dateStr];
      html += `<div class="apt-day-list">
        <div class="apt-day-label">${dayLabel}</div>`;
      if (apts.length) {
        html += '<ul class="list-group list-group-flush">' +
          apts.map(apt => {
            let statusBadge = `<span class="badge bg-${apt.status === 'Completed' ? 'success' : 'primary'} ms-2">${apt.status}</span>`;

            const aptDate = new Date(apt.appointmentDate);
            const now = new Date();

            aptDate.setHours(0,0,0,0);
            now.setHours(0,0,0,0);
            const daysDiff = Math.floor((aptDate - now) / (1000 * 60 * 60 * 24));
            let indicatorColor = '';
            let indicatorText = '';
            if (daysDiff < 0) {
              indicatorColor = 'danger';
              indicatorText = 'Missed';
            } else if (daysDiff < 3) {
              indicatorColor = 'warning';
              indicatorText = daysDiff === 0 ? 'Today' : `${daysDiff} day${daysDiff === 1 ? '' : 's'}`;
            } else {
              indicatorColor = 'success';
              indicatorText = `${daysDiff} days`;
            }
            return `<li class="list-group-item d-flex align-items-center justify-content-between py-2">
              <div>
                <i class="bi bi-person-circle me-1"></i>
                <b>${apt.patientName || apt.patientID}</b>
                <span class="text-muted small ms-2">${apt.serviceType || ''}</span>
              </div>
              <div>
                <span class="badge bg-${indicatorColor} me-2">${indicatorText}</span>
                ${statusBadge}
              </div>
            </li>`;
          }).join('') + '</ul>';
      } else {
        html += '<div class="text-muted small">No appointments.</div>';
      }
      html += '</div>';
    });
    adminAptList.innerHTML = html;
  }

  const multiExportBtn = root.querySelector("#multiExportBtn");
  const multiExportModal = root.querySelector("#multiExportModal");
  
  if (multiExportBtn) {
    multiExportBtn.onclick = () => {
      multiExportModal.style.display = "block";
    };
  }
  
  const cancelExportBtn = root.querySelector("#cancelExport");
  if (cancelExportBtn) {
    cancelExportBtn.onclick = () => {
      multiExportModal.style.display = "none";
    };
  }
  
  const executeExportBtn = root.querySelector("#executeExport");
  if (executeExportBtn) {
    executeExportBtn.onclick = () => {
      const selectedData = {};
      let filename = "export";
      
      if (root.querySelector("#exportPatients").checked) {
        selectedData.patients = db.patients || [];
        filename += "_patients";
      }
      if (root.querySelector("#exportVisits").checked) {
        selectedData.visits = db.visits || [];
        filename += "_visits";
      }
      if (root.querySelector("#exportServices").checked) {
        selectedData.serviceEntries = db.serviceEntries || {};
        filename += "_services";
      }
      if (root.querySelector("#exportAppointments").checked) {
        selectedData.appointments = db.appointments || [];
        filename += "_appointments";
      }
      if (root.querySelector("#exportRegisters").checked) {
        selectedData.registers = db.registers || [];
        selectedData.customPatientFields = db.customPatientFields || [];
        filename += "_registers";
      }
      
      if (Object.keys(selectedData).length === 0) {
        alert("Please select at least one data type to export.");
        return;
      }

      selectedData.meta = {
        facility: db.facility || {},
        exported: new Date().toISOString(),
        exportType: "multi-select"
      };
      
      const encrypted = exportUtils.encryptData(JSON.stringify(selectedData, null, 2));
      const blob = new Blob([encrypted], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { 
        document.body.removeChild(a); 
        URL.revokeObjectURL(url); 
      }, 100);
      
      multiExportModal.style.display = "none";
    };
  }

  const csvExportBtn = root.querySelector("#csvExportBtn");
  const csvExportModal = root.querySelector("#csvExportModal");
  
  if (csvExportBtn) {
    csvExportBtn.onclick = () => {
      csvExportModal.style.display = "block";
    };
  }
  
  const cancelCsvExportBtn = root.querySelector("#cancelCsvExport");
  if (cancelCsvExportBtn) {
    cancelCsvExportBtn.onclick = () => {
      csvExportModal.style.display = "none";
    };
  }
  
  const executeCsvExportBtn = root.querySelector("#executeCsvExport");
  if (executeCsvExportBtn) {
    executeCsvExportBtn.onclick = () => {

      const anonymizePatientData = (patients) => {
        return patients.map((p, index) => ({
          id: `PATIENT_${String(index + 1).padStart(4, '0')}`,
          ageGroup: p.age ? (p.age < 18 ? 'Under 18' : p.age < 65 ? '18-64' : '65+') : '',
          sex: p.sex || '',
          registrationDate: p.registrationDate || '',
          region: db.facility?.region || '',
          district: db.facility?.district || '',
          facilityType: 'Health Facility'
        }));
      };
      
      const anonymizeVisitData = (visits) => {
        const patientMap = {};
        (db.patients || []).forEach((p, index) => {
          patientMap[p.patientID] = `PATIENT_${String(index + 1).padStart(4, '0')}`;
        });
        
        return visits.map(v => ({
          anonymizedPatientId: patientMap[v.patientID] || 'UNKNOWN',
          visitDate: v.date || v.visitDate || '',
          serviceType: v.service || v.serviceType || '',
          outcome: v.outcome || '',
          region: db.facility?.region || '',
          facility: db.facility?.name || ''
        }));
      };
      
      if (root.querySelector("#csvPatients").checked) {
        const anonymizedPatients = anonymizePatientData(db.patients || []);
        const csv = convertToCSV(anonymizedPatients);
        downloadCSV(csv, 'anonymized_patients.csv');
      }
      
      if (root.querySelector("#csvVisits").checked) {
        const anonymizedVisits = anonymizeVisitData(db.visits || []);
        const csv = convertToCSV(anonymizedVisits);
        downloadCSV(csv, 'anonymized_visits.csv');
      }
      
      if (root.querySelector("#csvServices").checked) {

        const allServices = [];
        Object.keys(db.serviceEntries || {}).forEach(regName => {
          (db.serviceEntries[regName] || []).forEach(entry => {
            allServices.push({
              anonymizedPatientId: `PATIENT_${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`,
              serviceType: regName,
              entryDate: entry.visitDate || '',
              region: db.facility?.region || '',
              facility: db.facility?.name || ''
            });
          });
        });
        const csv = convertToCSV(allServices);
        downloadCSV(csv, 'anonymized_services.csv');
      }
      
      csvExportModal.style.display = "none";
    };
  }

  function convertToCSV(data) {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    return csvContent;
  }
  
  function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  const setupExportBtn = root.querySelector("#setupExportBtn");
  if (setupExportBtn) {
    setupExportBtn.onclick = () => {
      const username = prompt("Enter username to export (leave blank to export all users):");
      let usersToExport = db.users;
      let registersToExport = db.registers;
      if (username) {
        const user = db.users.find(u => u.username === username.trim());
        if (!user) return alert("User not found.");
        usersToExport = [user];

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
    };
  }

  const backupBtn = root.querySelector("#backupBtn");
  if (backupBtn) {
    backupBtn.onclick = () => {
      const backupData = {
        ...db,
        timestamp: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    };
  }


  const logoutBtn = root.querySelector("#logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      db.currentUser = null;
      saveDb();
      window.location.hash = "#login";
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

  const chooseBtn = root.querySelector("#chooseShareBtn");
  const shareModal = root.querySelector("#shareModal");

  if (chooseBtn && shareModal) {
    chooseBtn.onclick = () => {
      shareModal.className = "active";

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
    const permList = ["patient-reg", "visit-log", "service-entry", "reports", "all"];
    const perms = role.permissions || [];
    const content = `
      <div>
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
      
    const closeModal = showModal(content);

    document.getElementById("cancelR").onclick = () => closeModal();

    document.getElementById("rForm").onsubmit = e => {
      e.preventDefault();
      const newRole = {
        name: e.target.rname.value.trim(),
        permissions: Array.from(e.target.querySelectorAll("input[type=checkbox]:checked")).map(cb => cb.value)
      };
      if (idx !== null) db.roles[idx] = newRole;
      else db.roles.push(newRole);
      saveDb(); closeModal(); renderRoles();
    };
  }

  function showForm(user = {}, idx = null) {
    user.assignedRegisters = user.assignedRegisters || [];

    const isAdmin = db.currentUser && db.currentUser.role && db.currentUser.role.toLowerCase() === "admin";
    const content = `
      <div>
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
          ${isAdmin ? `
          <label class="form-label">Assigned Service Forms</label>
          <select class="form-select mb-3" id="uregisters" multiple>
            ${db.registers.map(r => `<option value="${r.name}" ${user.assignedRegisters?.includes(r.name) ? "selected" : ""}>${r.name}</option>`).join("")}
          </select>
          ` : ''}
          <div class="d-flex justify-content-between">
            <button class="btn btn-primary">${user.username ? "Save" : "Add"}</button>
            <button type="button" class="btn btn-secondary" id="cancelU">Cancel</button>
          </div>
        </form>
      </div>`;
      
    const closeModal = showModal(content);

    document.getElementById("cancelU").onclick = () => closeModal();

    document.getElementById("uForm").onsubmit = e => {
      e.preventDefault();
      const rec = {
        username: e.target.uname.value.trim(),
        role: e.target.urole.value,
        password: e.target.upass.value || user.password,
        canPatientReg: e.target.canPatientReg.checked,
        canVisitLog: e.target.canVisitLog.checked,
        assignedRegisters: isAdmin && e.target.uregisters ? Array.from(e.target.uregisters.selectedOptions).map(o => o.value) : []
      };
      if (idx !== null) Object.assign(db.users[idx], rec);
      else db.users.push(rec);
      saveDb(); closeModal(); renderRows();
    };
  }
}


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
                <button class="list-group-item list-group-item-action" id="bulkExportBtn"><i class="bi bi-cloud-arrow-down me-2"></i> Bulk Export (Select Multiple)</button>
                <button class="list-group-item list-group-item-action" id="exportSingle"><i class="bi bi-file-earmark-pdf me-2"></i> Single Patient (PDF)</button>
                <button class="list-group-item list-group-item-action" id="exportSetup"><i class="bi bi-cloud-arrow-up me-2"></i> Export Setup</button>
                <button class="list-group-item list-group-item-action" id="backupBtn"><i class="bi bi-download me-2"></i> Download Full Backup</button>
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
                  <i class="bi bi-upload me-2"></i> Bulk Import (Auto-detect Type)
                  <input type="file" id="bulkImportFile" hidden multiple accept=".json">
                </label>
                <label class="list-group-item list-group-item-action" style="cursor:pointer;">
                  <i class="bi bi-upload me-2"></i> Restore Full Backup
                  <input type="file" id="restoreFile" hidden accept=".json">
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

  root.querySelector("#bulkExportBtn")?.addEventListener("click", () => {
    showAdminBulkExportModal();
  });
  root.querySelector("#exportSingle")?.addEventListener("click", () => {
    const id = prompt("Enter Patient ID to export:");
    if (id) exportUtils.exportPatientA4(id.trim());
  });
  root.querySelector("#exportSetup")?.addEventListener("click", () => {
    const username = prompt("Enter username to export (leave blank to export all users):");
    let usersToExport = db.users;
    let registersToExport = db.registers;
    let serviceFormsToExport = db.servicesList || [];
    
    if (username) {
      const user = db.users.find(u => u.username === username.trim());
      if (!user) return alert("User not found.");
      usersToExport = [user];

      if (Array.isArray(user.assignedRegisters) && user.assignedRegisters.length) {
        registersToExport = db.registers.filter(r => user.assignedRegisters.includes(r.name));

        serviceFormsToExport = db.servicesList.filter(s => 
          user.assignedRegisters.some(regName => 
            s.registerName === regName || s.category === regName || s.formType === regName
          )
        );
      } else {
        registersToExport = [];
        serviceFormsToExport = [];
      }
    }
    
    const setupData = {
      facility: db.facility, // ensures facility metadata (logo, name, etc) is included
      settings: db.settings,
      users: usersToExport,
      registers: registersToExport,
      roles: db.roles,
      servicesList: serviceFormsToExport, // Include all assigned service forms/registers
      customPatientFields: db.customPatientFields,

      exportInfo: {
        exportDate: new Date().toISOString(),
        exportedBy: db.currentUser?.username || 'admin',
        userScope: username ? username.trim() : 'all_users',
        assignedRegistersIncluded: username ? usersToExport[0]?.assignedRegisters || [] : 'all'
      }
    };
    
    const blob = new Blob([JSON.stringify(setupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = username ? `setup-${username.trim()}.json` : "system-setup.json";
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

  root.querySelector("#bulkImportFile")?.addEventListener("change", e => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    processAdminBulkImport(files, root);
  });
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let data;
        try {

          data = JSON.parse(ev.target.result);
        } catch {
          try {

            const decoded = exportUtils.decryptData(ev.target.result);
            data = JSON.parse(decoded);
          } catch {

            try {
              const decoded = atob(ev.target.result);
              data = JSON.parse(decoded);
            } catch {
              throw new Error('Invalid file format. Please ensure you are importing a valid export file.');
            }
          }
        }
        
        let imported = 0;
        const visits = data.visits || [];
        
        visits.forEach(visit => {
          if (!db.visits.some(existing => 
            existing.visitID === visit.visitID || 
            (existing.id && visit.id && existing.id === visit.id)
          )) {
            db.visits.push(visit);
            imported++;
          }
        });
        
        saveDb();
        root.querySelector("#importMsg").textContent = `Successfully imported ${imported} visits.`;
        root.querySelector("#importMsg").className = "small mt-2 text-success";
      } catch (err) {
        root.querySelector("#importMsg").textContent = `Import failed: ${err.message}`;
        root.querySelector("#importMsg").className = "small mt-2 text-danger";
      }
    };
    reader.readAsText(file);
  }
