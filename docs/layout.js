
import { db } from './db.js';

export function createAppHeader() {
  const facility = db.facility || {};
  const currentUser = db.currentUser;
  
  return `
    <div class="thynktech-header">
      <div class="thynktech-meta">
        <div class="meta-facility">
          <img src="${getThemeAwareLogo()}" alt="Logo" class="theme-aware-logo">
          <div>
            <div class="facility-name">${facility.name || 'ThynkTech Health System'}</div>
            <div class="facility-location">${facility.description || facility.location || 'Professional Healthcare Management'}</div>
          </div>
        </div>
        <div class="meta-actions">
          <div class="theme-picker">
            <button onclick="toggleThemePicker()" aria-label="Change theme">
              <i class="bi bi-palette health-icon"></i>
              <span>Theme</span>
            </button>
            <div id="themeDropdown" class="theme-dropdown">
              <div class="theme-option" onclick="applyTheme('auto')">
                <div class="theme-swatch" style="background: linear-gradient(45deg, var(--health-light), var(--health-dark));"></div>
                <span>Auto</span>
              </div>
              <div class="theme-option" onclick="applyTheme('light')">
                <div class="theme-swatch" style="background: var(--health-light);"></div>
                <span>Light</span>
              </div>
              <div class="theme-option" onclick="applyTheme('dark')">
                <div class="theme-swatch" style="background: var(--health-dark);"></div>
                <span>Dark</span>
              </div>
            </div>
          </div>
          <div class="health-badge health-badge-info user-profile-badge" onclick="showUserProfile()" style="cursor: pointer;">
            <i class="bi bi-person health-icon"></i>
            ${currentUser?.username || 'User'}
          </div>
          <button class="btn btn-sm btn-outline-danger logout-btn ms-2" onclick="handleLogout()" aria-label="Logout">
            <i class="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>`;
}

export function createAppFooter() {
  const currentYear = new Date().getFullYear();
  const facility = db.facility || {};
  return `
    <footer class="footer mt-auto py-3 bg-light text-center">
      <div class="container">
        <div class="d-flex align-items-center justify-content-center mb-2">
          <img src="${getThemeAwareLogo()}" alt="Logo" class="theme-aware-logo me-2" style="height: 24px;">
          <span class="text-muted">${facility.name || 'ThynkTech Health System'}</span>
        </div>
        <span class="text-muted small">Contact: <a href="tel:+233269609634">+233269609634</a> | Website: <a href="https://geesway12.github.io/thynktech-site/" target="_blank">geesway12.github.io/thynktech-site/</a></span>
      </div>
    </footer>
  `;
}

export function getThemeAwareLogo() {
  const currentTheme = getCurrentTheme();
  if (currentTheme === 'dark') {
    return 'logo-light.png';
  } else {
    return 'logo-dark.png';
  }
}

export function getCurrentTheme() {
  return localStorage.getItem('theme') || 'light';
}

export function applyTheme(theme) {
  localStorage.setItem('theme', theme);
  
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add(`theme-${theme}`);
  
  updateLogoForTheme(theme);
  hideThemeDropdown();
}

export function updateLogoForTheme(theme) {
  const logos = document.querySelectorAll('.theme-aware-logo');
  const logoSrc = getThemeAwareLogo();
  
  logos.forEach(logo => {
    logo.src = logoSrc;
  });
}

export function toggleThemePicker() {
  const dropdown = document.getElementById('themeDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  }
}

export function hideThemeDropdown() {
  const dropdown = document.getElementById('themeDropdown');
  if (dropdown) {
    dropdown.style.display = 'none';
  }
}

export function initializeTheme() {
  const savedTheme = getCurrentTheme();
  applyTheme(savedTheme);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem('theme') === 'auto') {
      applyTheme('auto');
    }
  });

  document.addEventListener('click', (e) => {
    const themePicker = e.target.closest('.theme-picker');
    if (!themePicker) {
      hideThemeDropdown();
    }
  });
}

export function createNavigation(activeSection) {
  const isAdmin = window.location.pathname.includes('/admin/');
  
  const adminSections = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { id: 'patients', label: 'Patients', icon: 'bi-people' },
    { id: 'appointments', label: 'Appointments', icon: 'bi-calendar-check' },
    { id: 'visits', label: 'Visits', icon: 'bi-clipboard-pulse' },
    { id: 'services', label: 'Services', icon: 'bi-heart-pulse' },
    { id: 'reports', label: 'Reports', icon: 'bi-bar-chart' },
    { id: 'backup', label: 'Backup', icon: 'bi-cloud-download' },
    { id: 'registers', label: 'Registers', icon: 'bi-journal-medical' }
  ];
  
  const userSections = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-house' },
    { id: 'patients', label: 'Patients', icon: 'bi-people' },
    { id: 'appointments', label: 'Appointments', icon: 'bi-calendar-check' },
    { id: 'visits', label: 'Visits', icon: 'bi-clipboard-pulse' },
    { id: 'reports', label: 'Reports', icon: 'bi-bar-chart' },
    { id: 'users', label: 'Users', icon: 'bi-person-gear' }
  ];
  
  const sections = isAdmin ? adminSections : userSections;
  
  return `
    <nav class="health-nav">
      <div class="health-container">
        <ul class="health-nav-list">
          ${sections.map(section => `
            <li class="health-nav-item">
              <a href="#${section.id}" class="health-nav-link ${activeSection === section.id ? 'active' : ''}">
                <i class="${section.icon} health-icon"></i>
                <span>${section.label}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    </nav>
  `;
}

export function wrapWithLayout(content, pageId = '', includeHeader = true, includeFooter = true) {
  const header = includeHeader ? createAppHeader() : '';
  const footer = includeFooter ? createAppFooter() : '';
  
  return `
    ${header}
    <main class="main-content" data-page="${pageId}">
      ${content}
    </main>
    ${footer}
  `;
}

export function setupLogoutButton() {

  const logoutButtons = document.querySelectorAll('[data-action="logout"], .logout-btn, #logoutBtn');
  
  logoutButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });
}

function handleLogout() {

  if (typeof db !== 'undefined') {
    db.currentUser = null;

    if (typeof saveDb === 'function') {
      saveDb();
    }
  }

  localStorage.removeItem('currentUser');
  localStorage.removeItem('authToken');

  window.location.hash = '#login';

  setTimeout(() => {
    window.location.reload();
  }, 100);
}

export function showUserProfile() {
  const currentUser = db.currentUser;
  if (!currentUser) return;
  
  const content = `
    <div style="max-width: 500px;">
      <h5><i class="bi bi-person-circle"></i> User Profile</h5>
      <form id="userProfileForm">
        <div class="mb-3">
          <label class="form-label">Username</label>
          <input type="text" class="form-control" name="username" value="${currentUser.username || ''}" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Full Name</label>
          <input type="text" class="form-control" name="fullName" value="${currentUser.fullName || ''}" placeholder="Enter your full name">
        </div>
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" name="email" value="${currentUser.email || ''}" placeholder="Enter your email">
        </div>
        <div class="mb-3">
          <label class="form-label">Contact Number</label>
          <input type="tel" class="form-control" name="contact" value="${currentUser.contact || ''}" placeholder="Enter contact number">
        </div>
        <div class="mb-3">
          <label class="form-label">Change Password</label>
          <input type="password" class="form-control" name="newPassword" placeholder="Leave blank to keep current password">
        </div>
        <div class="d-flex justify-content-between">
          <button type="submit" class="btn btn-primary">Update Profile</button>
          <button type="button" class="btn btn-secondary" id="cancelProfile">Cancel</button>
        </div>
        <div id="profileMsg" class="mt-2 small"></div>
      </form>
    </div>`;

  const closeModal = showModal(content);

  document.getElementById("cancelProfile").onclick = closeModal;

  document.getElementById("userProfileForm").onsubmit = function(e) {
    e.preventDefault();
    const formData = new FormData(this);

    currentUser.username = formData.get('username');
    currentUser.fullName = formData.get('fullName');
    currentUser.email = formData.get('email');
    currentUser.contact = formData.get('contact');
    
    if (formData.get('newPassword')) {
      currentUser.password = formData.get('newPassword');
    }

    const userIndex = db.users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
      db.users[userIndex] = { ...db.users[userIndex], ...currentUser };
    }
    
    saveDb();
    
    this.querySelector("#profileMsg").textContent = "Profile updated successfully!";
    this.querySelector("#profileMsg").className = "text-success mt-2 small";

    const userBadges = document.querySelectorAll('.user-profile-badge');
    userBadges.forEach(badge => {
      const textNode = badge.childNodes[badge.childNodes.length - 1];
      if (textNode && textNode.nodeType === 3) {
        textNode.textContent = currentUser.username;
      }
    });
    
    setTimeout(() => closeModal(), 1500);
  };
}

export function createUnifiedDashboard(appType = 'admin') {
  return `
    <div class="unified-dashboard">
      ${createDashboardHeader(appType)}
      ${createDashboardStats()}
      ${createDashboardGrid(appType)}
    </div>
  `;
}

export function createDashboardHeader(appType) {
  const isAdmin = appType === 'admin';
  return `
    <div class="dashboard-header">
      <div class="welcome-section">
        <h1 class="dashboard-title">
          ${healthIcons.health} Welcome to ThynkTech ${isAdmin ? 'Admin' : 'User'} Portal
        </h1>
        <p class="dashboard-subtitle">
          ${facility.description || 'Professional Healthcare Management System'}
        </p>
      </div>
      <div class="quick-actions">
        ${createQuickActionButtons(appType)}
      </div>
    </div>
  `;
}

export function createDashboardStats() {
  return `
    <div class="dashboard-stats">
      <div class="stat-card stat-primary">
        <div class="stat-icon">${healthIcons.patient}</div>
        <div class="stat-content">
          <div class="stat-number" id="totalPatients">--</div>
          <div class="stat-label">Total Patients</div>
        </div>
      </div>
      <div class="stat-card stat-success">
        <div class="stat-icon">${healthIcons.appointment}</div>
        <div class="stat-content">
          <div class="stat-number" id="totalAppointments">--</div>
          <div class="stat-label">Appointments</div>
        </div>
      </div>
      <div class="stat-card stat-info">
        <div class="stat-icon">${healthIcons.visit}</div>
        <div class="stat-content">
          <div class="stat-number" id="totalVisits">--</div>
          <div class="stat-label">Visits Today</div>
        </div>
      </div>
      <div class="stat-card stat-warning">
        <div class="stat-icon">${healthIcons.service}</div>
        <div class="stat-content">
          <div class="stat-number" id="totalServices">--</div>
          <div class="stat-label">Services</div>
        </div>
      </div>
    </div>
  `;
}

export function createDashboardGrid(appType) {
  const isAdmin = appType === 'admin';
  return `
    <div class="dashboard-grid">
      ${createDashboardCard('Recent Patients', createRecentPatientsWidget(), 'primary')}
      ${createDashboardCard('Today\'s Appointments', createTodayAppointmentsWidget(), 'success')}
      ${createDashboardCard('Quick Stats', createQuickStatsWidget(), 'info')}
      ${isAdmin ? createDashboardCard('Admin Tools', createAdminToolsWidget(), 'warning') : ''}
      ${createDashboardCard('Recent Activity', createRecentActivityWidget(), 'secondary')}
    </div>
  `;
}

export function createQuickActionButtons(appType) {
  const isAdmin = appType === 'admin';
  return `
    <div class="quick-action-buttons">
      ${createFloatingActionButton('Add Patient', 'bi-person-plus', 'showAddPatientModal()', 'primary')}
      ${createFloatingActionButton('New Appointment', 'bi-calendar-plus', 'showAddAppointmentModal()', 'success')}
      ${isAdmin ? createFloatingActionButton('Generate Report', 'bi-file-earmark-bar-graph', 'showReportsModal()', 'info') : ''}
    </div>
  `;
}

export function createFloatingActionButton(text, icon, onclick, type = 'primary') {
  return `
    <button class="floating-action-btn floating-action-btn-${type}" onclick="${onclick}" title="${text}">
      <i class="${icon}"></i>
      <span>${text}</span>
    </button>
  `;
}

export function createTransparentModal(id, title, content, size = 'medium') {
  return `
    <div class="transparent-modal-overlay" id="${id}Overlay" onclick="closeModal('${id}')">
      <div class="transparent-modal transparent-modal-${size}" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="closeModal('${id}')" aria-label="Close">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    </div>
  `;
}

export function showModal(modalId) {
  const modal = document.getElementById(modalId + 'Overlay');
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    setTimeout(() => modal.classList.add('modal-active'), 10);
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId + 'Overlay');
  if (modal) {
    modal.classList.remove('modal-active');
    setTimeout(() => {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }, 300);
  }
}

export function createDashboardCard(title, content, colorTheme = 'primary') {
  return `
    <div class="dashboard-card dashboard-card-${colorTheme}">
      <div class="dashboard-card-header">
        <h4 class="dashboard-card-title">${title}</h4>
      </div>
      <div class="dashboard-card-body">
        ${content}
      </div>
    </div>
  `;
}

export function createRecentPatientsWidget() {
  return `
    <div class="recent-patients-widget">
      <div class="widget-list" id="recentPatientsList">
        <div class="widget-item">
          <div class="patient-avatar">${healthIcons.patient}</div>
          <div class="patient-info">
            <div class="patient-name">Loading patients...</div>
            <div class="patient-details">Please wait</div>
          </div>
        </div>
      </div>
      <div class="widget-footer">
        <button class="btn-link" onclick="window.location.hash='#patients'">View All Patients</button>
      </div>
    </div>
  `;
}

export function createTodayAppointmentsWidget() {
  return `
    <div class="appointments-widget">
      <div class="widget-list" id="todayAppointmentsList">
        <div class="widget-item">
          <div class="appointment-time">${healthIcons.appointment}</div>
          <div class="appointment-info">
            <div class="appointment-patient">Loading appointments...</div>
            <div class="appointment-details">Please wait</div>
          </div>
        </div>
      </div>
      <div class="widget-footer">
        <button class="btn-link" onclick="window.location.hash='#appointments'">View All Appointments</button>
      </div>
    </div>
  `;
}

export function createQuickStatsWidget() {
  return `
    <div class="quick-stats-widget">
      <div class="mini-stats">
        <div class="mini-stat">
          <span class="mini-stat-icon">${healthIcons.success}</span>
          <span class="mini-stat-number" id="completedToday">0</span>
          <span class="mini-stat-label">Completed Today</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-icon">${healthIcons.warning}</span>
          <span class="mini-stat-number" id="pendingToday">0</span>
          <span class="mini-stat-label">Pending</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-icon">${healthIcons.emergency}</span>
          <span class="mini-stat-number" id="urgentToday">0</span>
          <span class="mini-stat-label">Urgent</span>
        </div>
      </div>
    </div>
  `;
}

export function createAdminToolsWidget() {
  return `
    <div class="admin-tools-widget">
      <div class="admin-tool-grid">
        <button class="admin-tool-btn" onclick="window.location.hash='#backup'">
          <i class="bi bi-cloud-download"></i>
          <span>Backup Data</span>
        </button>
        <button class="admin-tool-btn" onclick="window.location.hash='#registers'">
          <i class="bi bi-journal-medical"></i>
          <span>Registers</span>
        </button>
        <button class="admin-tool-btn" onclick="window.location.hash='#reports'">
          <i class="bi bi-bar-chart"></i>
          <span>Reports</span>
        </button>
        <button class="admin-tool-btn" onclick="showSystemSettingsModal()">
          <i class="bi bi-gear"></i>
          <span>Settings</span>
        </button>
      </div>
    </div>
  `;
}

export function createRecentActivityWidget() {
  return `
    <div class="activity-widget">
      <div class="activity-timeline" id="recentActivityTimeline">
        <div class="activity-item">
          <div class="activity-icon">${healthIcons.info}</div>
          <div class="activity-content">
            <div class="activity-text">System ready</div>
            <div class="activity-time">Just now</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function showNotification(message, type = 'info', duration = 5000) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${healthIcons[type] || healthIcons.info}</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `;

  let container = document.getElementById('notificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
  
  container.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, duration);
}

export function createLoadingSpinner(size = 'medium') {
  return `
    <div class="loading-spinner loading-spinner-${size}">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;
}

export function createSkeletonLoader(type = 'card') {
  return `
    <div class="skeleton-loader skeleton-${type}">
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line skeleton-text"></div>
      <div class="skeleton-line skeleton-text skeleton-short"></div>
    </div>
  `;
}

export function getStatusBadge(status) {
  const statusMap = {
    'active': { type: 'success', text: 'Active' },
    'inactive': { type: 'muted', text: 'Inactive' },
    'pending': { type: 'warning', text: 'Pending' },
    'completed': { type: 'success', text: 'Completed' },
    'cancelled': { type: 'danger', text: 'Cancelled' },
    'scheduled': { type: 'info', text: 'Scheduled' },
    'confirmed': { type: 'primary', text: 'Confirmed' }
  };
  
  const statusInfo = statusMap[status] || { type: 'secondary', text: status };
  return createHealthBadge(statusInfo.text, statusInfo.type);
}

export const healthIcons = {
  patient: '👤',
  appointment: '📅',
  visit: '🏥',
  service: '⚕️',
  report: '📊',
  backup: '💾',
  register: '📋',
  admin: '👨‍⚕️',
  user: '👩‍⚕️',
  health: '❤️',
  medical: '🩺',
  pharmacy: '💊',
  laboratory: '🧪',
  emergency: '🚨',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️'
};

export function initializeLayout() {
  initializeLayoutSystem();
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initializeLayout);
}

export function initializeLayoutSystem() {
  initializeTheme();
  setupLogoutButton();

  window.addEventListener('hashchange', () => {
    setTimeout(setupLogoutButton, 100);
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const isDark = document.body.classList.contains('theme-dark');
        updateLogoForTheme(isDark ? 'dark' : 'light');
      }
    });
  });
  
  observer.observe(document.body, { 
    attributes: true, 
    attributeFilter: ['class'] 
  });
}

export function createAddPatientModal() {
  const content = `
    <form id="addPatientForm" onsubmit="handleAddPatient(event)">
      ${createHealthFormGroup('Full Name', createHealthInput('fullName', 'text', 'Enter patient full name', '', true), true)}
      ${createHealthFormGroup('Phone Number', createHealthInput('phone', 'tel', 'Enter phone number', '', true), true)}
      ${createHealthFormGroup('Email', createHealthInput('email', 'email', 'Enter email address'))}
      ${createHealthFormGroup('Date of Birth', createHealthInput('dateOfBirth', 'date', '', '', true), true)}
      ${createHealthFormGroup('Gender', createHealthSelect('gender', ['Male', 'Female'], '', true), true)}
      ${createHealthFormGroup('Address', createHealthTextarea('address', 'Enter full address', '', 3))}
      ${createHealthFormGroup('Emergency Contact', createHealthInput('emergencyContact', 'tel', 'Emergency contact number'))}
      
      <div class="modal-actions">
        <button type="button" class="health-btn health-btn-secondary" onclick="closeModal('addPatient')">
          Cancel
        </button>
        <button type="submit" class="health-btn health-btn-primary">
          <i class="bi bi-person-plus health-icon"></i>
          Add Patient
        </button>
      </div>
    </form>
  `;
  
  return createTransparentModal('addPatient', '👤 Add New Patient', content, 'medium');
}

export function createAddAppointmentModal() {
  const content = `
    <form id="addAppointmentForm" onsubmit="handleAddAppointment(event)">
      ${createHealthFormGroup('Patient', createHealthSelect('patientId', [], '', true), true)}
      ${createHealthFormGroup('Appointment Date', createHealthInput('appointmentDate', 'date', '', '', true), true)}
      ${createHealthFormGroup('Appointment Time', createHealthInput('appointmentTime', 'time', '', '', true), true)}
      ${createHealthFormGroup('Service', createHealthSelect('serviceId', [], '', true), true)}
      ${createHealthFormGroup('Notes', createHealthTextarea('notes', 'Additional notes or instructions', '', 3))}
      
      <div class="modal-actions">
        <button type="button" class="health-btn health-btn-secondary" onclick="closeModal('addAppointment')">
          Cancel
        </button>
        <button type="submit" class="health-btn health-btn-success">
          <i class="bi bi-calendar-plus health-icon"></i>
          Schedule Appointment
        </button>
      </div>
    </form>
  `;
  
  return createTransparentModal('addAppointment', '📅 Schedule New Appointment', content, 'medium');
}

export function createReportsModal() {
  const content = `
    <div class="reports-options">
      <div class="report-category">
        <h5>📊 Patient Reports</h5>
        <div class="report-buttons">
          <button class="health-btn health-btn-outline-primary" onclick="generateReport('patients-summary')">
            Patient Summary
          </button>
          <button class="health-btn health-btn-outline-primary" onclick="generateReport('patients-detailed')">
            Detailed Patient List
          </button>
        </div>
      </div>
      
      <div class="report-category">
        <h5>📅 Appointment Reports</h5>
        <div class="report-buttons">
          <button class="health-btn health-btn-outline-success" onclick="generateReport('appointments-today')">
            Today's Appointments
          </button>
          <button class="health-btn health-btn-outline-success" onclick="generateReport('appointments-weekly')">
            Weekly Report
          </button>
          <button class="health-btn health-btn-outline-success" onclick="generateReport('appointments-monthly')">
            Monthly Report
          </button>
        </div>
      </div>
      
      <div class="report-category">
        <h5>🏥 Visit Reports</h5>
        <div class="report-buttons">
          <button class="health-btn health-btn-outline-info" onclick="generateReport('visits-summary')">
            Visit Summary
          </button>
          <button class="health-btn health-btn-outline-info" onclick="generateReport('visits-detailed')">
            Detailed Visits
          </button>
        </div>
      </div>
      
      <div class="report-category">
        <h5>⚕️ Service Reports</h5>
        <div class="report-buttons">
          <button class="health-btn health-btn-outline-warning" onclick="generateReport('services-usage')">
            Service Usage
          </button>
          <button class="health-btn health-btn-outline-warning" onclick="generateReport('services-revenue')">
            Revenue Report
          </button>
        </div>
      </div>
    </div>
  `;
  
  return createTransparentModal('reports', '📊 Generate Reports', content, 'large');
}

export function createSystemSettingsModal() {
  const content = `
    <div class="settings-tabs">
      <div class="tab-navigation">
        <button class="tab-btn active" onclick="showSettingsTab('general')">General</button>
        <button class="tab-btn" onclick="showSettingsTab('facility')">Facility Info</button>
        <button class="tab-btn" onclick="showSettingsTab('backup')">Backup</button>
        <button class="tab-btn" onclick="showSettingsTab('users')">Users</button>
      </div>
      
      <div class="tab-content">
        <div id="general-tab" class="tab-pane active">
          <h5>⚙️ General Settings</h5>
          ${createHealthFormGroup('System Language', createHealthSelect('language', ['English', 'French', 'Spanish'], 'English'))}
          ${createHealthFormGroup('Date Format', createHealthSelect('dateFormat', ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], 'DD/MM/YYYY'))}
          ${createHealthFormGroup('Time Format', createHealthSelect('timeFormat', ['12 Hour', '24 Hour'], '24 Hour'))}
        </div>
        
        <div id="facility-tab" class="tab-pane">
          <h5>🏥 Facility Information</h5>
          ${createHealthFormGroup('Facility Name', createHealthInput('facilityName', 'text', 'Enter facility name'))}
          ${createHealthFormGroup('Location', createHealthInput('facilityLocation', 'text', 'Enter location'))}
          ${createHealthFormGroup('Contact Phone', createHealthInput('facilityPhone', 'tel', 'Enter contact number'))}
          ${createHealthFormGroup('Email', createHealthInput('facilityEmail', 'email', 'Enter facility email'))}
        </div>
        
        <div id="backup-tab" class="tab-pane">
          <h5>💾 Backup Settings</h5>
          <div class="backup-options">
            <button class="health-btn health-btn-primary" onclick="performBackup()">
              <i class="bi bi-cloud-download"></i>
              Create Backup Now
            </button>
            <button class="health-btn health-btn-success" onclick="restoreBackup()">
              <i class="bi bi-cloud-upload"></i>
              Restore from Backup
            </button>
          </div>
        </div>
        
        <div id="users-tab" class="tab-pane">
          <h5>👥 User Management</h5>
          <div class="user-actions">
            <button class="health-btn health-btn-primary" onclick="showAddUserModal()">
              <i class="bi bi-person-plus"></i>
              Add New User
            </button>
            <button class="health-btn health-btn-warning" onclick="showUserListModal()">
              <i class="bi bi-people"></i>
              Manage Users
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="modal-actions">
      <button type="button" class="health-btn health-btn-secondary" onclick="closeModal('systemSettings')">
        Close
      </button>
      <button type="button" class="health-btn health-btn-primary" onclick="saveSystemSettings()">
        <i class="bi bi-check-lg"></i>
        Save Settings
      </button>
    </div>
  `;
  
  return createTransparentModal('systemSettings', '⚙️ System Settings', content, 'large');
}

export function showAddPatientModal() {

  if (!document.getElementById('addPatientOverlay')) {
    document.body.insertAdjacentHTML('beforeend', createAddPatientModal());
  }
  showModal('addPatient');
}

export function showAddAppointmentModal() {

  if (!document.getElementById('addAppointmentOverlay')) {
    document.body.insertAdjacentHTML('beforeend', createAddAppointmentModal());

    populatePatientDropdown();
    populateServiceDropdown();
  }
  showModal('addAppointment');
}

export function showReportsModal() {

  if (!document.getElementById('reportsOverlay')) {
    document.body.insertAdjacentHTML('beforeend', createReportsModal());
  }
  showModal('reports');
}

export function showSystemSettingsModal() {

  if (!document.getElementById('systemSettingsOverlay')) {
    document.body.insertAdjacentHTML('beforeend', createSystemSettingsModal());
    loadSystemSettings();
  }
  showModal('systemSettings');
}

export function populatePatientDropdown() {
  const dropdown = document.getElementById('patientId');
  if (dropdown && typeof db !== 'undefined' && db.patients) {
    dropdown.innerHTML = '<option value="">Select Patient</option>';
    db.patients.forEach(patient => {
      const option = document.createElement('option');
      option.value = patient.id;
      option.textContent = patient.name;
      dropdown.appendChild(option);
    });
  }
}

export function populateServiceDropdown() {
  const dropdown = document.getElementById('serviceId');
  if (dropdown && typeof db !== 'undefined' && db.services) {
    dropdown.innerHTML = '<option value="">Select Service</option>';
    db.services.forEach(service => {
      const option = document.createElement('option');
      option.value = service.id;
      option.textContent = service.name;
      dropdown.appendChild(option);
    });
  }
}

export function showSettingsTab(tabName) {

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const targetTab = document.getElementById(tabName + '-tab');
  if (targetTab) {
    targetTab.classList.add('active');
  }

  event.target.classList.add('active');
}

if (typeof window !== 'undefined') {
  window.showAddPatientModal = showAddPatientModal;
  window.showAddAppointmentModal = showAddAppointmentModal;
  window.showReportsModal = showReportsModal;
  window.showSystemSettingsModal = showSystemSettingsModal;
  window.showModal = showModal;
  window.closeModal = closeModal;
  window.showSettingsTab = showSettingsTab;
  window.showNotification = showNotification;
  window.showUserProfile = showUserProfile;
  window.toggleThemePicker = toggleThemePicker;
  window.applyTheme = applyTheme;
  window.hideThemeDropdown = hideThemeDropdown;
  window.handleLogout = handleLogout;
}
