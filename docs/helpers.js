
export function validatePhone(phone) {

  const digits = phone.replace(/\D/g, '');

  return digits.length === 10 && digits.startsWith('0');
}




export function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString();
}
export function calculateAge(dob) {
  if (!dob) return "";
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
export function debounce(fn, ms = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
export function randomSerial(length = 6) {
  return Math.floor(Math.random() * Math.pow(10, length));
}
export function arrayToCSV(rows) {
  return rows.map(row =>
    row.map(cell =>
      (typeof cell === "string" && cell.includes(",")) ? `"${cell.replace(/"/g, '""')}"` : cell
    ).join(",")
  ).join("\r\n");
}




export function getFieldInputHtml(field, value = "") {
  switch (field.type) {
    case "text":
      return `<input type="text" class="form-control" id="f_${field.name}" value="${value||""}">`;
    case "number":
    case "integer":
    case "decimal":
      return `<input type="number" class="form-control" id="f_${field.name}" value="${value||""}" ${field.type==="integer"?'step="1"':''}>`;
    case "date":
      return `<input type="date" class="form-control" id="f_${field.name}" value="${value||""}">`;
    case "select_one":
      return `<select class="form-select" id="f_${field.name}">${(field.choices||"").split(",").map(c=>
        `<option value="${c.trim()}"${value===c.trim()?" selected":""}>${c.trim()}</option>`
      ).join("")}</select>`;

    default:
      return `<input type="text" class="form-control" id="f_${field.name}" value="${value||""}">`;
  }
}
export function validateFieldConstraint(value, constraint) {
  if (!constraint || !value) return true;
  const rules = constraint.split(",");
  for (let r of rules) {
    const [k,v] = r.split("=");
    if (k==="min" && Number(value) < Number(v)) return false;
    if (k==="max" && Number(value) > Number(v)) return false;
    if (k==="regex" && !(new RegExp(v).test(value))) return false;
  }
  return true;
}




export function renderProfile(root, options) {
  const { dashboardHash = '#dashboard', getUser, updateUser, fieldLabels = {} } = options;
  const user = getUser();
  if (!user) {
    root.innerHTML = '<div class="alert alert-danger">No user logged in.</div>';
    return;
  }
  const labels = {
    username: fieldLabels.username || 'Username',
    fullName: fieldLabels.fullName || 'Full Name',
    contact: fieldLabels.contact || 'Contact',
    currentPassword: fieldLabels.currentPassword || 'Current Password',
    newPassword: fieldLabels.newPassword || 'New Password',
  };
  root.innerHTML = `
    <div class="container my-4">
      <div class="card shadow mx-auto" style="max-width:400px;">
        <div class="card-body">
          <h4 class="mb-3"><i class="bi bi-person-circle"></i> Update Profile</h4>
          <form id="profileForm" autocomplete="off">
            <div class="mb-3">
              <label class="form-label">${labels.username}</label>
              <input class="form-control" value="${user.username}" readonly>
            </div>
            <div class="mb-3">
              <label class="form-label">${labels.fullName}</label>
              <input class="form-control" id="fullName" value="${user.fullName || user.name || ''}" placeholder="${labels.fullName}" required>
            </div>
            <div class="mb-3">
              <label class="form-label">${labels.contact}</label>
              <input class="form-control" id="contact" value="${user.contact || user.phone || ''}" placeholder="${labels.contact}">
            </div>
            <hr>
            <h6>Change Password</h6>
            <div class="mb-2">
              <label class="form-label">${labels.currentPassword}</label>
              <input type="password" class="form-control" id="currentPassword" autocomplete="current-password">
            </div>
            <div class="mb-2">
              <label class="form-label">${labels.newPassword}</label>
              <input type="password" class="form-control" id="newPassword" autocomplete="new-password">
            </div>
            <div class="d-flex justify-content-between mt-3">
              <button class="btn btn-primary">Save Changes</button>
              <a href="${dashboardHash}" class="btn btn-secondary">Cancel</a>
            </div>
            <div id="profileMsg" class="mt-2 small"></div>
          </form>
        </div>
      </div>
    </div>
  `;
  document.getElementById('profileForm').onsubmit = function(e) {
    e.preventDefault();
    const fullName = this.fullName.value.trim();
    const contact = this.contact.value.trim();
    const currentPassword = this.currentPassword.value;
    const newPassword = this.newPassword.value;
    let msg = '';
    if ('fullName' in user) user.fullName = fullName;
    if ('name' in user) user.name = fullName;
    if ('contact' in user) user.contact = contact;
    if ('phone' in user) user.phone = contact;
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        msg = 'Both current and new password are required to change password.';
        this.querySelector('#profileMsg').textContent = msg;
        this.querySelector('#profileMsg').className = 'text-danger mt-2 small';
        return;
      }
      if (user.password !== currentPassword) {
        msg = 'Current password is incorrect.';
        this.querySelector('#profileMsg').textContent = msg;
        this.querySelector('#profileMsg').className = 'text-danger mt-2 small';
        return;
      }
      user.password = newPassword;
      user.lastPasswordChange = Date.now();
      msg = 'Password updated! ';
    }
    updateUser(user);
    this.querySelector('#profileMsg').textContent = msg + 'Profile updated!';
    this.querySelector('#profileMsg').className = 'text-success mt-2 small';
    setTimeout(() => {
      window.location.hash = dashboardHash;
    }, 1200);
  };
}
export function isPasswordExpired(user) {
  if (!user) return false;
  const last = user.lastPasswordChange || 0;
  return (Date.now() - last) / 86400000 > 30;
}




export function renderMobileTable(headers, rows, actions) {
  return `
    <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle mobile-table">
        <thead class="table-light">
          <tr>
            ${headers.map(h => `<th${h.mobile ? '' : ' class="d-none d-md-table-cell"'}>${h.label}</th>`).join('')}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, i) => `
            <tr>
              ${headers.map(h => `<td${h.mobile ? ` data-label='${h.label}'` : ' class="d-none d-md-table-cell"'}>${row[h.key]||''}</td>`).join('')}
              <td data-label="Actions">${actions(row, i)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <style>
    @media (max-width: 768px) {
      .mobile-table thead { display: none; }
      .mobile-table tr { display: block; margin-bottom: 1rem; border: 1px solid #dee2e6; border-radius: 8px; }
      .mobile-table td { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; border: none; border-bottom: 1px solid #eee; }
      .mobile-table td:last-child { border-bottom: none; }
      .mobile-table td:before {
        content: attr(data-label);
        font-weight: bold;
        flex: 0 0 40%;
        color: #555;
      }
      .mobile-table td { flex-direction: row; }
    }
    </style>
  `;
}
export function showModal(content, onClose) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class='modal-content mx-auto'>${content}</div>`;
  document.body.appendChild(modal);

  function close() {
    if (modal.parentNode) document.body.removeChild(modal);
    document.removeEventListener('keydown', onKeyDown);
    if (onClose) onClose();
  }
  function onKeyDown(e) {
    if (e.key === 'Escape') close();
  }
  modal.onclick = e => {
    if (e.target === modal) close();
  };
  document.addEventListener('keydown', onKeyDown);
  return close;
}




import { db } from './db.js';
export function generatePatientID(registrationDate = new Date()) {
  const region = db.facility?.region?.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || "RG";
  const district = db.facility?.district?.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || "DST";
  const facility = db.facility?.name?.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || "FC";
  let serial;
  do {
    serial = String(Math.floor(100000 + Math.random() * 900000));
  } while (db.patients && db.patients.some(p => p.patientID?.includes(serial)));
  const allChars = (region + district + facility + serial).split('');
  for (let i = allChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allChars[i], allChars[j]] = [allChars[j], allChars[i]];
  }
  let year;
  if (typeof registrationDate === 'string') {
    const d = new Date(registrationDate);
    year = String(d.getFullYear()).slice(-2);
  } else {
    year = String(new Date(registrationDate).getFullYear()).slice(-2);
  }
  return `${allChars.join('')}${year}`;
}
