import { db, saveDb, loadDb } from './db.js';
import { registerServiceWorker } from './pwa.js';
import { renderLogin } from './auth.js';
import { renderFacilitySetup, renderAdminDashboard, renderUserManagement, renderAdminExportBackupPage } from './admin.js';
import { renderProfile } from './helpers.js';
import { renderPatientList } from './patients.js';
import { renderVisitLog } from './visits.js';
import { renderRegisterMgmt } from './registers.js';
import { renderReports } from './reports.js';
import { renderServiceVisitSelector, renderServiceEntry } from './services.js';
import { renderAppointmentForm } from './appointments.js';

function router() {
  const app = document.getElementById('app');

  if (!db.facility) {
    window.location.hash = "#facility-setup";
    renderFacilitySetup(app);
    return;
  }

  if (!db.users || db.users.length === 0) {
    window.location.hash = "#admin-setup";


    return;
  }

  if (!db.currentUser) {
    window.location.hash = "#login";
    renderLogin(app);
    return;
  }

  const hash = window.location.hash;
  if (hash === "#facility-setup") renderFacilitySetup(app);

  else if (hash === "#login") renderLogin(app);
  else if (hash === "#admin-dashboard" || hash === "") renderAdminDashboard(app);
  else if (hash === "#profile") renderProfile(app, {
    getUser: () => db.currentUser,
    updateUser: (u) => { db.currentUser = u; saveDb(); },
    dashboardHash: '#admin-dashboard'
  });
  else if (hash === "#user-mgmt") renderUserManagement(app);
  else if (hash === "#patient-reg") renderPatientList(app);
  else if (hash === "#visit-log") renderVisitLog(app);
  else if (hash === "#register-mgmt") renderRegisterMgmt(app);
  else if (hash === "#reports") renderReports(app);
  else if (hash === "#admin-export") renderAdminExportBackupPage(app);
  else if (hash.startsWith("#appointment")) {
    const patientID = hash.split("-")[1];
    const patient = db.patients?.find(p => p.patientID === patientID);
    if (patient) renderAppointmentForm(patient);
    else renderAdminDashboard(app); // fallback
  }
  else if (hash.startsWith("#service-entry")) renderServiceVisitSelector(app);
  else renderAdminDashboard(app); // fallback
}

window.addEventListener("hashchange", router);
window.addEventListener("load", () => {
  loadDb();
  registerServiceWorker();
  initializeAdminTheme();
  router();
});

function initializeAdminTheme() {
  const savedTheme = localStorage.getItem('adminTheme') || 'blue';

  document.body.classList.remove(
    'theme-blue', 'theme-green', 'theme-purple', 'theme-orange', 
    'theme-teal', 'theme-gold', 'theme-gray', 'theme-dark', 
    'theme-mint', 'theme-coral'
  );

  document.body.classList.add(`theme-${savedTheme}`);
}
