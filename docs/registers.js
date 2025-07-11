import { db, saveDb } from './db.js';
import { showModal } from './helpers.js';

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
    </div>
  `;

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
    let fields = [];
    formContainer.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5>Create New Register</h5>
          <form id="regForm" autocomplete="off">
            <div class="mb-2">
              <input class="form-control" id="regName" placeholder="Register Name (e.g. ANC, OPD)" required>
            </div>
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

    function renderFieldList() {
      const fieldList = formContainer.querySelector("#fieldList");
      fieldList.innerHTML = fields.map((f,i) => `
        <li class="list-group-item d-flex justify-content-between align-items-center" style="font-size:95%">
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
        </li>
      `).join("");

      fieldList.querySelectorAll(".editFieldBtn").forEach(btn => btn.onclick = () => showFieldForm(fields[btn.dataset.fidx], btn.dataset.fidx));
      fieldList.querySelectorAll(".deleteFieldBtn").forEach(btn => btn.onclick = () => {
        if (confirm("Delete this field?")) {
          fields.splice(btn.dataset.fidx,1); renderFieldList();
        }
      });
      fieldList.querySelectorAll(".moveUpBtn").forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.fidx;
        if (i > 0) {
          [fields[i-1], fields[i]] = [fields[i], fields[i-1]];
          renderFieldList();
        }
      });
      fieldList.querySelectorAll(".moveDownBtn").forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.fidx;
        if (i < fields.length-1) {
          [fields[i], fields[i+1]] = [fields[i+1], fields[i]];
          renderFieldList();
        }
      });
    }

    formContainer.querySelector("#addFieldBtn").onclick = () => showFieldFormInline();

    function showFieldFormInline(field = {name:"", type:"text", required:false}, fidx=null) {
      const regForm = formContainer.querySelector("#regForm");
      let fieldFormRow = formContainer.querySelector("#inlineFieldFormRow");
      if (fieldFormRow) fieldFormRow.remove();
      const fieldForm = document.createElement("div");
      fieldForm.id = "inlineFieldFormRow";
      fieldForm.innerHTML = `
        <div class="card card-body mb-2">
          <form id="fieldForm">
            <div class="row g-2 align-items-center">
              <div class="col-md-4"><input class="form-control" id="fieldName" placeholder="Field Name" required value="${field.name||''}"></div>
              <div class="col-md-3">
                <select class="form-select" id="fieldType" required>
                  ${fieldTypes.map(t=>`<option value="${t.value}"${field.type===t.value?' selected':''}>${t.label}</option>`).join("")}
                </select>
              </div>
              <div class="col-md-2 form-check">
                <input class="form-check-input" type="checkbox" id="fieldReq" ${field.required?'checked':''}>
                <label class="form-check-label" for="fieldReq">Required</label>
              </div>
              <div class="col-md-3"><input class="form-control" id="fieldDefault" placeholder="Default Value" value="${field.default||''}"></div>
            </div>
            <div class="row g-2 mt-2">
              <div class="col-md-6"><input class="form-control" id="fieldConstraint" placeholder="Constraint/Validation (e.g. min=0,max=100)" value="${field.constraint||''}"></div>
              <div class="col-md-6" id="choicesRow" style="display:${['select_one','select_multiple'].includes(field.type)?'block':'none'}">
                <input class="form-control" id="fieldChoices" placeholder="Choices (comma-separated, e.g. Yes,No,Unknown)" value="${field.choices||''}" ${['select_one','select_multiple'].includes(field.type)?'required':''}>
              </div>
              <div class="col-md-6" id="calcRow" style="display:${field.type==='calculate'?'block':'none'}">
                <input class="form-control" id="fieldCalc" placeholder="Calculation Formula (e.g. today() - dob)" value="${field.calc||''}">
              </div>
            </div>
            <div class="mt-2 d-flex justify-content-end gap-2">
              <button class="btn btn-primary">${fidx!==null?"Save Field":"Add Field"}</button>
              <button type="button" class="btn btn-secondary" id="cancelFieldBtn">Cancel</button>
            </div>
          </form>
        </div>
      `;
      regForm.insertBefore(fieldForm, regForm.querySelector(".mb-3"));

      const fieldTypeSelect = fieldForm.querySelector("#fieldType");
      fieldTypeSelect.onchange = function() {
        const showChoices = ['select_one','select_multiple'].includes(this.value);
        fieldForm.querySelector("#choicesRow").style.display = showChoices ? 'block' : 'none';
        fieldForm.querySelector("#fieldChoices").required = showChoices;
        fieldForm.querySelector("#calcRow").style.display = this.value==='calculate'?'block':'none';
      };

      fieldForm.querySelector("#cancelFieldBtn").onclick = () => fieldForm.remove();

      fieldForm.querySelector("#fieldForm").onsubmit = function(e) {
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
        if(fidx!==null) fields[fidx] = updated;
        else fields.push(updated);
        fieldForm.remove();
        renderFieldList();
      };
    }

    renderFieldList();

    formContainer.querySelector("#cancelBtn").onclick = () => {
      formContainer.style.display = "none";
      formContainer.innerHTML = "";
    };

    formContainer.querySelector("#regForm").onsubmit = function(e) {
      e.preventDefault();
      const reg = {
        name: this.regName.value,
        id: `REG${Date.now().toString().slice(-6)}`,
        fields: fields,
        assignedUsers: []
      };
      db.registers.push(reg);
      saveDb();
      formContainer.style.display = "none";
      formContainer.innerHTML = "";
      renderRegisterMgmt(container);
    };
  };

  container.querySelectorAll(".assignBtn").forEach(btn =>
    btn.onclick = () => showAssignUsersModal(db.registers[btn.dataset.idx], btn.dataset.idx)
  );

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

  function showRegForm(reg = { name: "", fields: [], assignedUsers: [] }, idx = null) {
    const content = `
      <div style="max-width:500px;">
        <h5>${idx!==null ? "Edit Register" : "New Register"}</h5>
        <form id="regForm" autocomplete="off">
          <div class="mb-2"><input class="form-control" id="regName" placeholder="Register Name (e.g. ANC, OPD)" required value="${reg.name||''}"></div>
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center">
              <b>Fields</b>
              <button type="button" class="btn btn-sm btn-success" id="addFieldBtn"><i class="bi bi-plus"></i> Add Field</button>
            </div>
            <ul class="list-group mt-2" id="fieldList">${(reg.fields || []).map((f,i) => renderFieldRow(f,i)).join("")}</ul>
          </div>
          <div class="mb-2 d-flex justify-content-between">
            <button class="btn btn-primary">${idx!==null ? "Save" : "Create"}</button>
            <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
          </div>
        </form>
      </div>
    `;

    const closeModal = showModal(content);

    document.getElementById("cancelBtn").onclick = () => closeModal();

    document.getElementById("addFieldBtn").onclick = () => showFieldForm();

    function refreshFields() {
      document.getElementById("fieldList").innerHTML = (reg.fields||[]).map((f,i) => renderFieldRow(f,i)).join("");

      document.querySelectorAll(".editFieldBtn").forEach(btn => btn.onclick = () => showFieldForm(reg.fields[btn.dataset.fidx], btn.dataset.fidx));
      document.querySelectorAll(".deleteFieldBtn").forEach(btn => btn.onclick = () => {
        if (confirm("Delete this field? Data already captured for this field will be kept in old records.")) {
          reg.fields.splice(btn.dataset.fidx,1); refreshFields();
        }
      });
      document.querySelectorAll(".moveUpBtn").forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.fidx;
        if (i > 0) {
          [reg.fields[i-1], reg.fields[i]] = [reg.fields[i], reg.fields[i-1]];
          refreshFields();
        }
      });
      document.querySelectorAll(".moveDownBtn").forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.fidx;
        if (i < reg.fields.length-1) {
          [reg.fields[i], reg.fields[i+1]] = [reg.fields[i+1], reg.fields[i]];
          refreshFields();
        }
      });
    }

    refreshFields();

    document.getElementById("regForm").onsubmit = function(e) {
      e.preventDefault();
      reg.name = this.regName.value;
      if (!reg.assignedUsers) reg.assignedUsers = [];
      if (idx!==null) db.registers[idx] = reg;
      else db.registers.push(reg);
      saveDb();
      closeModal();
      renderRegisterMgmt(container);
    };

    function showFieldForm(field = {name:"", type:"text", required:false}, fidx=null) {
      const fieldContent = `
        <div style="max-width:400px;">
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

      const closeFieldModal = showModal(fieldContent);

      document.getElementById("cancelFieldBtn").onclick = () => closeFieldModal();

      document.getElementById("fieldType").onchange = function() {
        const showChoices = ['select_one','select_multiple'].includes(this.value);
        document.getElementById("choicesRow").style.display = showChoices ? 'block' : 'none';
        document.getElementById("fieldChoices").required = showChoices;
        document.getElementById("calcRow").style.display = this.value==='calculate'?'block':'none';
      };

      document.getElementById("fieldForm").onsubmit = function(e) {
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
        closeFieldModal();
        refreshFields();
      };
    }

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

  function showAssignUsersModal(reg, idx) {
    const allUsers = db.users || [];
    const content = `
      <div class="assign-users-modal">
        <h5>Assign Users to ${reg.name}</h5>
        <form id="assignForm">
          <div class="mb-3">
            ${allUsers.length === 0 ? '<div class="alert alert-warning">No users found.</div>' : ''}
            <div class="form-check-container">
              ${allUsers.map((u, i) => `
                <div class="form-check mb-2">
                  <input class="form-check-input" type="checkbox" id="user_${i}" value="${u.username}" ${reg.assignedUsers && reg.assignedUsers.includes(u.username) ? 'checked' : ''}>
                  <label class="form-check-label" for="user_${i}">${u.username} (${u.role})</label>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="mb-2 d-flex gap-2 justify-content-between">
            <button class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-secondary" id="cancelAssignBtn">Cancel</button>
          </div>
        </form>
      </div>
    `;

    const closeModal = showModal(content);

    document.getElementById("cancelAssignBtn").onclick = () => closeModal();

    document.getElementById("assignForm").onsubmit = function(e) {
      e.preventDefault();
      reg.assignedUsers = Array.from(this.querySelectorAll("input[type=checkbox]:checked")).map(cb => cb.value);
      db.registers[idx] = reg;
      saveDb();
      closeModal();
      renderRegisterMgmt(container);
    };
  }

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
