import { db, saveDb } from './db.js';

export function renderAppointmentForm(patient) {
  const container = document.getElementById('app');
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="container py-3">
      <h4><i class="bi bi-calendar-plus"></i> Schedule Appointment for ${patient.name}</h4>
      <form id="appointmentForm" class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Service</label>
          <select class="form-select" id="appointmentService" required>
            <option value="">Select service</option>
            ${(db.registers || []).map(r => `<option value="${r.name}">${r.name}</option>`).join("")}
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">Appointment Date</label>
          <input type="date" class="form-control" id="appointmentDate" min="${today}" required>
        </div>
        <div class="col-md-12">
          <label class="form-label">Notes (optional)</label>
          <textarea class="form-control" id="appointmentNotes" rows="2"></textarea>
        </div>
        <div class="col-md-12">
          <button class="btn btn-primary" type="submit"><i class="bi bi-check2-circle"></i> Save Appointment</button>
          <a href="#appointments" class="btn btn-secondary ms-2" id="viewAppointmentsBtn">Cancel</a>
        </div>
        <div id="appointmentMsg" class="mt-3"></div>
      </form>
    </div>
  `;

  document.getElementById('appointmentForm').onsubmit = function (e) {
    e.preventDefault();
    const service = document.getElementById('appointmentService').value;
    const date = document.getElementById('appointmentDate').value;
    const notes = document.getElementById('appointmentNotes').value;

    if (!service || !date) {
      document.getElementById('appointmentMsg').innerHTML = `<div class="alert alert-danger">Service and date are required.</div>`;
      return;
    }

    db.appointments = db.appointments || [];
    db.appointments.push({
      patientID: patient.patientID,
      patientName: patient.name,
      serviceType: service,
      appointmentDate: date,
      notes,
      status: "Scheduled",
      createdBy: db.currentUser?.username || "",
      timestamp: Date.now()
    });

    saveDb();
    document.getElementById('appointmentMsg').innerHTML = `<div class="alert alert-success">Appointment saved successfully.</div>`;
    setTimeout(() => {

      renderAppointmentList(container);
      window.location.hash = '#appointments';
    }, 1200);
  };

  document.getElementById('viewAppointmentsBtn').onclick = function(e) {
    e.preventDefault();
    renderAppointmentList(container);
    window.location.hash = '#appointments';
  };
}

export function renderAppointmentList(container) {
  container.innerHTML = `
    <div class="container py-3">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4><i class="bi bi-calendar-event"></i> Appointments</h4>
        <form id="searchAppointments" class="d-flex gap-2">
          <input class="form-control" type="text" id="searchTerm" placeholder="Search by Patient ID or Name" autocomplete="off">
          <button class="btn btn-outline-primary" type="submit"><i class="bi bi-search"></i></button>
        </form>
      </div>
      <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle">
          <thead class="table-light">
            <tr>
              <th>Patient ID</th>
              <th>Name</th>
              <th>Service</th>
              <th>Date<br><span class="small">(Color: Days Left)</span></th>
              <th>Notes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="appointmentsBody"></tbody>
        </table>
      </div>
      <a href="#patients" class="btn btn-link mt-2"><i class="bi bi-arrow-left"></i> Back to Patients</a>
    </div>
  `;

  function renderRows(filter = "") {
    let rows = db.appointments || [];
    if (filter) {
      const term = filter.trim().toLowerCase();
      rows = rows.filter(a =>
        (a.patientID && a.patientID.toLowerCase().includes(term)) ||
        (a.patientName && a.patientName.toLowerCase().includes(term))
      );
    }

    rows = rows.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

    document.getElementById("appointmentsBody").innerHTML = rows.length
      ? rows.map((a, i) => {

          const aptDate = new Date(a.appointmentDate);
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
          return `
        <tr>
          <td>${a.patientID}</td>
          <td>${a.patientName}</td>
          <td>${a.serviceType}</td>
          <td><span class="badge bg-${indicatorColor}">${indicatorText}</span><br><span class="small text-muted">${a.appointmentDate}</span></td>
          <td>${a.notes || ""}</td>
          <td>
            <span class="badge ${a.status === "Completed" ? "bg-success" : "bg-warning text-dark"}">${a.status}</span>
          </td>
          <td>
            ${a.status !== "Completed" ? `<button class="btn btn-sm btn-success" data-i="${i}" data-act="complete"><i class="bi bi-check2"></i> Mark Completed</button>` : ""}
            <button class="btn btn-sm btn-danger" data-i="${i}" data-act="delete"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
          `;
        }).join("")
      : `<tr><td colspan="7" class="text-center text-muted">No appointments found.</td></tr>`;

    document.querySelectorAll("[data-act=complete]").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute("data-i"));

        const filteredRows = (db.appointments || [])
          .sort((a, b) => b.timestamp - a.timestamp)
          .filter(a =>
            (!filter || (a.patientID && a.patientID.toLowerCase().includes(filter.trim().toLowerCase())) ||
            (a.patientName && a.patientName.toLowerCase().includes(filter.trim().toLowerCase())))
          )
          .slice(0, 20);
        const appointment = filteredRows[idx];
        if (appointment) {
          appointment.status = "Completed";
          saveDb();
          renderRows(filter);
        }
      };
    });
    document.querySelectorAll("[data-act=delete]").forEach(btn => {
      btn.onclick = () => {
        if (confirm("Delete this appointment?")) {
          const idx = parseInt(btn.getAttribute("data-i"));
          const filteredRows = (db.appointments || [])
            .sort((a, b) => b.timestamp - a.timestamp)
            .filter(a =>
              (!filter || (a.patientID && a.patientID.toLowerCase().includes(filter.trim().toLowerCase())) ||
              (a.patientName && a.patientName.toLowerCase().includes(filter.trim().toLowerCase())))
            )
            .slice(0, 20);
          const appointment = filteredRows[idx];
          if (appointment) {
            db.appointments = db.appointments.filter(a => a !== appointment);
            saveDb();
            renderRows(filter);
          }
        }
      };
    });
  }

  renderRows();

  document.getElementById("searchAppointments").onsubmit = function (e) {
    e.preventDefault();
    const term = document.getElementById("searchTerm").value;
    renderRows(term);
  };
}
