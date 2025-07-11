import { db } from './db.js';

function loadChartJs(cb) {
  if (window.Chart) return cb();
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/chart.js";
  script.onload = cb;
  document.head.appendChild(script);
}

export function renderReports(container) {
  container.innerHTML = `
    <div class="container my-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4><i class="bi bi-bar-chart"></i> Reports</h4>
      </div>
      <div class="row g-3">
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <i class="bi bi-people fs-1 text-primary"></i>
              <h6>Total Patients</h6>
              <p class="fs-5" id="patientCount">${db.patients.length}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <i class="bi bi-calendar-check fs-1 text-success"></i>
              <h6>Total Visits</h6>
              <p class="fs-5" id="visitCount">${db.visits.length}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <i class="bi bi-clock-history fs-1 text-danger"></i>
              <h6>Total Appointments</h6>
              <p class="fs-5" id="appointmentCount">${db.appointments.length}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <i class="bi bi-person-lines-fill fs-1 text-info"></i>
              <h6>Total Users</h6>
              <p class="fs-5" id="userCount">${db.users.length}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3 mt-3">
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-body">
              <h6>Patients by Sex</h6>
              <canvas id="sexPie" height="200"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-body">
              <h6>Visits Trend</h6>
              <canvas id="visitTrend" height="200"></canvas>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3 mt-3">
        <div class="col-md-12">
          <div class="card shadow-sm">
            <div class="card-body">
              <h6>Services Offered per Register</h6>
              <canvas id="servicesPerRegister" height="200"></canvas>
            </div>
          </div>
        </div>
      </div>
      <a href="#admin-dashboard" class="btn btn-link mt-3"><i class="bi bi-arrow-left"></i> Back</a>
    </div>
  `;

const serviceCountByRegister = db.registers.map(r => ({
  register: r.name,
  services: db.visits.filter(v => v.registerId === r.id).reduce((acc, v) => acc + (v.serviceType?.length || 0), 0)
}));

const appointmentStatusCounts = db.appointments.reduce((acc, a) => {
  acc[a.status] = (acc[a.status] || 0) + 1;
  return acc;
}, {});

console.log('Services per Register:', serviceCountByRegister);
console.log('Appointments by Status:', appointmentStatusCounts);

loadChartJs(() => {
  const sexCounts = [
    db.patients.filter(p => p.sex === "M").length,
    db.patients.filter(p => p.sex === "F").length,
    db.patients.filter(p => p.sex === "O").length
  ];
  new Chart(document.getElementById('sexPie'), {
    type: 'pie',
    data: {
      labels: ['Male', 'Female', 'Other'],
      datasets: [{ data: sexCounts, backgroundColor: ['#0d6efd', '#e83e8c', '#6c757d'] }]
    },
    options: { responsive: true }
  });

  const regLabels = db.registers.map(r => r.name);
  const regCounts = db.registers.map(r => db.visits.filter(v => v.registerId === r.id).length);
  new Chart(document.getElementById('servicesPerRegister'), {
    type: 'bar',
    data: {
      labels: regLabels,
      datasets: [{ label: 'Services Offered', data: regCounts, backgroundColor: '#0dcaf0' }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const trend = months.map(m => db.visits.filter(v => (v.visitDate || '').slice(0, 7) === m).length);
  new Chart(document.getElementById('visitTrend'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{ label: 'Visits', data: trend, borderColor: '#198754', backgroundColor: 'rgba(25,135,84,0.2)', fill: true }]
    },
    options: { responsive: true }
  });
});
}