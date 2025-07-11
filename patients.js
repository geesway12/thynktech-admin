
import { db, saveDb } from './db.js';
import { generatePatientID, calculateAge, formatDate } from './helpers.js';
import { createVisitForm } from './visits.js';
import { renderServiceEntryForm } from './services.js';
import { renderAppointmentForm } from './appointments.js';
import { exportPatientA4 } from './export.js';

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'select_one', label: 'Single Select (select_one)' },
  { value: 'select_multiple', label: 'Multiple Select (select_multiple)' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'note', label: 'Note/Label' },
  { value: 'calculate', label: 'Calculation' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'file', label: 'File Upload' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'qr_code', label: 'QR Code' },
  { value: 'geopoint', label: 'Geopoint' },
  { value: 'geotrace', label: 'Geotrace' },
  { value: 'geoshape', label: 'Geoshape' }
];

function getReverseRelationship(relationship) {
  switch (relationship) {
    case 'child':
      return 'parent';
    case 'father':
      return 'child';
    case 'mother':
      return 'child';
    case 'partner':
      return 'partner';
    case 'parent':
      return 'child';
    default:
      return 'related to';
  }
}



export function renderPatientList(root) {

  function renderListView() {
    root.innerHTML = `
      <div class="container my-4">
        <div class="d-flex justify-content-between align-items-center">
          <h4><i class="bi bi-people"></i> Patients</h4>
        </div>
        <div class="mb-3 d-flex gap-2">
          <button class="btn btn-success" type="button" id="addBtn"><i class="bi bi-person-plus"></i> New Patient</button>
        </div>
        <form id="searchForm" class="row g-2 mb-3">
          <div class="col-md-5"><input name="q" class="form-control" placeholder="Search by ID or Name" /></div>
          <div class="col-md-2"><button class="btn btn-primary w-100" type="submit"><i class="bi bi-search"></i> Search</button></div>
        </form>
        <div id="modalWrap"></div>
        <div class="table-responsive">
          <table class="table table-bordered table-hover align-middle patient-table-mobile">
            <thead class="table-light">
              <tr>
                <th>ID</th><th>Name</th><th class="d-none d-md-table-cell">Reg&nbsp;Date</th><th class="d-none d-md-table-cell">DOB</th><th class="d-none d-md-table-cell">Age</th>
                <th class="d-none d-md-table-cell">Sex</th><th class="d-none d-md-table-cell">Phone</th><th class="d-none d-md-table-cell">Family</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="listBody"></tbody>
          </table>
        </div>
        <a href="#admin-dashboard" class="btn btn-link mt-2"><i class="bi bi-arrow-left"></i> Back</a>
      </div>
    `;

    if (!document.getElementById('patients-mobile-style')) {
      const style = document.createElement('style');
      style.id = 'patients-mobile-style';
      style.textContent = `
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
          .patient-table-mobile td:not(:nth-child(1)):not(:nth-child(2)):not(:last-child) { display: none !important; }
        }
      `;
      document.head.appendChild(style);
    }
    document.getElementById("addBtn").onclick = () => renderFormView();
    document.getElementById("searchForm").onsubmit = e => {
      e.preventDefault();
      refresh(Object.fromEntries(new FormData(e.target)));
    };
    refresh();
  }

  function renderFormView(existing = {}) {
    root.innerHTML = `
      <div class="container my-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h4><i class="bi bi-person-plus"></i> ${existing.patientID ? "Edit" : "New"} Patient</h4>
          <button class="btn btn-outline-secondary" id="backToListBtn"><i class="bi bi-arrow-left"></i> Back to List</button>
        </div>
        <div class="mb-3 d-flex gap-2">
          <button class="btn btn-outline-secondary" type="button" id="manageFieldsBtn"><i class="bi bi-sliders"></i> Manage Custom Fields</button>
        </div>
        <div id="formWrap"></div>
        <div id="modalWrap"></div>
      </div>
    `;
    document.getElementById("backToListBtn").onclick = () => renderListView();
    document.getElementById("manageFieldsBtn").onclick = showCustomFieldManager;
    showForm(existing);
  }

  renderListView();

  function refresh(filter = {}) {
    let rows = db.patients || [];
    if (filter.q) {
      const q = filter.q.toLowerCase();
      rows = rows.filter(r =>
        (r.patientID && r.patientID.toLowerCase().includes(q)) ||
        (r.surname && r.surname.toLowerCase().includes(q)) ||
        (r.otherNames && r.otherNames.toLowerCase().includes(q))
      );
    }
    const listBody = document.getElementById("listBody");
    if (!listBody) return;
    listBody.innerHTML = rows.length === 0
      ? `<tr><td colspan="9" class="text-center text-muted">No patients found.</td></tr>`
      : rows.map((p, i) => {

        const fullName = `${p.surname || ''} ${p.otherNames || ''}`.trim();

        let familyDisplay = '';
        const familyMembers = [];

        if (p.familyId) {
          const fam = (db.patients || []).find(f => f.patientID === p.familyId);
          if (fam) {
            const relationshipLabel = p.familyRelationship || 'related to';
            familyMembers.push(`${fam.surname || ''} ${fam.otherNames || ''} (${relationshipLabel})`);
          }
        }

        const relatedPatients = (db.patients || []).filter(patient => patient.familyId === p.patientID);
        relatedPatients.forEach(related => {
          const reverseRelationship = getReverseRelationship(related.familyRelationship);
          familyMembers.push(`${related.surname || ''} ${related.otherNames || ''} (${reverseRelationship})`);
        });
        
        familyDisplay = familyMembers.length > 0 ? familyMembers.join(', ') : '';
        return `
      <tr>
        <td data-label="ID">${p.patientID || ''}</td>
        <td data-label="Name">${fullName}</td>
        <td class="d-none d-md-table-cell" data-label="Reg Date">${formatDate(p.registrationDate) || ''}</td>
        <td class="d-none d-md-table-cell" data-label="DOB">${formatDate(p.dob) || ''}</td>
        <td class="d-none d-md-table-cell" data-label="Age">${p.age ?? ''}</td>
        <td class="d-none d-md-table-cell" data-label="Sex">${p.sex || ''}</td>
        <td class="d-none d-md-table-cell" data-label="Phone">${p.phone || ''}</td>
        <td class="d-none d-md-table-cell" data-label="Family">${familyDisplay}</td>
        <td data-label="Actions">
          <button class="btn btn-sm btn-primary me-1" data-i="${i}" data-act="view" title="View/Edit"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-danger me-1" data-i="${i}" data-act="del" title="Delete"><i class="bi bi-trash"></i></button>
          <button class="btn btn-sm btn-outline-success me-1" data-i="${i}" data-act="visit" title="Log Visit"><i class="bi bi-journal-plus"></i></button>
          <button class="btn btn-sm btn-outline-secondary me-1" data-i="${i}" data-act="service" title="Service Entry"><i class="bi bi-ui-checks-grid"></i></button>
          <button class="btn btn-sm btn-outline-primary me-1" data-i="${i}" data-act="appoint" title="Book Appointment"><i class="bi bi-calendar-plus"></i></button>
          <button class="btn btn-sm btn-outline-info" data-i="${i}" data-act="pdf" title="Download PDF Report"><i class="bi bi-file-earmark-pdf"></i></button>
        </td>
      </tr>
      <tr class="visit-form-row d-none" data-form-i="${i}">
        <td colspan="9"><div class="visit-form-container"></div></td>
      </tr>`;
      }).join("");

    document.querySelectorAll("[data-act=view]").forEach(b => b.onclick = () => renderFormView(rows[b.dataset.i]));
    document.querySelectorAll("[data-act=del]").forEach(b => b.onclick = () => {
      if (confirm("Delete this patient?")) {
        db.patients.splice(b.dataset.i, 1); saveDb(); refresh();
      }
    });
    document.querySelectorAll("[data-act=visit]").forEach(b => b.onclick = () => {
      const i = b.dataset.i;
      const patient = rows[i];
      const formRow = document.querySelector(`.visit-form-row[data-form-i="${i}"]`);
      const container = formRow.querySelector(".visit-form-container");

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
      const defaultService = (db.registers && db.registers.length) ? db.registers[0].name : "General";
      const today = new Date().toISOString().slice(0, 10);

      const modalWrap = document.getElementById("modalWrap");
      modalWrap.innerHTML = `
        <div class="modal-content mx-auto" style="max-width:400px;">
          <h5>Book Appointment for <span class="text-primary">${patient.surname || ''} ${patient.otherNames || ''}</span></h5>
          <form id="quickAptForm" class="mt-3">
            <div class="mb-3">
              <label class="form-label">Service</label>
              <select class="form-select" id="aptService" required>
                ${(db.registers||[]).map(r => `<option value="${r.name}"${r.name===defaultService?' selected':''}>${r.name}</option>`).join('')}
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Date</label>
              <input type="date" class="form-control" id="aptDate" min="${today}" value="${today}" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Notes (optional)</label>
              <textarea class="form-control" id="aptNotes" rows="2"></textarea>
            </div>
            <div class="d-flex justify-content-between">
              <button class="btn btn-primary"><i class="bi bi-check2-circle"></i> Book</button>
              <button type="button" class="btn btn-secondary" id="cancelAptBtn">Cancel</button>
            </div>
            <div id="aptMsg" class="mt-2"></div>
          </form>
        </div>
      `;
      modalWrap.className = "active";
      modalWrap.onclick = e => { if (e.target === modalWrap) close(); };
      document.getElementById("cancelAptBtn").onclick = close;
      document.getElementById("quickAptForm").onsubmit = function(e) {
        e.preventDefault();
        const service = document.getElementById("aptService").value;
        const date = document.getElementById("aptDate").value;
        const notes = document.getElementById("aptNotes").value;
        if (!service || !date) {
          document.getElementById("aptMsg").innerHTML = '<div class="alert alert-danger">Service and date are required.</div>';
          return;
        }
        db.appointments = db.appointments || [];
        db.appointments.push({
          patientID: patient.patientID,
          patientName: `${patient.surname || ''} ${patient.otherNames || ''}`.trim(),
          serviceType: service,
          appointmentDate: date,
          notes: notes,
          status: "Scheduled",
          createdBy: db.currentUser?.username || '',
          timestamp: Date.now()
        });
        saveDb();
        document.getElementById("aptMsg").innerHTML = '<div class="alert alert-success">Appointment booked!</div>';
        setTimeout(() => { close(); }, 1000);

        const adminAptList = document.getElementById('adminAptList');
        if (adminAptList && typeof window.renderAdminDashboard === 'function') {
          window.renderAdminDashboard(document.getElementById('app'));
        }
      };
    });
    document.querySelectorAll("[data-act=pdf]").forEach(b => b.onclick = () => {
      const i = b.dataset.i;
      const patient = rows[i];
      exportPatientA4(patient.patientID);
    });
  }

  function showCustomFieldManager() {
    const wrap = document.getElementById("modalWrap");
    let customFieldRows = (db.customPatientFields || []).map((f, i) => renderFieldRow(f, i)).join('');
    wrap.innerHTML =
      '<div class="modal-content mx-auto" style="max-width:500px;">' +
        '<h5>Manage Custom Patient Fields</h5>' +
        '<div id="fieldFormContainer"></div>' +
        '<div class="d-flex justify-content-end mb-2">' +
          '<button class="btn btn-sm btn-success" id="addFieldBtn"><i class="bi bi-plus"></i> Add Field</button>' +
        '</div>' +
        '<ul class="list-group mt-2" id="customFieldList">' +
          customFieldRows +
        '</ul>' +
        '<div class="d-flex justify-content-end mt-3">' +
          '<button class="btn btn-secondary" id="closeFieldMgr">Close</button>' +
        '</div>' +
      '</div>';
    wrap.className = "active";
    wrap.onclick = e => { if (e.target === wrap) close(); };
    document.getElementById("closeFieldMgr").onclick = () => { wrap.className = ""; wrap.innerHTML = ""; };
    document.getElementById("addFieldBtn").onclick = () => showFieldModalInForm();
    attachFieldHandlers();

    function refreshFields() {
      document.getElementById("customFieldList").innerHTML = (db.customPatientFields || []).map((f, i) => renderFieldRow(f, i)).join('');
      attachFieldHandlers();

      const customFieldsInputs = document.getElementById("customFieldsInputs");
      if (customFieldsInputs) {

        const existing = {};
        document.querySelectorAll('[id^="custom_"]').forEach(el => {
          const key = el.id.replace('custom_', '');
          existing[key] = el.value;
        });
        customFieldsInputs.innerHTML = (db.customPatientFields || []).map(f => renderCustomField(f, { customFields: existing })).join('');
      }
    }
    function attachFieldHandlers() {
      document.querySelectorAll(".editFieldBtn").forEach(btn => btn.onclick = () => showFieldModalInForm(db.customPatientFields[btn.dataset.fidx], btn.dataset.fidx));
      document.querySelectorAll(".deleteFieldBtn").forEach(btn => btn.onclick = () => {
        if (confirm("Delete this field? Data already captured for this field will be kept in old records.")) {
          db.customPatientFields.splice(btn.dataset.fidx, 1);
          saveDb();
          refreshFields();
        }
      });
      document.querySelectorAll(".moveUpBtn").forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.fidx;
        if (i > 0) {
          [db.customPatientFields[i - 1], db.customPatientFields[i]] = [db.customPatientFields[i], db.customPatientFields[i - 1]];
          saveDb();
          refreshFields();
        }
      });
      document.querySelectorAll(".moveDownBtn").forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.fidx;
        if (i < db.customPatientFields.length - 1) {
          [db.customPatientFields[i], db.customPatientFields[i + 1]] = [db.customPatientFields[i + 1], db.customPatientFields[i]];
          saveDb();
          refreshFields();
        }
      });
    }

    function showFieldModalInForm(field = { name: "", type: "text", required: false }, fidx = null) {
      const container = document.getElementById("fieldFormContainer");
      const options = fieldTypes.map(t => `<option value="${t.value}"${field.type === t.value ? ' selected' : ''}>${t.label}</option>`).join('');
      container.innerHTML =
        '<div class="card card-body mb-2 border-primary">' +
          '<form id="fieldForm">' +
            '<div class="row g-2 align-items-center">' +
              `<div class="col-md-4"><input class="form-control" id="fieldName" placeholder="Field Name" required value="${field.name || ''}"></div>` +
              '<div class="col-md-3">' +
                `<select class="form-select" id="fieldType" required>${options}</select>` +
              '</div>' +
              '<div class="col-md-2 form-check">' +
                `<input class="form-check-input" type="checkbox" id="fieldReq" ${field.required ? 'checked' : ''}>` +
                '<label class="form-check-label" for="fieldReq">Required</label>' +
              '</div>' +
              `<div class="col-md-3"><input class="form-control" id="fieldDefault" placeholder="Default Value" value="${field.default || ''}"></div>` +
            '</div>' +
            '<div class="row g-2 mt-2">' +
              `<div class="col-md-6"><input class="form-control" id="fieldConstraint" placeholder="Constraint/Validation (e.g. min=0,max=100)" value="${field.constraint || ''}"></div>` +
              `<div class="col-md-6" id="choicesRow" style="display:${['select_one', 'select_multiple'].includes(field.type) ? 'block' : 'none'}">` +
                `<input class="form-control" id="fieldChoices" placeholder="Choices (comma-separated, e.g. Yes,No,Unknown)" value="${field.choices || ''}" ${['select_one', 'select_multiple'].includes(field.type) ? 'required' : ''}>` +
              '</div>' +
              `<div class="col-md-6" id="calcRow" style="display:${field.type === 'calculate' ? 'block' : 'none'}">` +
                `<input class="form-control" id="fieldCalc" placeholder="Calculation Formula (e.g. today() - dob)" value="${field.calc || ''}">` +
              '</div>' +
            '</div>' +
            '<div class="mt-2 d-flex justify-content-end gap-2">' +
              `<button class="btn btn-primary">${fidx !== null ? 'Save Field' : 'Add Field'}</button>` +
              '<button type="button" class="btn btn-secondary" id="cancelFieldBtn">Cancel</button>' +
            '</div>' +
          '</form>' +
        '</div>';
      const fieldTypeSelect = container.querySelector("#fieldType");
      fieldTypeSelect.onchange = function () {
        const showChoices = ['select_one', 'select_multiple'].includes(this.value);
        container.querySelector("#choicesRow").style.display = showChoices ? 'block' : 'none';
        container.querySelector("#fieldChoices").required = showChoices;
        container.querySelector("#calcRow").style.display = this.value === 'calculate' ? 'block' : 'none';
      };
      container.querySelector("#cancelFieldBtn").onclick = () => container.innerHTML = '';
      container.querySelector("#fieldForm").onsubmit = function (e) {
        e.preventDefault();
        let updated = {
          name: this.fieldName.value,
          type: this.fieldType.value,
          required: this.fieldReq.checked,
          default: this.fieldDefault.value,
          constraint: this.fieldConstraint.value,
        };
        if (["select_one", "select_multiple"].includes(updated.type))
          updated.choices = this.fieldChoices.value;
        if (updated.type === "calculate")
          updated.calc = this.fieldCalc.value;
        if (fidx !== null) db.customPatientFields[fidx] = updated;
        else db.customPatientFields.push(updated);
        saveDb();
        container.innerHTML = '';
        refreshFields();

        setTimeout(() => {
          if (updated.name) {
            const el = document.getElementById(`custom_${updated.name}`);
            if (el) el.focus();
          }
        }, 100);
      };
    }
  }

  function showForm(existing = {}) {
    const today = new Date().toISOString().slice(0, 10);
    const formWrap = document.getElementById("formWrap");
    if (!formWrap) return;
    formWrap.innerHTML = `
      <div class="modal-content mx-auto" style="max-width:600px;">
        <form id="pForm" class="mt-2" autocomplete="off" novalidate>
          <div class="row g-2">
            <div class="col-md-6">
              <label class="form-label mb-0">Date of Registration</label>
              <input  type="date" id="dor" class="form-control mb-2" value="${existing.registrationDate || today}" max="${today}" required>
            </div>
            <div class="col-md-6">
              <label class="form-label mb-0">Date of Birth</label>
              <input  type="date" id="dob" class="form-control" value="${existing.dob || ''}" max="${today}" required>
              <small id="ageLive" class="text-muted mb-2 d-block"></small>
            </div>
          </div>
          <div class="row g-2">
            <div class="col-md-6">
              <input id="surname" class="form-control mb-2" placeholder="Surname" required value="${existing.surname || ''}">
            </div>
            <div class="col-md-6">
              <input id="otherNames" class="form-control mb-2" placeholder="Other Names" required value="${existing.otherNames || ''}">
            </div>
          </div>
          <div class="row g-2">
            <div class="col-md-6">
              <select id="sex" class="form-select mb-2" required>
                <option value="">Sex</option>
                <option value="M"${existing.sex === "M" ? " selected" : ""}>Male</option>
                <option value="F"${existing.sex === "F" ? " selected" : ""}>Female</option>
                <option value="O"${existing.sex === "O" ? " selected" : ""}>Other</option>
              </select>
            </div>
            <div class="col-md-6">
              <input id="phone" class="form-control mb-2" placeholder="Phone 024-xxx-xxxx" required maxlength="13" pattern="0[0-9]{9}" value="${existing.phone || ''}">
              <div class="invalid-feedback" id="phoneError">Phone must be 10 digits, e.g. 0241234567</div>
            </div>
          </div>
          <input id="address" class="form-control mb-2" placeholder="Address" required value="${existing.address || ''}">
          <div class="row g-2">
            <div class="col-md-6">
              <select id="idType" class="form-select mb-2" required>
                <option value="">ID Type</option>
                <option value="GhanaCard"${existing.idType === "GhanaCard" ? " selected" : ""}>Ghana Card</option>
                <option value="NIN"${existing.idType === "NIN" ? " selected" : ""}>National ID (Legacy)</option>
                <option value="DL" ${existing.idType === "DL" ? " selected" : ""}>Driver's License</option>
                <option value="VOT"${existing.idType === "VOT" ? " selected" : ""}>Voter's Card</option>
                <option value="Passport"${existing.idType === "Passport" ? " selected" : ""}>Passport</option>
              </select>
            </div>
            <div class="col-md-6">
              <input id="idNumber" class="form-control mb-2" placeholder="ID Number (e.g., GHA-123456789-0)" required value="${existing.idNumber || ''}" 
                     pattern="${existing.idType === 'GhanaCard' ? 'GHA-[0-9]{9}-[0-9]|[0-9]{15}' : ''}" 
                     title="${existing.idType === 'GhanaCard' ? 'Ghana Card format: GHA-123456789-0 or 15 digits' : 'Enter valid ID number'}">
              <div class="invalid-feedback" id="idError" style="display:none;">Invalid Ghana Card format. Use GHA-123456789-0 or 15 consecutive digits.</div>
            </div>
          </div>
          <div class="row g-2">
            <div class="col-md-8">
              <label class="form-label mb-0">Family (link to existing patient)</label>
              <select id="familyId" class="form-select mb-2">
                <option value="">-- None --</option>
                ${(db.patients || []).filter(p => p.patientID !== existing.patientID).map(p => `<option value="${p.patientID}"${existing.familyId === p.patientID ? " selected" : ""}>${p.surname || ''} ${p.otherNames || ''} (${p.patientID})</option>`).join('')}
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label mb-0">Relationship</label>
              <select id="familyRelationship" class="form-select mb-2">
                <option value="">-- Select --</option>
                <option value="partner"${existing.familyRelationship === "partner" ? " selected" : ""}>Partner</option>
                <option value="child"${existing.familyRelationship === "child" ? " selected" : ""}>Child</option>
                <option value="father"${existing.familyRelationship === "father" ? " selected" : ""}>Father</option>
                <option value="mother"${existing.familyRelationship === "mother" ? " selected" : ""}>Mother</option>
                <option value="other"${existing.familyRelationship === "other" ? " selected" : ""}>Other</option>
              </select>
            </div>
          </div>
          <div class="card card-body mb-3 bg-light">
            <div class="fw-bold mb-2">Custom Fields</div>
            <div class="mt-3" id="customFieldsInputs">
              ${(db.customPatientFields || []).map(f => renderCustomField(f, existing)).join('')}
            </div>
          </div>
          <div class="d-flex justify-content-between">
            <button class="btn btn-primary">${existing.patientID ? "Save" : "Add"}</button>
          </div>
        </form>
      </div>`;
    const pForm = document.getElementById("pForm");
    const dobField = pForm.dob; const ageLabel = pForm.querySelector("#ageLive");
    const phoneField = pForm.phone;
    const phoneError = document.getElementById("phoneError");
    const idError = document.getElementById("idError");
    const updateAge = () => ageLabel.textContent = dobField.value ? `Age: ${calculateAge(dobField.value)}` : "";
    dobField.addEventListener("input", updateAge); updateAge();

    const validateField = el => {
      if (el.id === 'phone') {
        const digits = el.value.replace(/\D/g, '');
        if (!digits || digits.length !== 10 || !digits.startsWith('0')) {
          el.classList.add('is-invalid');
          el.classList.remove('is-valid');
          phoneError.style.display = 'block';
        } else {
          el.classList.remove('is-invalid');
          el.classList.add('is-valid');
          phoneError.style.display = 'none';
        }        } else if (el.id === 'idNumber') {
        const idType = pForm.idType.value;
        const value = el.value.trim();
        if (idType === 'GhanaCard' && value) {

          const ghanaCardFormat1 = /^GHA-[0-9]{9}-[0-9]$/; // GHA-123456789-0
          const ghanaCardFormat2 = /^[0-9]{15}$/; // 15 consecutive digits
          if (!ghanaCardFormat1.test(value) && !ghanaCardFormat2.test(value)) {
            el.classList.add('is-invalid');
            el.classList.remove('is-valid');
            idError.style.display = 'block';
            el.setCustomValidity('Invalid Ghana Card format. Use GHA-123456789-0 or 15 consecutive digits.');
          } else {
            el.classList.remove('is-invalid');
            el.classList.add('is-valid');
            idError.style.display = 'none';
            el.setCustomValidity('');
          }
        } else if (el.hasAttribute('required') && !value) {
          el.classList.add('is-invalid');
          el.classList.remove('is-valid');
          idError.style.display = 'none';
          el.setCustomValidity('ID Number is required.');
        } else {
          el.classList.remove('is-invalid');
          el.classList.add('is-valid');
          idError.style.display = 'none';
          el.setCustomValidity('');
        }
      } else if (el.hasAttribute('required')) {
        if (!el.value.trim()) {
          el.classList.add('is-invalid');
          el.classList.remove('is-valid');
        } else {
          el.classList.remove('is-invalid');
          el.classList.add('is-valid');
        }
      }
    };
    Array.from(pForm.elements).forEach(el => {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        el.addEventListener('input', () => validateField(el));

        validateField(el);
      }
    });

    pForm.onsubmit = e => {
      e.preventDefault();
      let valid = true;
      Array.from(pForm.elements).forEach(el => {
        if (el.id === 'phone') {
          const digits = el.value.replace(/\D/g, '');
          if (!digits || digits.length !== 10 || !digits.startsWith('0')) {
            el.classList.add('is-invalid');
            el.classList.remove('is-valid');
            valid = false;
          }
        } else if (el.id === 'idNumber') {
          const idType = pForm.idType.value;
          const value = el.value.trim();
          if (idType === 'GhanaCard' && value) {
            const ghanaCardFormat1 = /^GHA-[0-9]{9}-[0-9]$/;
            const ghanaCardFormat2 = /^[0-9]{15}$/;
            if (!ghanaCardFormat1.test(value) && !ghanaCardFormat2.test(value)) {
              el.classList.add('is-invalid');
              el.classList.remove('is-valid');
              valid = false;
            }
          } else if (el.hasAttribute('required') && !value) {
            el.classList.add('is-invalid');
            el.classList.remove('is-valid');
            valid = false;
          }
        } else if (el.hasAttribute('required') && !el.value.trim()) {
          el.classList.add('is-invalid');
          el.classList.remove('is-valid');
          valid = false;
        }
      });
      if (!valid) return;

      const patient = Object.assign({}, existing);
      patient.registrationDate = pForm.dor.value;
      patient.dob = pForm.dob.value;
      patient.surname = pForm.surname.value.trim();
      patient.otherNames = pForm.otherNames.value.trim();
      patient.sex = pForm.sex.value;
      patient.phone = pForm.phone.value.trim();
      patient.address = pForm.address.value.trim();
      patient.idType = pForm.idType.value;
      patient.idNumber = pForm.idNumber.value.trim();
      patient.familyId = pForm.familyId.value;
      patient.familyRelationship = pForm.familyRelationship.value;

      patient.age = patient.dob ? calculateAge(patient.dob) : '';

      patient.customFields = patient.customFields || {};
      (db.customPatientFields || []).forEach(field => {
        const el = document.getElementById(`custom_${field.name}`);
        if (el) patient.customFields[field.name] = el.value;
      });

      if (!patient.patientID) patient.patientID = generatePatientID(pForm.dor.value);

      if (!existing.patientID) {
        db.patients.push(patient);
      } else {
        const idx = db.patients.findIndex(p => p.patientID === existing.patientID);
        if (idx !== -1) db.patients[idx] = patient;
      }
      saveDb();
      renderListView();
    };

    (db.customPatientFields || []).forEach(field => {
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

    const idTypeField = pForm.idType;
    const idNumberField = pForm.idNumber;
    
    const updateIdValidation = () => {
      const idType = idTypeField.value;
      if (idType === 'GhanaCard') {
        idNumberField.placeholder = 'Ghana Card (GHA-123456789-0 or 15 digits)';
        idNumberField.pattern = 'GHA-[0-9]{9}-[0-9]|[0-9]{15}';
        idNumberField.title = 'Ghana Card format: GHA-123456789-0 or 15 consecutive digits';
      } else if (idType === 'Passport') {
        idNumberField.placeholder = 'Passport Number (e.g., G1234567)';
        idNumberField.pattern = '[A-Z][0-9]{7}';
        idNumberField.title = 'Passport format: G1234567';
      } else {
        idNumberField.placeholder = 'ID Number';
        idNumberField.removeAttribute('pattern');
        idNumberField.title = 'Enter valid ID number';
      }

      validateField(idNumberField);
    };
    
    idTypeField.addEventListener('change', updateIdValidation);
    updateIdValidation(); // Initialize
  }

  function close() {
    document.getElementById("modalWrap").className = "";
    document.getElementById("modalWrap").innerHTML = "";
  }
}

function renderCustomField(field, existing) {
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
      let choices = field.choices;
      if (typeof choices === 'string') choices = choices.split(',').map(s => s.trim()).filter(Boolean);
      if (!Array.isArray(choices)) choices = [];
      return `<select id="${id}" class="form-select mb-2">` +
        `<option value="">${field.label || field.name}</option>` +
        choices.map(opt => `<option value="${opt}"${value === opt ? ' selected' : ''}>${opt}</option>`).join('') +
        `</select>`;
    }
    case 'select_multiple': {
      let choices = field.choices;
      if (typeof choices === 'string') choices = choices.split(',').map(s => s.trim()).filter(Boolean);
      if (!Array.isArray(choices)) choices = [];
      return `<div class="mb-2">` +
        choices.map((opt, i) => {
          const checked = value.split(',').map(v => v.trim()).includes(opt) ? 'checked' : '';
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
