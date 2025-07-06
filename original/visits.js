import { db, saveDb } from './db.js';

// For admin: always show all available services/registers
function getServicesList() {
  return (db.registers || []).map(r => r.name);
}

export function renderVisitLog(container) {
  const visits = db.visits || [];
  container.innerHTML = `
    <div class="container my-4">
      <div class="d-flex align-items-center justify-content-between">
        <h4><i class="bi bi-journal-text"></i> Visits Logged</h4>
      </div>
      <div class="card shadow-sm mt-4">
        <div class="card-body p-2">
          <table class="table table-bordered table-sm mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Service(s)</th>
                <th>Provider</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${visits.length ? visits.map(v => `
                <tr>
                  <td>${v.visitDate || ''}</td>
                  <td>${v.patientID || ''}</td>
                  <td>${Array.isArray(v.serviceType) ? v.serviceType.join(', ') : (v.serviceType || '')}</td>
                  <td>${v.loggedBy || ''}</td>
                  <td>${v.notes || ''}</td>
                </tr>
              `).join('') : `<tr><td colspan="5" class="text-center text-muted">No visits logged yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <a href="#admin-dashboard" class="btn btn-link mt-2"><i class="bi bi-arrow-left"></i> Back</a>
    </div>
  `;
}

export function createVisitForm(patient, onSuccess) {
  const wrapper = document.createElement("div");
  wrapper.className = "visit-form my-3";

  const servicesList = getServicesList();
  wrapper.innerHTML = `
    <form class="row g-2">
      <div class="col-md-4">
        <select class="form-select" multiple required size="4">
          ${servicesList.length ? servicesList.map(s => `<option value="${s}">${s}</option>`).join('') : `<option disabled>No services available</option>`}
        </select>
      </div>
      <div class="col-md-3">
        <input type="date" class="form-control" max="${new Date().toISOString().slice(0,10)}" value="${new Date().toISOString().slice(0,10)}">
      </div>
      <div class="col-md-2">
        <button class="btn btn-success w-100" type="submit"><i class="bi bi-check2-circle"></i> Save</button>
      </div>
    </form>
    <div class="visit-msg mt-2"></div>
  `;

  const form = wrapper.querySelector("form");
  form.onsubmit = function(e) {
    e.preventDefault();
    const services = Array.from(form.querySelector("select").selectedOptions).map(opt => opt.value);
    const date = form.querySelector("input").value;
    if (!services.length) {
      wrapper.querySelector(".visit-msg").innerHTML = `<div class="alert alert-danger">Select a service</div>`;
      return;
    }
    const visit = {
      patientID: patient.patientID,
      visitDate: date,
      serviceType: services,
      facility: db.facility?.name || "",
      loggedBy: db.currentUser?.username || "",
      timestamp: Date.now()
    };
    db.visits.push(visit);
    saveDb();
    wrapper.querySelector(".visit-msg").innerHTML = `<div class="alert alert-success">Visit logged!</div>`;
    if (onSuccess) onSuccess();
  };

  return wrapper;
}
