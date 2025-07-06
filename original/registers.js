import { db, saveDb } from './db.js';

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

if (!db.registers) db.registers = [];

export function renderRegisterMgmt(container) {
  container.innerHTML = `
    <div class="container my-4" style="padding: 20px;">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h4><i class="bi bi-journals"></i> Service Register Management</h4>
        <div class="d-flex">
          <button class="btn btn-success me-2" id="addRegBtn"><i class="bi bi-plus"></i> New Register</button>
          <button class="btn btn-primary" id="uploadBtn"><i class="bi bi-cloud-upload"></i> Upload Registers</button>
        </div>
      </div>
      <div id="formContainer" class="mb-4" style="display: none;"></div>
      <div class="row" id="regList" style="gap: 10px;">
        ${db.registers.map((r,i)=>`
          <div class="col-md-3">
            <div class="card shadow-sm" style="margin: 5px;">
              <div class="card-body" style="padding: 10px;">
                <h6>${r.name}</h6>
                <small class="text-muted">${r.fields.length} fields</small>
                <div class="mt-2">
                  <button class="btn btn-sm btn-primary me-2" data-idx="${i}"><i class="bi bi-pencil"></i> Edit</button>
                  <button class="btn btn-sm btn-danger" data-idx="${i}"><i class="bi bi-trash"></i></button>
                  <button class="btn btn-sm btn-secondary assignBtn" data-idx="${i}"><i class="bi bi-person-plus"></i> Assign Users</button>
                </div>
                <div class="mt-2 small text-muted">
                  Assigned: ${(r.assignedUsers||[]).map(u=>u).join(', ') || 'None'}
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
      <a href="#admin-dashboard" class="btn btn-link mt-2" style="margin-top: 20px;"><i class="bi bi-arrow-left"></i> Back</a>
      <div id="regModal"></div>
    </div>
  `;
  // List handlers
  container.querySelectorAll("button.btn-primary").forEach(btn =>
    btn.onclick = () => showRegForm(db.registers[btn.dataset.idx], btn.dataset.idx)
  );
  container.querySelectorAll("button.btn-danger").forEach(btn =>
    btn.onclick = () => {
      if (confirm("Delete this register? All service data will be kept but new entry will be disabled for this register.")) {
        db.registers.splice(btn.dataset.idx, 1); saveDb(); renderRegisterMgmt(container);
      }
    }
  );
  container.querySelector("#addRegBtn").onclick = () => {
    const formContainer = container.querySelector("#formContainer");
    formContainer.style.display = "block";
    let tempFields = [];
    function renderFieldList() {
      const list = formContainer.querySelector("#fieldList");
      if (list) list.innerHTML = tempFields.map((f, i) => renderFieldRow(f, i)).join("");
      // Add edit/delete/move handlers
      formContainer.querySelectorAll(".editFieldBtn").forEach(btn => btn.onclick = () => showFieldFormModal(tempFields[btn.dataset.fidx], btn.dataset.fidx));
      formContainer.querySelectorAll(".deleteFieldBtn").forEach(btn => btn.onclick = () => { tempFields.splice(btn.dataset.fidx, 1); renderFieldList(); });
      formContainer.querySelectorAll(".moveUpBtn").forEach(btn => btn.onclick = () => { const i = +btn.dataset.fidx; if (i > 0) { [tempFields[i-1], tempFields[i]] = [tempFields[i], tempFields[i-1]]; renderFieldList(); } });
      formContainer.querySelectorAll(".moveDownBtn").forEach(btn => btn.onclick = () => { const i = +btn.dataset.fidx; if (i < tempFields.length-1) { [tempFields[i+1], tempFields[i]] = [tempFields[i], tempFields[i+1]]; renderFieldList(); } });
    }
    function showFieldFormModal(field = {name:"", type:"text", required:false}, fidx=null) {
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
        if(fidx!==null) tempFields[fidx] = updated;
        else tempFields.push(updated);
        document.body.removeChild(fModal);
        renderFieldList();
      };
    }
    formContainer.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5>Create New Register</h5>
          <form id="regForm" autocomplete="off">
            <div class="mb-2"><input class="form-control" id="regName" placeholder="Register Name (e.g. ANC, OPD)" required></div>
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <b>Fields</b>
                <button type="button" class="btn btn-sm btn-success" id="addFieldBtn"><i class="bi bi-plus"></i> Add Field</button>
              </div>
              <ul class="list-group mt-2" id="fieldList"></ul>
            </div>
            <div class="mb-2 d-flex justify-content-between">
              <button class="btn btn-primary">Create</button>
              <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    renderFieldList();
    formContainer.querySelector("#addFieldBtn").onclick = () => showFieldFormModal();
    formContainer.querySelector("#cancelBtn").onclick = () => {
      formContainer.style.display = "none";
      formContainer.innerHTML = "";
    };
    formContainer.querySelector("#regForm").onsubmit = function(e) {
      e.preventDefault();
      const reg = {
        name: this.regName.value,
        fields: tempFields.slice(),
        assignedUsers: []
      };
      db.registers.push(reg);
      saveDb();
      formContainer.style.display = "none";
      formContainer.innerHTML = "";
      renderRegisterMgmt(container);
    };
  };

  // Assign users to register
  container.querySelectorAll(".assignBtn").forEach(btn =>
    btn.onclick = () => showAssignUsersModal(db.registers[btn.dataset.idx], btn.dataset.idx)
  );

  // Upload button handler
  container.querySelector("#uploadBtn").onclick = () => {
    const formContainer = container.querySelector("#formContainer");
    formContainer.style.display = "block";
    formContainer.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5>Upload Registers</h5>
          <form id="uploadForm">
            <label for="registerUploadInput" class="form-label">Upload Registers (.xlsx format):</label>
            <input type="file" id="registerUploadInput" class="form-control" accept=".xlsx">
            <div class="mt-3 d-flex justify-content-between">
              <button class="btn btn-primary">Upload</button>
              <button type="button" class="btn btn-secondary" id="cancelUploadBtn">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    container.querySelector("#cancelUploadBtn").onclick = () => {
      formContainer.style.display = "none";
      formContainer.innerHTML = "";
    };

    container.querySelector("#uploadForm").onsubmit = function(e) {
      e.preventDefault();
      const file = this.registerUploadInput.files[0];
      if (!file) {
        alert("Please select a file to upload.");
        return;
      }

      handleExcelUpload(file, function (uploadedRegisters) {
        db.registers.push(...uploadedRegisters);
        saveDb();
        formContainer.style.display = "none";
        formContainer.innerHTML = "";
        renderRegisterMgmt(container);
        alert("Registers uploaded successfully!");
      });
    };
  };

  // Register Form Modal
  function showRegForm(reg = { name: "", fields: [], assignedUsers: [] }, idx = null) {
    // For register modal
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content mx-auto" style="max-width:500px;">
        <h5>${idx!==null ? "Edit Register" : "New Register"}</h5>
        <form id="regForm" autocomplete="off">
          <div class="mb-2"><input class="form-control" id="regName" placeholder="Register Name (e.g. ANC, OPD)" required value="${reg.name||''}"></div>
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center">
              <b>Fields</b>
              <button type="button" class="btn btn-sm btn-success" id="addFieldBtn"><i class="bi bi-plus"></i> Add Field</button>
            </div>
            <ul class="list-group mt-2" id="fieldList">${(reg.fields || []).map(f => renderFieldRow(f)).join("")}</ul>
          </div>
          <div class="mb-2 d-flex justify-content-between">
            <button class="btn btn-primary">${idx!==null ? "Save" : "Create"}</button>
            <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = e => { if (e.target === modal) document.body.removeChild(modal); };
    modal.querySelector("#cancelBtn").onclick = () => document.body.removeChild(modal);

    // Add field
    document.getElementById("addFieldBtn").onclick = () => showFieldForm();

    // Edit, reorder, delete fields
    modal.querySelectorAll(".editFieldBtn").forEach(btn => btn.onclick = () => showFieldForm(reg.fields[btn.dataset.fidx], btn.dataset.fidx));
    modal.querySelectorAll(".deleteFieldBtn").forEach(btn => btn.onclick = () => {
      if (confirm("Delete this field? Data already captured for this field will be kept in old records.")) {
        reg.fields.splice(btn.dataset.fidx,1); refreshFields();
      }
    });
    modal.querySelectorAll(".moveUpBtn").forEach(btn => btn.onclick = () => {
      const i = +btn.dataset.fidx;
      if (i > 0) {
        [reg.fields[i-1], reg.fields[i]] = [reg.fields[i], reg.fields[i-1]];
        refreshFields();
      }
    });
    modal.querySelectorAll(".moveDownBtn").forEach(btn => btn.onclick = () => {
      const i = +btn.dataset.fidx;
      if (i < reg.fields.length-1) {
        [reg.fields[i], reg.fields[i+1]] = [reg.fields[i+1], reg.fields[i]];
        refreshFields();
      }
    });

    function refreshFields() {
      modal.querySelector("#fieldList").innerHTML = (reg.fields||[]).map(f => renderFieldRow(f)).join("");
      // Re-attach event handlers!
      modal.querySelectorAll(".editFieldBtn").forEach(btn => btn.onclick = () => showFieldForm(reg.fields[btn.dataset.fidx], btn.dataset.fidx));
      modal.querySelectorAll(".deleteFieldBtn").forEach(btn => btn.onclick = () => {
        if (confirm("Delete this field?")) {
          reg.fields.splice(btn.dataset.fidx,1); refreshFields();
        }
      });
      modal.querySelectorAll(".moveUpBtn").forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.fidx;
        if (i > 0) {
          [reg.fields[i-1], reg.fields[i]] = [reg.fields[i], reg.fields[i-1]];
          refreshFields();
        }
      });
      modal.querySelectorAll(".moveDownBtn").forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.fidx;
        if (i < reg.fields.length-1) {
          [reg.fields[i], reg.fields[i+1]] = [reg.fields[i+1], reg.fields[i]];
          refreshFields();
        }
      });
    }

    // Save register
    document.getElementById("regForm").onsubmit = function(e) {
      e.preventDefault();
      reg.name = this.regName.value;
      if (!reg.assignedUsers) reg.assignedUsers = [];
      if (idx!==null) db.registers[idx] = reg;
      else db.registers.push(reg);
      saveDb();
      modal.remove();
      renderRegisterMgmt(container);
    };

    // Field form (Add/Edit)
    function showFieldForm(field = {name:"", type:"text", required:false}, fidx=null) {
      // For field modal (inside showFieldForm)
      const fModal = document.createElement("div");
      fModal.className = "modal-overlay";
      fModal.innerHTML = `
        <div class="modal-content mx-auto" style="max-width:400px;">
          <h6>${fidx!==null ? "Edit Field" : "Add Field"}</h6>
          <form id="fieldForm">
            <div class="mb-2"><input class="form-control" id="fieldName" placeholder="Field Name" required value="${field.name||""}"></div>
            <div class="mb-2">
              <select class="form-select" id="fieldType" required>
                ${fieldTypes.map(t=>`<option value="${t.value}"${field.type===t.value?" selected":""}>${t.label}</option>`).join("")}
              </select>
            </div>
            <div class="mb-2 form-check">
              <input class="form-check-input" type="checkbox" id="fieldReq" ${field.required?"checked":""}>
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
        if(fidx!==null) reg.fields[fidx] = updated;
        else reg.fields.push(updated);
        document.body.removeChild(fModal);
        refreshFields();
      };
    }
    // Helper to render each field in list
    function renderFieldRow(f,i) {
      return `<li class="list-group-item d-flex justify-content-between align-items-center" style="font-size:95%">
        <div>
          <b>${f.name}</b> <span class="badge bg-secondary">${f.type}</span>
          ${f.required?'<span class="badge bg-danger ms-1">required</span>':''}
          ${f.choices?'<span class="text-muted ms-1">['+f.choices+']</span>':''}
        </div>
        <div>
          <button type="button" class="btn btn-sm btn-light moveUpBtn" data-fidx="${i}"><i class="bi bi-chevron-up"></i></button>
          <button type="button" class="btn btn-sm btn-light moveDownBtn" data-fidx="${i}"><i class="bi bi-chevron-down"></i></button>
          <button type="button" class="btn btn-sm btn-accent editFieldBtn" data-fidx="${i}"><i class="bi bi-pencil"></i></button>
          <button type="button" class="btn btn-sm btn-danger deleteFieldBtn" data-fidx="${i}"><i class="bi bi-trash"></i></button>
        </div>
      </li>`;
    }
  }

  // Assign users modal
  function showAssignUsersModal(reg, idx) {
    const modal = container.querySelector("#regModal");
    const allUsers = db.users || [];
    modal.innerHTML = `
      <div class="modal-content mx-auto" style="min-width:320px;max-width:99vw">
        <h5>Assign Users to ${reg.name}</h5>
        <form id="assignForm">
          <div class="mb-3">
            ${allUsers.length === 0 ? '<div class="alert alert-warning">No users found.</div>' : ''}
            <div class="form-check">
              ${allUsers.map((u, i) => `
                <input class="form-check-input" type="checkbox" id="user_${i}" value="${u.username}" ${reg.assignedUsers && reg.assignedUsers.includes(u.username) ? 'checked' : ''}>
                <label class="form-check-label" for="user_${i}">${u.username} (${u.role})</label><br>
              `).join('')}
            </div>
          </div>
          <div class="mb-2 d-flex justify-content-between">
            <button class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-secondary" id="cancelAssignBtn">Cancel</button>
          </div>
        </form>
      </div>
    `;
    modal.className = "active";
    modal.onclick = e => { if (e.target === modal) { modal.className = ""; modal.innerHTML = ""; } };
    document.getElementById("cancelAssignBtn").onclick = () => { modal.className = ""; modal.innerHTML = ""; };

    document.getElementById("assignForm").onsubmit = function(e) {
      e.preventDefault();
      reg.assignedUsers = Array.from(this.querySelectorAll("input[type=checkbox]:checked")).map(cb => cb.value);
      db.registers[idx] = reg;
      saveDb();
      modal.className = ""; modal.innerHTML = "";
      renderRegisterMgmt(container);
    };
  }

  // Updated handleExcelUpload to ensure uploaded registers are properly structured and displayed
  function handleExcelUpload(file, callback) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const registers = {};

      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header row

        const [registerName, fieldName, fieldType, required, choices, defaultValue, constraint, calculation] = row;

        if (!registerName || !fieldName || !fieldType) return;

        if (!registers[registerName]) {
          registers[registerName] = { name: registerName, fields: [] };
        }

        registers[registerName].fields.push({
          name: fieldName,
          type: fieldType,
          required: required === '1',
          choices,
          default: defaultValue,
          constraint,
          calc: calculation
        });
      });

      callback(Object.values(registers));
    };
    reader.readAsArrayBuffer(file);
  }
}
