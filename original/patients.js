/* patients.js – full version 2025-05 */

import { db, saveDb }               from './db.js';
import { generatePatientID }        from './idUtils.js';
import { calculateAge, formatDate } from './utils.js';
import { createVisitForm }          from './visits.js';
import { renderServiceEntryForm }   from './services.js';
import { renderAppointmentForm }    from './appointments.js';

// Supported data types (XLSForm style)
const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "integer", label: "Integer" },
  { value: "decimal", label: "Decimal" },
  { value: "select_one", label: "Single Select (select_one)" },
  { value: "select_multiple", label: "Multiple Select (select_multiple)" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "DateTime" },
  { value: "note", label: "Note/Label" },
  { value: "calculate", label: "Calculation" },
  { value: "image", label: "Image" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "file", label: "File Upload" },
  { value: "barcode", label: "Barcode" },
  { value: "qr_code", label: "QR Code" },
  { value: "geopoint", label: "Geopoint" },
  { value: "geotrace", label: "Geotrace" },
  { value: "geoshape", label: "Geoshape" }
];

/* ───────────────────────────────────────────── */
/*   Main entry                                  */
/* ───────────────────────────────────────────── */
export function renderPatientList(root) {
  // Ensure modalWrap exists for modals
  if (!document.getElementById('modalWrap')) {
    const mw = document.createElement('div');
    mw.id = 'modalWrap';
    document.body.appendChild(mw);
  }
  root.innerHTML = `
    <div class="container my-4">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h4><i class="bi bi-people"></i> Patients</h4>
        <button id="showPatientFormBtn" class="btn btn-success btn-sm"><i class="bi bi-person-plus"></i> Add New Patient</button>
      </div>
      <form id="searchForm" class="d-flex gap-2 mb-3">
        <input name="id"    class="form-control form-control-sm" placeholder="ID">
        <input name="name"  class="form-control form-control-sm" placeholder="Name">
        <input name="phone" class="form-control form-control-sm" placeholder="Phone">
        <button class="btn btn-primary btn-sm"><i class="bi bi-search"></i></button>
      </form>
      <div id="formAboveList" style="display:none"></div>
      <div class="table-responsive" id="patientTableWrap">
        <table class="table table-bordered table-hover align-middle patient-table-mobile">
          <thead class="table-light">
            <tr>
              <th>ID</th><th>Name</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="listBody"></tbody>
        </table>
      </div>
      <style>
      @media (max-width: 768px) {
        .patient-table-mobile thead { display: none; }
        .patient-table-mobile tr { display: block; margin-bottom: 1rem; border: 1px solid #dee2e6; border-radius: 8px; }
        .patient-table-mobile td { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; border: none; border-bottom: 1px solid #eee; }
        .patient-table-mobile td:last-child { border-bottom: none; }
        .patient-table-mobile td:before {
          content: attr(data-label);
          font-weight: bold;
          flex: 0 0 40%;
          color: #555;
        }
        .patient-table-mobile td { flex-direction: row; }
      }
      </style>
      <a href="#admin-dashboard" class="btn btn-link mt-2"><i class="bi bi-arrow-left"></i> Back</a>
    </div>
  `;
  // Show patient form if "Add New Patient" is clicked
  document.getElementById('showPatientFormBtn').onclick = () => {
    renderPatientFormAboveList();
  };
  // Optimized search
  document.getElementById('searchForm').onsubmit = e => {
    e.preventDefault();
    const filter = Object.fromEntries(new FormData(e.target));
    refresh(filter, true);
  };
  refresh();
// Render the patient form always above the list
function renderPatientFormAboveList() {
  const formAbove = document.getElementById('formAboveList');
  const today = new Date().toISOString().slice(0,10);
  formAbove.innerHTML = `
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="mb-3"><i class="bi bi-person-plus"></i> New Patient</h5>
        <form id="pForm">
          <label class="form-label mb-0">Date of Registration</label>
          <input  type="date" id="dor" class="form-control mb-2" value="${today}" max="${today}" required>
          <label class="form-label mb-0">Date of Birth</label>
          <input  type="date" id="dob" class="form-control" value="" max="${today}">
          <small id="ageLive" class="text-muted mb-2 d-block"></small>
          <input  id="name"  class="form-control mb-2" placeholder="Full Name" required value="">
          <select id="sex" class="form-select mb-2" required>
            <option value="">Sex</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
          <input id="phone" class="form-control mb-2" placeholder="Phone 024-xxx-xxxx" value="">
          <input id="address" class="form-control mb-2" placeholder="Address" value="">
          <select id="idType" class="form-select mb-2">
            <option value="">ID Type (optional)</option>
            <option value="NIN">National ID</option>
            <option value="DL">Driver's License</option>
            <option value="VOT">Voter's Card</option>
          </select>
          <input id="idNumber" class="form-control mb-3" placeholder="ID Number" value="">
          <!-- Family/Contact Linking -->
          <div class="mb-3">
            <label class="form-label">Link Family/Contact</label>
            <div class="input-group mb-2">
              <input id="linkSearch" class="form-control" placeholder="Search by ID or Name">
              <select id="relationType" class="form-select" style="max-width:140px">
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Other">Other</option>
              </select>
              <button type="button" class="btn btn-outline-primary" id="addLinkBtn">Link</button>
            </div>
            <div id="linkSearchResult" class="small"></div>
            <ul class="list-group mt-2" id="linkedContactsList"></ul>
          </div>
          ${(db.customPatientFields||[]).map(f => renderCustomField(f, {})).join('')}
          <div class="mb-3">
            <button type="button" class="btn btn-sm btn-success" id="addFieldBtn"><i class="bi bi-plus"></i> Add Field</button>
            <ul class="list-group mt-2" id="customFieldList">
              ${(db.customPatientFields||[]).map((f,i) => renderFieldRow(f,i)).join("")}
            </ul>
          </div>
          <div class="d-flex justify-content-between">
            <button class="btn btn-primary">Add</button>
            <button type="button" class="btn btn-secondary" id="cancelF">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  // Family/Contact linking logic
  let linkedContacts = [];
  const linkSearch = document.getElementById('linkSearch');
  const linkSearchResult = document.getElementById('linkSearchResult');
  const linkedContactsList = document.getElementById('linkedContactsList');
  const relationType = document.getElementById('relationType');
  document.getElementById('addLinkBtn').onclick = () => {
    const val = linkSearch.value.trim().toLowerCase();
    if (!val) return;
    const found = (db.patients||[]).find(p => p.patientID?.toLowerCase() === val || p.name?.toLowerCase() === val);
    if (found) {
      linkedContacts.push({relation: relationType.value, patientID: found.patientID, name: found.name});
      renderLinkedContacts();
      linkSearch.value = '';
      linkSearchResult.innerHTML = '';
    } else {
      linkSearchResult.innerHTML = '<span class="text-danger">No patient found.</span>';
    }
  };
  linkSearch.oninput = function() {
    const val = this.value.trim().toLowerCase();
    if (!val) { linkSearchResult.innerHTML = ''; return; }
    const found = (db.patients||[]).find(p => p.patientID?.toLowerCase() === val || p.name?.toLowerCase() === val);
    if (found) {
      linkSearchResult.innerHTML = `<span class="text-success">Found: <b>${found.name}</b> [${found.patientID}]</span>`;
    } else if (val.length > 2) {
      linkSearchResult.innerHTML = '<span class="text-warning">No patient found.</span>';
    } else {
      linkSearchResult.innerHTML = '';
    }
  };
  function renderLinkedContacts() {
    linkedContactsList.innerHTML = linkedContacts.length ? linkedContacts.map((c,i) => `<li class="list-group-item d-flex justify-content-between align-items-center"><span><b>${c.relation}</b>: ${c.name} [${c.patientID}]</span><button type="button" class="btn btn-sm btn-danger" data-i="${i}"><i class="bi bi-x"></i></button></li>`).join('') : '';
    linkedContactsList.querySelectorAll('button[data-i]').forEach(btn => btn.onclick = () => { linkedContacts.splice(btn.dataset.i,1); renderLinkedContacts(); });
  }
  // Add handlers for age, add field, and form submit
  const pForm = document.getElementById("pForm");
  const dobField = pForm.dob; const ageLabel = pForm.querySelector("#ageLive");
  const updateAge = () => ageLabel.textContent = dobField.value ? `Age: ${calculateAge(dobField.value)}` : "";
  dobField.addEventListener("input", updateAge); updateAge();
  document.getElementById("addFieldBtn").onclick = (e) => {
    e.preventDefault();
    window.showFieldFormPatient();
  };
  function refreshFields() {
    const list = document.getElementById("customFieldList");
    if (list) list.innerHTML = (db.customPatientFields||[]).map((f,i) => renderFieldRow(f,i)).join("");
    attachFieldHandlers();
  }
  function attachFieldHandlers() {
    document.querySelectorAll(".editFieldBtn").forEach(btn => btn.onclick = () => showFieldFormPatient(db.customPatientFields[btn.dataset.fidx], btn.dataset.fidx));
    document.querySelectorAll(".deleteFieldBtn").forEach(btn => btn.onclick = () => {
      if (confirm("Delete this field? Data already captured for this field will be kept in old records.")) {
        db.customPatientFields.splice(btn.dataset.fidx,1); 
        saveDb();
        refreshFields();
      }
    });
    document.querySelectorAll(".moveUpBtn").forEach(btn => btn.onclick = () => {
      const i = +btn.dataset.fidx;
      if (i > 0) {
        [db.customPatientFields[i-1], db.customPatientFields[i]] = [db.customPatientFields[i], db.customPatientFields[i-1]];
        saveDb();
        refreshFields();
      }
    });
    document.querySelectorAll(".moveDownBtn").forEach(btn => btn.onclick = () => {
      const i = +btn.dataset.fidx;
      if (i < db.customPatientFields.length-1) {
        [db.customPatientFields[i], db.customPatientFields[i+1]] = [db.customPatientFields[i+1], db.customPatientFields[i]];
        saveDb();
        refreshFields();
      }
    });
  }
  refreshFields();
  document.getElementById("cancelF").onclick = (e) => {
    e.preventDefault();
    document.getElementById('formAboveList').style.display = 'none';
    document.getElementById('patientTableWrap').style.display = '';
    document.getElementById('showPatientFormBtn').style.display = '';
  };
  pForm.onsubmit = e => {
    e.preventDefault();
    const patient = {};
    patient.registrationDate = pForm.dor.value;
    patient.dob = pForm.dob.value;
    patient.name = pForm.name.value.trim();
    patient.sex = pForm.sex.value;
    patient.phone = pForm.phone.value.trim();
    patient.address = pForm.address.value.trim();
    patient.idType = pForm.idType.value;
    patient.idNumber = pForm.idNumber.value.trim();
    patient.age = patient.dob ? calculateAge(patient.dob) : '';
    patient.patientID = generatePatientID(pForm.dor.value);
    patient.customFields = {};
    (db.customPatientFields||[]).forEach(field => {
      const el = document.getElementById(`custom_${field.name}`);
      if (el) patient.customFields[field.name] = el.value;
    });
    patient.linkedContacts = linkedContacts.slice();
    db.patients.push(patient);
    saveDb();
    renderPatientList(document.getElementById('app'));
  };
  refreshFields();
  document.getElementById('patientTableWrap').style.display = 'none';
  document.getElementById('showPatientFormBtn').style.display = 'none';
  document.getElementById('formAboveList').style.display = '';
}

  /* ── helpers ─────────────────────────── */
function refresh(filter={}, scrollToMatch=false) {
    let rows = db.patients || [];
    // Sort by newest registered (descending by registrationDate or fallback to timestamp)
    rows = rows.slice().sort((a, b) => {
      const da = new Date(b.registrationDate || b.timestamp || 0);
      const db_ = new Date(a.registrationDate || a.timestamp || 0);
      return da - db_;
    });
    if (filter.id)    rows = rows.filter(r=>r.patientID?.includes(filter.id));
    if (filter.name)  rows = rows.filter(r=>r.name?.toLowerCase().includes(filter.name.toLowerCase()));
    if (filter.phone) rows = rows.filter(r=>r.phone?.includes(filter.phone));

    document.getElementById("listBody").innerHTML = rows.length === 0
      ? `<tr><td colspan="3" class="text-center text-muted">No patients found.</td></tr>`
      : rows.map((p,i)=>`
      <tr id="row-${p.patientID}"${filter.id && p.patientID?.toLowerCase().includes(filter.id.toLowerCase()) ? ' class="table-info"' : ''}>
        <td data-label="ID">${p.patientID||''}</td>
        <td data-label="Name">${p.name||''}</td>
        <td data-label="Actions">
          <button class="btn btn-sm btn-primary me-1" data-i="${i}" data-act="view" title="View/Edit"><i class="bi bi-eye"></i></button>
        </td>
      </tr>`).join("");
    // Scroll to first match if searching by ID
    if (scrollToMatch && filter.id) {
      const matchRow = document.getElementById("row-" + filter.id);
      if (matchRow) {
        matchRow.scrollIntoView({ behavior: "smooth", block: "center" });
        matchRow.classList.add("table-success");
        setTimeout(()=>matchRow.classList.remove("table-success"), 2000);
      }
    }

    document.querySelectorAll("[data-act=view]").forEach(b => b.onclick = () => showForm(rows[b.dataset.i]));
    document.querySelectorAll("[data-act=del]").forEach(b => b.onclick = () => {
      if (confirm("Delete this patient?")) {
        db.patients.splice(b.dataset.i,1); saveDb(); refresh();
      }
    });
    document.querySelectorAll("[data-act=visit]").forEach(b => b.onclick = () => {
      const i = b.dataset.i;
      const patient = rows[i];
      const formRow = document.querySelector(`.visit-form-row[data-form-i="${i}"]`);
      const container = formRow.querySelector(".visit-form-container");
      // Toggle visibility
      const isVisible = !formRow.classList.contains("d-none");
      document.querySelectorAll(".visit-form-row").forEach(r => r.classList.add("d-none"));
      if (!isVisible) {
        container.innerHTML = "";
        container.appendChild(createVisitForm(patient, () => {
          setTimeout(() => formRow.classList.add("d-none"), 2000);
        }));
        formRow.classList.remove("d-none");
      }
    });
    document.querySelectorAll("[data-act=service]").forEach(b => b.onclick = () => {
      const i = b.dataset.i;
      const patient = rows[i];
      renderServiceEntryForm(patient, db.registers || []);
    });
    document.querySelectorAll("[data-act=appoint]").forEach(b => b.onclick = () => {
      const i = b.dataset.i;
      const patient = rows[i];
      renderAppointmentForm(patient);
    });
  }

  /* ── events ───────────────────────────── */
  // document.getElementById("addBtn").onclick = () => showForm();
  document.getElementById("searchForm").onsubmit = e => {
    e.preventDefault();
    refresh(Object.fromEntries(new FormData(e.target)));
  };

  /* ─────────────────────────────────────── */
  /*   Form (add / edit)                     */
  /* ─────────────────────────────────────── */
  function showForm(existing={}) {
    const today = new Date().toISOString().slice(0,10);
    const wrap  = document.getElementById("modalWrap");
    wrap.innerHTML = `
      <div class="modal-content mx-auto">
        <h5>${existing.patientID?"Edit":"New"} Patient</h5>
        <form id="pForm" class="mt-2">
          <label class="form-label mb-0">Date of Registration</label>
          <input  type="date" id="dor" class="form-control mb-2"
                  value="${existing.registrationDate||today}" max="${today}" required>

          <label class="form-label mb-0">Date of Birth</label>
          <input  type="date" id="dob" class="form-control" value="${existing.dob||''}" max="${today}">
          <small id="ageLive" class="text-muted mb-2 d-block"></small>

          <input  id="name"  class="form-control mb-2" placeholder="Full Name" required value="${existing.name||''}">

          <select id="sex" class="form-select mb-2" required>
            <option value="">Sex</option>
            <option value="M"${existing.sex==="M"?" selected":""}>Male</option>
            <option value="F"${existing.sex==="F"?" selected":""}>Female</option>
            <option value="O"${existing.sex==="O"?" selected":""}>Other</option>
          </select>

          <input id="phone" class="form-control mb-2" placeholder="Phone 024-xxx-xxxx" value="${existing.phone||''}">
          <input id="address" class="form-control mb-2" placeholder="Address" value="${existing.address||''}">

          <select id="idType" class="form-select mb-2">
            <option value="">ID Type (optional)</option>
            <option value="NIN"${existing.idType==="NIN"?" selected":""}>National ID</option>
            <option value="DL" ${existing.idType==="DL" ?" selected":""}>Driver's License</option>
            <option value="VOT"${existing.idType==="VOT"?" selected":""}>Voter's Card</option>
          </select>
          <input id="idNumber" class="form-control mb-3" placeholder="ID Number" value="${existing.idNumber||''}">

          ${ (db.customPatientFields||[]).map(f => renderCustomField(f, existing)).join('')}

          <div class="mb-3">
            <button type="button" class="btn btn-sm btn-success" id="addFieldBtn"><i class="bi bi-plus"></i> Add Field</button>
            <ul class="list-group mt-2" id="customFieldList">
              ${(db.customPatientFields||[]).map((f,i) => renderFieldRow(f,i)).join("")}
            </ul>
          </div>

          <div class="d-flex justify-content-between">
            <button class="btn btn-primary">${existing.patientID?"Save":"Add"}</button>
            <button type="button" class="btn btn-secondary" id="cancelF">Cancel</button>
          </div>
        </form>
      </div>
    `;
    wrap.className="active";
    wrap.onclick=e=>{ if(e.target===wrap) close(); };
    document.getElementById("cancelF").onclick=close;

    // (removed duplicate pForm, dobField, ageLabel, updateAge declarations)

    // Initialize custom patient fields if not exists
    if (!db.customPatientFields) db.customPatientFields = [];

    // Add field button handler
    document.getElementById("addFieldBtn").onclick = () => {
      window.showFieldFormPatient();
    };

    // Save handler for add/edit patient
    pForm.onsubmit = e => {
      e.preventDefault();
      const patient = existing.patientID ? existing : {};
      patient.registrationDate = pForm.dor.value;
      patient.dob = pForm.dob.value;
      patient.name = pForm.name.value.trim();
      patient.sex = pForm.sex.value;
      patient.phone = pForm.phone.value.trim();
      patient.address = pForm.address.value.trim();
      patient.idType = pForm.idType.value;
      patient.idNumber = pForm.idNumber.value.trim();
      // Calculate age
      patient.age = patient.dob ? calculateAge(patient.dob) : '';
      // Custom fields
      patient.customFields = patient.customFields || {};
      (db.customPatientFields||[]).forEach(field => {
        const el = document.getElementById(`custom_${field.name}`);
        if (el) patient.customFields[field.name] = el.value;
      });
      // Assign ID if new
      if (!patient.patientID) patient.patientID = generatePatientID(pForm.dor.value);
      // Add or update in db
      if (!existing.patientID) {
        db.patients.push(patient);
      } else {
        const idx = db.patients.findIndex(p => p.patientID === patient.patientID);
        if (idx !== -1) db.patients[idx] = patient;
      }
      saveDb();
      close();
      refresh();
    };

    // Modal for adding/editing custom patient fields (adapted from registers.js)
// Make showFieldFormPatient available globally for inline handlers
    window.showFieldFormPatient = function(field = {name:"", type:"text", required:false}, fidx=null) {
      const fModal = document.createElement("div");
      fModal.className = "modal-overlay";
      fModal.innerHTML = `
        <div class="modal-content mx-auto" style="max-width:400px;">
          <h6>${fidx!==null ? "Edit Field" : "Add Field"}</h6>
          <form id="fieldForm">
            <div class="mb-2"><input class="form-control" id="fieldName" placeholder="Field Name" required value="${field.name||""}"></div>
            <div class="mb-2">
              <select class="form-select" id="fieldType" required>
                ${fieldTypes.map(t=>`<option value="${t.value}"${field.type===t.value?" selected":''}>${t.label}</option>`).join("")}
              </select>
            </div>
            <div class="mb-2 form-check">
              <input class="form-check-input" type="checkbox" id="fieldReq" ${field.required?"checked":''}>
              <label class="form-check-label" for="fieldReq">Required</label>
            </div>
            <div class="mb-2"><input class="form-control" id="fieldDefault" placeholder="Default Value" value="${field.default||""}"></div>
            <div class="mb-2"><input class="form-control" id="fieldConstraint" placeholder="Constraint/Validation (e.g. min=0,max=100)" value="${field.constraint||""}"></div>
            <div class="mb-2" id="choicesRow" style="display:${['select_one','select_multiple'].includes(field.type)?'block':'none'}">
              <input class="form-control" id="fieldChoices" placeholder="Choices (comma-separated, e.g. Yes,No,Unknown)" value="${field.choices||''}" ${['select_one','select_multiple'].includes(field.type)?'required':''}>
            </div>
            <div class="mb-2" id="calcRow" style="display:${field.type==='calculate'?'block':'none'}">
              <input class="form-control" id="fieldCalc" placeholder="Calculation Formula (e.g. today() - dob)" value="${field.calc||''}">
            </div>
            <div class="mb-2 d-flex justify-content-between">
              <button class="btn btn-primary">${fidx!==null?"Save":"Add"}</button>
              <button type="button" class="btn btn-secondary" id="cancelFieldBtn">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(fModal);
      fModal.onclick = e => { if (e.target === fModal) document.body.removeChild(fModal); };
      fModal.querySelector("#cancelFieldBtn").onclick = () => document.body.removeChild(fModal);

      // Show/hide choices/calculation row
      fModal.querySelector("#fieldType").onchange = function() {
        const showChoices = ['select_one','select_multiple'].includes(this.value);
        fModal.querySelector("#choicesRow").style.display = showChoices ? 'block' : 'none';
        fModal.querySelector("#fieldChoices").required = showChoices;
        fModal.querySelector("#calcRow").style.display = this.value==='calculate'?'block':'none';
      };

      fModal.querySelector("#fieldForm").onsubmit = function(e) {
        e.preventDefault();
        let updated = {
          name: this.fieldName.value,
          type: this.fieldType.value,
          required: this.fieldReq.checked,
          default: this.fieldDefault.value,
          constraint: this.fieldConstraint.value,
        };
        if(['select_one','select_multiple'].includes(updated.type))
          updated.choices = this.fieldChoices.value;
        if(updated.type==='calculate')
          updated.calc = this.fieldCalc.value;
        if(fidx!==null) db.customPatientFields[fidx] = updated;
        else db.customPatientFields.push(updated);
        saveDb();
        document.body.removeChild(fModal);
        // Refresh both always-visible and modal forms if present
        if (document.getElementById('customFieldList')) {
          // Always-visible form
          const evt = new Event('refreshCustomFields');
          document.getElementById('customFieldList').dispatchEvent(evt);
        }
        if (typeof refreshFields === 'function') refreshFields();
      };
  // Listen for custom field refresh from modal
  const customFieldList = document.getElementById('customFieldList');
  if (customFieldList) {
    customFieldList.addEventListener('refreshCustomFields', refreshFields);
  }
    } // End showFieldFormPatient
    // Removed stray template literal and misplaced code

    const pForm = document.getElementById("pForm");
    const dobField = pForm.dob; const ageLabel = pForm.querySelector("#ageLive");
    const updateAge = () => ageLabel.textContent = dobField.value ? `Age: ${calculateAge(dobField.value)}` : "";
    dobField.addEventListener("input", updateAge); updateAge();

    // Initialize custom patient fields if not exists
    if (!db.customPatientFields) db.customPatientFields = [];

    // Add field button handler
  if (document.getElementById("addFieldBtn")) {
    document.getElementById("addFieldBtn").onclick = (e) => {
      e.preventDefault();
      if (typeof showFieldFormPatient === 'function') showFieldFormPatient();
      else window.showFieldFormPatient && window.showFieldFormPatient();
    };
  }

    // Save handler for add/edit patient
    pForm.onsubmit = e => {
      e.preventDefault();
      const patient = existing.patientID ? existing : {};
      patient.registrationDate = pForm.dor.value;
      patient.dob = pForm.dob.value;
      patient.name = pForm.name.value.trim();
      patient.sex = pForm.sex.value;
      patient.phone = pForm.phone.value.trim();
      patient.address = pForm.address.value.trim();
      patient.idType = pForm.idType.value;
      patient.idNumber = pForm.idNumber.value.trim();
      // Calculate age
      patient.age = patient.dob ? calculateAge(patient.dob) : '';
      // Custom fields
      patient.customFields = patient.customFields || {};
      (db.customPatientFields||[]).forEach(field => {
        const el = document.getElementById(`custom_${field.name}`);
        if (el) patient.customFields[field.name] = el.value;
      });
      // Assign ID if new
      if (!patient.patientID) patient.patientID = generatePatientID(pForm.dor.value);
      // Add or update in db
      if (!existing.patientID) {
        db.patients.push(patient);
      } else {
        const idx = db.patients.findIndex(p => p.patientID === patient.patientID);
        if (idx !== -1) db.patients[idx] = patient;
      }
      saveDb();
      close();
      refresh();
    // Modal for adding/editing custom patient fields (adapted from registers.js)
    function showFieldFormPatient(field = {name:"", type:"text", required:false}, fidx=null) {
      const fModal = document.createElement("div");
      fModal.className = "modal-overlay";
      fModal.innerHTML = `
        <div class="modal-content mx-auto" style="max-width:400px;">
          <h6>${fidx!==null ? "Edit Field" : "Add Field"}</h6>
          <form id="fieldForm">
            <div class="mb-2"><input class="form-control" id="fieldName" placeholder="Field Name" required value="${field.name||""}"></div>
            <div class="mb-2">
              <select class="form-select" id="fieldType" required>
                ${fieldTypes.map(t=>`<option value="${t.value}"${field.type===t.value?" selected":''}>${t.label}</option>`).join("")}
              </select>
            </div>
            <div class="mb-2 form-check">
              <input class="form-check-input" type="checkbox" id="fieldReq" ${field.required?"checked":''}>
              <label class="form-check-label" for="fieldReq">Required</label>
            </div>
            <div class="mb-2"><input class="form-control" id="fieldDefault" placeholder="Default Value" value="${field.default||""}"></div>
            <div class="mb-2"><input class="form-control" id="fieldConstraint" placeholder="Constraint/Validation (e.g. min=0,max=100)" value="${field.constraint||""}"></div>
            <div class="mb-2" id="choicesRow" style="display:${['select_one','select_multiple'].includes(field.type)?'block':'none'}">
              <input class="form-control" id="fieldChoices" placeholder="Choices (comma-separated, e.g. Yes,No,Unknown)" value="${field.choices||''}" ${['select_one','select_multiple'].includes(field.type)?'required':''}>
            </div>
            <div class="mb-2" id="calcRow" style="display:${field.type==='calculate'?'block':'none'}">
              <input class="form-control" id="fieldCalc" placeholder="Calculation Formula (e.g. today() - dob)" value="${field.calc||''}">
            </div>
            <div class="mb-2 d-flex justify-content-between">
              <button class="btn btn-primary">${fidx!==null?"Save":"Add"}</button>
              <button type="button" class="btn btn-secondary" id="cancelFieldBtn">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(fModal);
      fModal.onclick = e => { if (e.target === fModal) document.body.removeChild(fModal); };
      fModal.querySelector("#cancelFieldBtn").onclick = () => document.body.removeChild(fModal);

      // Show/hide choices/calculation row
      fModal.querySelector("#fieldType").onchange = function() {
        const showChoices = ['select_one','select_multiple'].includes(this.value);
        fModal.querySelector("#choicesRow").style.display = showChoices ? 'block' : 'none';
        fModal.querySelector("#fieldChoices").required = showChoices;
        fModal.querySelector("#calcRow").style.display = this.value==='calculate'?'block':'none';
      };

      fModal.querySelector("#fieldForm").onsubmit = function(e) {
        e.preventDefault();
        let updated = {
          name: this.fieldName.value,
          type: this.fieldType.value,
          required: this.fieldReq.checked,
          default: this.fieldDefault.value,
          constraint: this.fieldConstraint.value,
        };
        if(['select_one','select_multiple'].includes(updated.type))
          updated.choices = this.fieldChoices.value;
        if(updated.type==='calculate')
          updated.calc = this.fieldCalc.value;
        if(fidx!==null) db.customPatientFields[fidx] = updated;
        else db.customPatientFields.push(updated);
        saveDb();
        document.body.removeChild(fModal);
        refreshFields();
      };
    }
      };
    }

    // Edit, reorder, delete fields
    attachFieldHandlers();

    function attachFieldHandlers() {
      document.querySelectorAll(".editFieldBtn").forEach(btn => btn.onclick = () => showFieldFormPatient(db.customPatientFields[btn.dataset.fidx], btn.dataset.fidx));
      document.querySelectorAll(".deleteFieldBtn").forEach(btn => btn.onclick = () => {
        if (confirm("Delete this field? Data already captured for this field will be kept in old records.")) {
          db.customPatientFields.splice(btn.dataset.fidx,1); 
          saveDb();
          refreshFields();
        }
      });
      document.querySelectorAll(".moveUpBtn").forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.fidx;
        if (i > 0) {
          [db.customPatientFields[i-1], db.customPatientFields[i]] = [db.customPatientFields[i], db.customPatientFields[i-1]];
          saveDb();
          refreshFields();
        }
      });
      document.querySelectorAll(".moveDownBtn").forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.fidx;
        if (i < db.customPatientFields.length-1) {
          [db.customPatientFields[i], db.customPatientFields[i+1]] = [db.customPatientFields[i+1], db.customPatientFields[i]];
          saveDb();
          refreshFields();
        }
      });
    }

    function refreshFields() {
      document.querySelector("#customFieldList").innerHTML = (db.customPatientFields||[]).map((f,i) => renderFieldRow(f,i)).join("");
      attachFieldHandlers();
    }

    // Handle multi-select checkboxes
    // Attach change handlers for multi-select custom fields
    (db.customPatientFields||[]).forEach(field => {
      if (field.type === 'select_multiple') {
        const checkboxes = document.querySelectorAll(`input[id^="custom_${field.name}_"]`);
        const hiddenInput = document.getElementById(`custom_${field.name}`);
        if (checkboxes.length > 0 && hiddenInput) {
          checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
              const checked = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
              hiddenInput.value = checked.join(', ');
            });
          });
        }
      }
    });
    // ...end of showForm
  }

  function close() {
    document.getElementById("modalWrap").className = "";
    document.getElementById("modalWrap").innerHTML = "";
  }

  function renderCustomField(field, existing) {
    // Render a form input for a custom field based on its type
    const value = (existing.customFields && existing.customFields[field.name]) || '';
    const id = `custom_${field.name}`;
    switch (field.type) {
      case 'text':
        return `<input id="${id}" class="form-control mb-2" placeholder="${field.label || field.name}" value="${value}">`;
      case 'integer':
        return `<input id="${id}" type="number" step="1" class="form-control mb-2" placeholder="${field.label || field.name}" value="${value}">`;
      case 'decimal':
        return `<input id="${id}" type="number" step="any" class="form-control mb-2" placeholder="${field.label || field.name}" value="${value}">`;
      case 'date':
        return `<input id="${id}" type="date" class="form-control mb-2" value="${value}">`;
      case 'select_one': {
        // Ensure choices is an array
        let choices = field.choices;
        if (typeof choices === 'string') choices = choices.split(',').map(s => s.trim()).filter(Boolean);
        if (!Array.isArray(choices)) choices = [];
        return `<select id="${id}" class="form-select mb-2">` +
          `<option value="">${field.label || field.name}</option>` +
          choices.map(opt => `<option value="${opt}"${value===opt?' selected':''}>${opt}</option>`).join('') +
          `</select>`;
      }
      case 'select_multiple': {
        let choices = field.choices;
        if (typeof choices === 'string') choices = choices.split(',').map(s => s.trim()).filter(Boolean);
        if (!Array.isArray(choices)) choices = [];
        // Render checkboxes and a hidden input to store comma-separated values
        return `<div class="mb-2">` +
          choices.map((opt, i) => {
            const checked = value.split(',').map(v=>v.trim()).includes(opt) ? 'checked' : '';
            return `<div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" id="${id}_${i}" value="${opt}" ${checked}>
              <label class="form-check-label" for="${id}_${i}">${opt}</label>
            </div>`;
          }).join('') +
          `<input type="hidden" id="${id}" value="${value}"></div>`;
      }
      case 'note':
        return `<div class="alert alert-secondary mb-2">${field.label || field.name}</div>`;
      default:
        return `<input id="${id}" class="form-control mb-2" placeholder="${field.label || field.name}" value="${value}">`;
    }
  }

  function renderFieldRow(field, idx) {
    // Render a row for the custom field in the custom field list
    return `<li class="list-group-item d-flex justify-content-between align-items-center">
      <span><b>${field.label || field.name}</b> <small class="text-muted">(${field.type})</small></span>
      <span>
        <button type="button" class="btn btn-sm btn-outline-primary editFieldBtn" data-fidx="${idx}"><i class="bi bi-pencil"></i></button>
        <button type="button" class="btn btn-sm btn-outline-danger deleteFieldBtn" data-fidx="${idx}"><i class="bi bi-trash"></i></button>
        <button type="button" class="btn btn-sm btn-outline-secondary moveUpBtn" data-fidx="${idx}"><i class="bi bi-arrow-up"></i></button>
        <button type="button" class="btn btn-sm btn-outline-secondary moveDownBtn" data-fidx="${idx}"><i class="bi bi-arrow-down"></i></button>
      </span>
    </li>`;
  }
