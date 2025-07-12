
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
            <div class="facility-name">${facility.name || 'TechThynk Health System'}</div>
            <div class="facility-location">${facility.location || 'Professional Healthcare Management'}</div>
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
          <div class="health-badge health-badge-info">
            <i class="bi bi-person health-icon"></i>
            ${currentUser?.username || 'User'}
          </div>
        </div>
      </div>
    </div>`;
}

export function createAppFooter() {
  const currentYear = new Date().getFullYear();
  return `
    <footer class="footer mt-auto py-3 bg-light text-center">
      <div class="container">
        <span class="text-muted">Contact: <a href="tel:+233269609634">+233269609634</a> | Website: <a href="https://geesway12.github.io/thynktech-site/" target="_blank">geesway12.github.io/thynktech-site/</a></span>
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

export function createHealthCard(title, content, actions = '') {
  return `
    <div class="health-card">
      <div class="health-card-header">
        <h3 class="health-card-title">${title}</h3>
        ${actions}
      </div>
      <div class="health-card-body">
        ${content}
      </div>
    </div>
  `;
}

export function createHealthButton(text, type = 'primary', onclick = '', icon = '') {
  return `
    <button class="health-btn health-btn-${type}" onclick="${onclick}">
      ${icon ? `<i class="${icon} health-icon"></i>` : ''}
      <span>${text}</span>
    </button>
  `;
}

export function createHealthBadge(text, type = 'primary') {
  return `<span class="health-badge health-badge-${type}">${text}</span>`;
}

export function createHealthAlert(message, type = 'info') {
  return `
    <div class="health-alert health-alert-${type}">
      ${message}
    </div>
  `;
}

export function showLoading(element) {
  if (element) {
    element.classList.add('health-loading');
  }
}

export function hideLoading(element) {
  if (element) {
    element.classList.remove('health-loading');
  }
}

export function createHealthFormGroup(label, input, required = false) {
  return `
    <div class="health-form-group">
      <label class="health-label">
        ${label}${required ? ' <span style="color: var(--health-danger);">*</span>' : ''}
      </label>
      ${input}
    </div>
  `;
}

export function createHealthInput(name, type = 'text', placeholder = '', value = '', required = false) {
  return `
    <input 
      class="health-input" 
      type="${type}" 
      name="${name}" 
      id="${name}"
      placeholder="${placeholder}" 
      value="${value}"
      ${required ? 'required' : ''}
    >
  `;
}

export function createHealthSelect(name, options, selected = '', required = false) {
  return `
    <select class="health-select" name="${name}" id="${name}" ${required ? 'required' : ''}>
      <option value="">Choose...</option>
      ${options.map(option => {
        const value = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        return `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`;
      }).join('')}
    </select>
  `;
}

export function createHealthTextarea(name, placeholder = '', value = '', rows = 4, required = false) {
  return `
    <textarea 
      class="health-textarea" 
      name="${name}" 
      id="${name}"
      placeholder="${placeholder}" 
      rows="${rows}"
      ${required ? 'required' : ''}
    >${value}</textarea>
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
