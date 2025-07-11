import { db, saveDb } from './db.js';



if (!db.serviceEntries) db.serviceEntries = {};

export function renderServiceVisitSelector(container) {

  const allRegs = db.registers || [];

  container.innerHTML = `
    <div class="container my-4">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h4><i class="bi bi-clipboard-plus"></i> Service Data Capture</h4>
      </div>
      <form id="visitSelectForm" class="row g-2 mb-3">
        <div class="col-md-3">
          <input type="text" class="form-control" id="patientSearch" placeholder="Patient ID or Name" required>
        </div>
        <div class="col-md-3">
          <select class="form-select" id="serviceType" required>
            <option value="">Select Register/Service</option>
            ${allRegs.map(r=>`<option>${r.name}</option>`).join("")}
          </select>
        </div>
        <div class="col-md-3">
          <input type="date" class="form-control" id="visitDate" value="${new Date().toISOString().slice(0,10)}" required>
        </div>
        <div class="col-md-3">
          <button class="btn btn-primary w-100"><i class="bi bi-check2"></i> Start Entry</button>
        </div>
      </form>
      <div id="foundPatient"></div>
      <div id="svcMsg"></div>
      <a href="#admin-dashboard" class="btn btn-link mt-2"><i class="bi bi-arrow-left"></i> Back</a>
    </div>
  `;

  let foundPat = null;
  const searchBox = container.querySelector("#patientSearch");
  searchBox.oninput = function() {
    const term = this.value.trim().toLowerCase();
    foundPat = db.patients.find(p =>
      p.patientID?.toLowerCase() === term ||
      p.name?.toLowerCase() === term
    );
    const info = container.querySelector("#foundPatient");
    if (foundPat) {
      info.innerHTML = `<div class="alert alert-success">Found: <b>${foundPat.name}</b> [${foundPat.patientID}]</div>`;
    } else if (term.length > 2) {
      info.innerHTML = `<div class="alert alert-warning">No patient found. <button class="btn btn-sm btn-outline-primary" id="addPatBtn"><i class="bi bi-person-plus"></i> Register New Patient</button></div>`;
      container.querySelector("#addPatBtn").onclick = () => {
        alert('Patient registration modal is not available. Please add the patient manually from the Patients section.');
      };
    } else {
      info.innerHTML = "";
    }
  };

  container.querySelector("#visitSelectForm").onsubmit = function(e) {
    e.preventDefault();
    if (!foundPat) {
      container.querySelector("#svcMsg").innerHTML = `<div class="alert alert-danger">Select or register a patient first.</div>`;
      return;
    }
    const visit = {
      patientID: foundPat.patientID,
      patientName: foundPat.name,
      dob: foundPat.dob,
      age: foundPat.age,
      visitDate: this.visitDate.value,
      serviceType: this.serviceType.value,
      timestamp: Date.now()
    };
    renderServiceEntry(container, visit);
  };

  function showPatientForm(prefillName = "") {
    const modal = document.createElement("div");
    modal.className = "active";
    modal.style.position = "fixed";
    modal.style.left = modal.style.top = "0";
    modal.style.width = modal.style.height = "100%";
    modal.style.background = "rgba(0,0,0,0.12)";
    modal.innerHTML = `
      <div class="modal-content mx-auto" style="min-width:320px;max-width:99vw">
        <h5>Register New Patient</h5>
        <form id="patForm">
          <input class="form-control mb-2" id="name" placeholder="Full Name" required value="${prefillName||''}">
          <input class="form-control mb-2" id="dob" type="date" placeholder="Date of Birth">
          <select id="sex" class="form-select mb-2" required>
            <option value="">Sex</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
          <input class="form-control mb-2" id="phone" placeholder="Phone">
          <input class="form-control mb-2" id="address" placeholder="Address">
          <button class="btn btn-primary">Register</button>
          <button type="button" class="btn btn-secondary" id="cancelPatBtn">Cancel</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#cancelPatBtn").onclick = () => document.body.removeChild(modal);
    modal.querySelector("#patForm").onsubmit = function(e) {
      e.preventDefault();
      const patient = {
        patientID: generatePatientID(),
        name: this.name.value.trim(),
        dob: this.dob.value,
        age: this.dob.value ? calculateAge(this.dob.value) : "",
        sex: this.sex.value,
        phone: this.phone.value,
        address: this.address.value
      };
      db.patients.push(patient);
      saveDb();
      foundPat = patient;
      document.body.removeChild(modal);
      searchBox.value = patient.patientID;
      searchBox.dispatchEvent(new Event("input"));
    };
  }
}

function generatePatientID() {
  return "P" + (Date.now() % 1000000);
}
function calculateAge(dob) {
  if (!dob) return "";
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function renderServiceEntry(container, visit = null) {
  if (!visit) return renderServiceVisitSelector(container);

  const reg = db.registers.find(r => r.name === visit.serviceType);
  if (!reg) {
    container.innerHTML = `<div class="alert alert-danger">Register not found!</div>`;
    return;
  }

  const entries = db.serviceEntries[reg.name] || [];
  let prev = entries.find(e => e.patientID === visit.patientID && e.visitID === visit.timestamp);

  container.innerHTML = `
    <div class="container my-4">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h4><i class="bi bi-clipboard-plus"></i> ${reg.name} Data Entry</h4>
      </div>
      <div class="card shadow">
        <div class="card-body">
          <div class="mb-3 small text-muted">
            <b>Facility:</b> ${db.facility.name} &mdash; <b>Patient:</b> ${visit.patientName} (${visit.patientID}) &mdash; <b>Date:</b> ${visit.visitDate}
          </div>
          <form id="serviceForm" autocomplete="off"></form>
        </div>
      </div>
      <a href="#service-entry" class="btn btn-link mt-2"><i class="bi bi-arrow-left"></i> Back to Service Selection</a>
      <div id="serviceMsg"></div>
      <div id="lineList"></div>
    </div>
  `;

  const form = container.querySelector("#serviceForm");
  form.innerHTML = reg.fields.map((f, i) =>
    renderFieldInput(f, prev?.formData?.[f.name], visit)
  ).join("") +
    `<div class="mt-3"><button class="btn btn-primary"><i class="bi bi-save"></i> Save Record</button></div>`;

  reg.fields.forEach(f => {
    if (["date", "datetime"].includes(f.type)) {
      form.querySelector(`#f_${f.name}`).max = new Date().toISOString().slice(0,10);
    }
    if (f.type === "image") {
      form.querySelector(`#f_${f.name}`).onchange = function(e) {
        if (this.files && this.files[0]) {
          const url = URL.createObjectURL(this.files[0]);
          let prev = form.querySelector(`#prev_${f.name}`);
          if (!prev) {
            prev = document.createElement("img");
            prev.id = `prev_${f.name}`;
            prev.style.maxWidth = "70px";
            prev.style.marginTop = "5px";
            this.parentNode.appendChild(prev);
          }
          prev.src = url;
        }
      };
    }
    if (f.type === "file") {
      form.querySelector(`#f_${f.name}`).onchange = function(e) {
        let span = form.querySelector(`#prev_${f.name}`);
        if (!span) {
          span = document.createElement("span");
          span.id = `prev_${f.name}`;
          span.style.marginLeft = "5px";
          this.parentNode.appendChild(span);
        }
        span.textContent = this.files[0]?.name || "";
      };
    }
  });

  form.onsubmit = function(e) {
    e.preventDefault();
    const formData = {};
    let valid = true;
    for (const f of reg.fields) {
      let val = form[`f_${f.name}`];
      if (!val) continue;
      if (["image","file"].includes(f.type)) {
        formData[f.name] = val.files && val.files[0] ? val.files[0].name : "";
      } else if (["select_multiple"].includes(f.type)) {
        formData[f.name] = Array.from(val.selectedOptions).map(opt=>opt.value).join(", ");
      } else if (["geo"].includes(f.type)) {
        formData[f.name] = val.value;
      } else {
        formData[f.name] = val.value;
      }

      if (f.required && !formData[f.name]) {
        valid = false;
        val.classList.add("is-invalid");
      } else {
        val.classList.remove("is-invalid");
      }

      if (["date","datetime"].includes(f.type) && formData[f.name]) {
        if (formData[f.name] > new Date().toISOString().slice(0,10)) {
          valid = false;
          val.classList.add("is-invalid");
        }
      }

      if (f.constraint && formData[f.name]) {
        f.constraint.split(",").forEach(c=>{
          let [k,v]=c.split("=");
          if (k==="min" && parseFloat(formData[f.name]) < parseFloat(v)) valid=false;
          if (k==="max" && parseFloat(formData[f.name]) > parseFloat(v)) valid=false;
          if (k==="regex" && !(new RegExp(v)).test(formData[f.name])) valid=false;
        });
      }

      if (f.type === "calculate" && f.calc) {
        let formula = f.calc;
        Object.keys(formData).forEach(k => {
          formula = formula.replaceAll(k, formData[k]);
        });
        try { formData[f.name] = eval(formula); } catch {}
      }
    }
    if (!valid) {
      container.querySelector("#serviceMsg").innerHTML = `<div class="alert alert-danger mt-2">Please fill all required/valid fields correctly.</div>`;
      return;
    }

    if (!db.serviceEntries[reg.name]) db.serviceEntries[reg.name] = [];
    const existing = db.serviceEntries[reg.name].find(e => e.patientID === visit.patientID && e.visitID === visit.timestamp);
    const entry = {
      patientID: visit.patientID,
      patientName: visit.patientName,
      visitID: visit.timestamp,
      visitDate: visit.visitDate,
      serviceType: reg.name,
      facility: db.facility.name,
      user: db.currentUser?.username || "",
      age: visit.age,
      formData,
      savedAt: Date.now()
    };
    if (existing) Object.assign(existing, entry);
    else db.serviceEntries[reg.name].push(entry);
    saveDb();
    container.querySelector("#serviceMsg").innerHTML = `<div class="alert alert-success mt-2">Service record saved!</div>`;
    form.reset();
    renderLineList(container, reg.name);
  };

  renderLineList(container, reg.name);
}

function renderLineList(container, regName) {
  const entries = db.serviceEntries[regName] || [];
  if (!entries.length) {
    container.querySelector("#lineList").innerHTML = `<div class="alert alert-info mt-3">No records yet for this register.</div>`;
    return;
  }

  const reg = db.registers.find(r => r.name === regName);
  const fields = reg ? reg.fields.map(f=>f.name) : [];
  container.querySelector("#lineList").innerHTML = `
    <div class="table-responsive mt-4">
      <table class="table table-bordered table-sm">
        <thead>
          <tr>
            <th>Date</th>
            <th>Patient</th>
            <th>User</th>
            ${fields.map(f=>`<th>${f}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${entries.slice(-20).reverse().map(e=>`
            <tr>
              <td>${e.visitDate||""}</td>
              <td>${e.patientName||""} (${e.patientID||""})</td>
              <td>${e.user||""}</td>
              ${fields.map(f=>`<td>${e.formData?.[f]||""}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="small text-muted">Showing last 20 records</div>
    </div>
  `;
}

function renderFieldInput(f, value="", visit) {
  const today = new Date().toISOString().slice(0,10);
  let v = value || f.default || "";
  if (f.name.toLowerCase().includes("age") && visit && visit.dob) {
    v = visit.age || "";
  }
  switch (f.type) {
    case "text":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <input type="text" class="form-control" id="f_${f.name}" value="${v}"></div>`;
    case "number":
    case "integer":
    case "decimal":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <input type="number" class="form-control" id="f_${f.name}" value="${v}" ${f.type==="integer"?'step="1"':''}></div>`;
    case "date":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <input type="date" class="form-control" id="f_${f.name}" value="${v}" max="${today}"></div>`;
    case "time":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <input type="time" class="form-control" id="f_${f.name}" value="${v}"></div>`;
    case "datetime":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <input type="datetime-local" class="form-control" id="f_${f.name}" value="${v}" max="${today}"></div>`;
    case "select_one":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <select class="form-select" id="f_${f.name}">${(f.choices||"").split(",").map(c=>
          `<option value="${c.trim()}"${v===c.trim()?" selected":""}>${c.trim()}</option>`
        ).join("")}</select></div>`;
    case "select_multiple":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <select class="form-select" id="f_${f.name}" multiple>${(f.choices||"").split(",").map(c=>
          `<option value="${c.trim()}"${(v||"").split(", ").includes(c.trim())?" selected":""}>${c.trim()}</option>`
        ).join("")}</select></div>`;
    case "image":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <input type="file" class="form-control" accept="image/*" id="f_${f.name}"></div>`;
    case "file":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <input type="file" class="form-control" id="f_${f.name}"></div>`;
    case "note":
      return `<div class="mb-2"><label>${f.name}</label>
        <textarea class="form-control" id="f_${f.name}" rows="2" readonly>${v}</textarea></div>`;
    case "qr":
    case "barcode":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <input type="text" class="form-control" id="f_${f.name}" value="${v}" placeholder="Scan/Enter code"></div>`;
    case "geo":
      return `<div class="mb-2"><label>${f.name}${f.required?" *":""}</label>
        <input type="text" class="form-control" id="f_${f.name}" value="${v}" placeholder="Latitude,Longitude">
        <button type="button" class="btn btn-outline-secondary btn-sm mt-1" onclick="navigator.geolocation.getCurrentPosition(pos=>{document.getElementById('f_${f.name}').value=pos.coords.latitude+','+pos.coords.longitude})">
          <i class="bi bi-geo"></i> Get Location
        </button>
      </div>`;
    case "calculate":
      return `<div class="mb-2"><label>${f.name}</label>
        <input type="text" class="form-control" id="f_${f.name}" value="${v}" readonly></div>`;
    default:
      return `<div class="mb-2"><label>${f.name}</label>
        <input type="text" class="form-control" id="f_${f.name}" value="${v}"></div>`;
  }
}

export function renderServiceEntryForm(patient, serviceTypes = []) {
  const container = document.getElementById("app");
  container.innerHTML = `
    <div class="container py-3">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4><i class="bi bi-clipboard-plus"></i> Select Service for ${patient.surname || ''} ${patient.otherNames || ''}</h4>
        <button class="btn btn-outline-secondary" id="backToPatients">
          <i class="bi bi-arrow-left"></i> Back to Patients
        </button>
      </div>
      <form id="inlineServiceSelector" class="row g-2 mb-3">
        <div class="col-md-4">
          <select class="form-select" id="serviceType" required>
            <option value="">Select Register/Service</option>
            ${db.registers
              .map(r => `<option value="${r.name}">${r.name}</option>`)
              .join("")}
          </select>
        </div>
        <div class="col-md-3">
          <input type="date" class="form-control" id="visitDate" value="${new Date().toISOString().slice(0,10)}" max="${new Date().toISOString().slice(0,10)}" required>
        </div>
        <div class="col-md-3">
          <button class="btn btn-primary w-100"><i class="bi bi-check2"></i> Start Entry</button>
        </div>
      </form>
      <div id="serviceMsg"></div>
    </div>
  `;

  container.querySelector("#backToPatients").onclick = () => {
    window.location.hash = "#patient-reg";
  };

  container.querySelector("#inlineServiceSelector").onsubmit = function(e) {
    e.preventDefault();
    const svc = this.serviceType.value;
    const visitDate = this.visitDate.value;
    if (!svc || !visitDate) {
      container.querySelector("#serviceMsg").innerHTML = `<div class="alert alert-danger">Please select a service and date.</div>`;
      return;
    }
    const visit = {
      patientID: patient.patientID,
      patientName: patient.name,
      dob: patient.dob,
      age: patient.age,
      visitDate,
      serviceType: svc,
      timestamp: Date.now()
    };
    renderServiceEntry(container, visit);
  };
}