import { db } from './db.js';

// Simple chart generator using Chart.js CDN
function loadChartJs(cb) {
  if (window.Chart) return cb();
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/chart.js";
  script.onload = cb;
  document.head.appendChild(script);
}

export function renderReports(container) {
  // Add year selector and tabs
  const currentYear = new Date().getFullYear();
  let selectedYear = currentYear;
  container.innerHTML = `
    <div class="container my-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4><i class="bi bi-bar-chart"></i> Reports</h4>
        <div class="d-flex align-items-center gap-2">
          <select id="yearSelect" class="form-select w-auto">
            ${Array.from({length: 6}, (_,i) => currentYear - i).map(y => `<option value="${y}"${y===currentYear?' selected':''}>${y}</option>`).join('')}
          </select>
          <select id="quarterSelect" class="form-select w-auto">
            <option value="">Quarter</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
          <select id="monthSelect" class="form-select w-auto">
            <option value="">Month</option>
            ${Array.from({length:12}, (_,i) => `<option value="${i+1}">${new Date(2000,i,1).toLocaleString('default',{month:'long'})}</option>`).join('')}
          </select>
          <select id="weekSelect" class="form-select w-auto">
            <option value="">Week</option>
          </select>
        </div>
      </div>
      <div id="reportContent"></div>
    </div>
  `;

  // Helper to get date range for each tab
  function getDateRange(type) {
    // Use selectedYear for all calculations
    let start, end;
    if (type === 'week') {
      // Default to first week of selected year
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 0, 7);
    } else if (type === 'month') {
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 11, 31);
    } else if (type === 'quarter') {
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 11, 31);
    } else if (type === 'year') {
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 11, 31);
    }
    end.setHours(23,59,59,999);
    return { start, end };
  }

  function filterByDate(arr, field, range) {
    return arr.filter(item => {
      const d = new Date(item[field]);
      return d >= range.start && d <= range.end;
    });
  }

  function renderPeriod(type) {
    // Calculate range based on selected filters
    let start = new Date(selectedYear, 0, 1), end = new Date(selectedYear, 11, 31);
    const q = document.getElementById('quarterSelect').value;
    const m = document.getElementById('monthSelect').value;
    const w = document.getElementById('weekSelect').value;
    if (q) {
      start = new Date(selectedYear, (q-1)*3, 1);
      end = new Date(selectedYear, (q-1)*3+2+1, 0);
    }
    if (m) {
      start = new Date(selectedYear, m-1, 1);
      end = new Date(selectedYear, m, 0);
    }
    if (m && w) {
      // Calculate week range for selected month
      const firstDay = new Date(selectedYear, m-1, 1);
      const weekNum = parseInt(w, 10);
      const weekStart = new Date(firstDay);
      weekStart.setDate(1 + (weekNum-1)*7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      if (weekStart.getMonth() === firstDay.getMonth()) start = weekStart;
      if (weekEnd.getMonth() === firstDay.getMonth()) end = weekEnd; else end = new Date(selectedYear, m, 0);
    }
    end.setHours(23,59,59,999);
    const range = {start, end};
    // Update week options when month changes
    const weekSel = document.getElementById('weekSelect');
    if (m) {
      const firstDay = new Date(selectedYear, m-1, 1);
      const lastDay = new Date(selectedYear, m, 0);
      const weekCount = Math.ceil((lastDay.getDate() + firstDay.getDay()) / 7);
      weekSel.innerHTML = '<option value="">Week</option>' + Array.from({length: weekCount}, (_,i) => `<option value="${i+1}">Week ${i+1}</option>`).join('');
    } else {
      weekSel.innerHTML = '<option value="">Week</option>';
    }
    const patients = filterByDate(db.patients, 'registrationDate', range);
    const visits = filterByDate(db.visits, 'visitDate', range);
    const appointments = filterByDate(db.appointments, 'appointmentDate', range);
    // Cards
    document.getElementById('reportContent').innerHTML = `
      <div class="row g-3">
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <i class="bi bi-people fs-1 text-primary"></i>
              <h6>Total Patients</h6>
              <p class="fs-5" id="patientCount">${patients.length}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <i class="bi bi-calendar-check fs-1 text-success"></i>
              <h6>Total Visits</h6>
              <p class="fs-5" id="visitCount">${visits.length}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <i class="bi bi-briefcase fs-1 text-warning"></i>
              <h6>Services Delivered</h6>
              <p class="fs-5" id="serviceCount">${visits.reduce((acc, v) => acc + (v.serviceType?.length || 0), 0)}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <i class="bi bi-clock-history fs-1 text-danger"></i>
              <h6>Total Appointments</h6>
              <p class="fs-5" id="appointmentCount">${appointments.length}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3 mt-3">
        <div class="col-md-4">
          <div class="card shadow-sm">
            <div class="card-body">
              <h6>Patients by Sex</h6>
              <canvas id="sexPie" height="220"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card shadow-sm">
            <div class="card-body">
              <h6>Services Delivered</h6>
              <canvas id="serviceBar" height="220"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card shadow-sm">
            <div class="card-body">
              <h6>Visits Trend</h6>
              <canvas id="visitTrend" height="220"></canvas>
            </div>
          </div>
        </div>
      </div>
      <a href="#admin-dashboard" class="btn btn-link mt-3"><i class="bi bi-arrow-left"></i> Back</a>
    `;

    // Charts
    loadChartJs(() => {
      // Sex Pie
      const maleCount = patients.filter(p => (p.sex||'').toString().trim().toUpperCase() === "M" || (p.sex||'').toString().trim().toUpperCase() === "MALE").length;
      const femaleCount = patients.filter(p => (p.sex||'').toString().trim().toUpperCase() === "F" || (p.sex||'').toString().trim().toUpperCase() === "FEMALE").length;
      const otherCount = patients.filter(p => {
        const s = (p.sex||'').toString().trim().toUpperCase();
        return s && s !== "M" && s !== "MALE" && s !== "F" && s !== "FEMALE";
      }).length;
      const sexLabels = [];
      const sexCounts = [];
      if (maleCount > 0) { sexLabels.push('Male'); sexCounts.push(maleCount); }
      if (femaleCount > 0) { sexLabels.push('Female'); sexCounts.push(femaleCount); }
      if (otherCount > 0) { sexLabels.push('Other'); sexCounts.push(otherCount); }
      new Chart(document.getElementById('sexPie'), {
        type: 'pie',
        data: {
          labels: sexLabels,
          datasets: [{ data: sexCounts, backgroundColor: ['#0d6efd', '#e83e8c', '#6c757d'].slice(0, sexLabels.length) }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });

      // Service delivered bar chart
      const serviceCounts = {};
      visits.forEach(v => {
        if (Array.isArray(v.serviceType)) {
          v.serviceType.forEach(s => { serviceCounts[s] = (serviceCounts[s]||0)+1; });
        } else if (v.serviceType) {
          serviceCounts[v.serviceType] = (serviceCounts[v.serviceType]||0)+1;
        }
      });
      const serviceLabels = Object.keys(serviceCounts);
      const serviceData = serviceLabels.map(l => serviceCounts[l]);
      new Chart(document.getElementById('serviceBar'), {
        type: 'bar',
        data: {
          labels: serviceLabels,
          datasets: [{ data: serviceData, backgroundColor: '#0d6efd' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, indexAxis: 'y', scales: { x: { beginAtZero: true } } }
      });

      // Visit trend (by day in range)
      const days = [];
      let d = new Date(range.start);
      while (d <= range.end) {
        days.push(d.toISOString().slice(0,10));
        d.setDate(d.getDate() + 1);
      }
      const trend = days.map(day => visits.filter(v => (v.visitDate || '').slice(0, 10) === day).length);
      new Chart(document.getElementById('visitTrend'), {
        type: 'line',
        data: {
          labels: days,
          datasets: [{ label: 'Visits', data: trend, borderColor: '#198754', backgroundColor: 'rgba(25,135,84,0.2)', fill: true }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    });
  }

  // Tab event listeners
  document.getElementById('yearSelect').onchange = e => {
    selectedYear = +e.target.value;
    document.getElementById('quarterSelect').value = '';
    document.getElementById('monthSelect').value = '';
    document.getElementById('weekSelect').innerHTML = '<option value="">Week</option>';
    renderPeriod();
  };
  document.getElementById('quarterSelect').onchange = () => {
    document.getElementById('monthSelect').value = '';
    document.getElementById('weekSelect').innerHTML = '<option value="">Week</option>';
    renderPeriod();
  };
  document.getElementById('monthSelect').onchange = () => {
    document.getElementById('quarterSelect').value = '';
    renderPeriod();
  };
  document.getElementById('weekSelect').onchange = () => {
    renderPeriod();
  };
  renderPeriod();
}