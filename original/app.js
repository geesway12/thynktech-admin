import { db, saveDb, loadDb } from './db.js';
import { registerServiceWorker } from './pwa.js';
import { renderLogin } from './auth.js';
import { renderFacilitySetup, renderAdminDashboard, renderUserManagement, renderAdminExportBackupPage } from './admin.js';
import { renderProfile } from './utils.profile.js';
import { renderPatientList } from './patients.js';
import { renderVisitLog } from './visits.js';
import { renderRegisterMgmt } from './registers.js';
import { renderReports } from './reports.js';
import { renderServiceVisitSelector, renderServiceEntry } from './services.js';
import { renderAppointmentForm } from './appointments.js';

function router() {
  const app = document.getElementById('app');
  // 1. Facility setup (first run)
  if (!db.facility) {
    window.location.hash = "#facility-setup";
    renderFacilitySetup(app);
    return;
  }
  // 2. Admin account creation (first run)
  if (!db.users || db.users.length === 0) {
    window.location.hash = "#admin-setup";
    // If you have a setup function, import and call it here. Otherwise, skip.
    // renderAdminAccountSetup(app);
    return;
  }
  // 3. Login screen if not logged in
  if (!db.currentUser) {
    window.location.hash = "#login";
    renderLogin(app);
    return;
  }
  // 4. Authenticated: route to dashboard or features
  const hash = window.location.hash;
  if (hash === "#facility-setup") renderFacilitySetup(app);
  // else if (hash === "#admin-setup") renderAdminAccountSetup(app); // Remove or implement if needed
  else if (hash === "#login") renderLogin(app);
  else if (hash === "#admin-dashboard" || hash === "") renderAdminDashboard(app);
  else if (hash === "#profile") {
    renderProfile(app, {
      dashboardHash: '#admin-dashboard',
      getUser: () => db.currentUser,
      updateUser: (user) => {
        // Update in db.users array
        const idx = db.users.findIndex(u => u.username === user.username);
        if (idx !== -1) db.users[idx] = { ...db.users[idx], ...user };
        db.currentUser = user;
        saveDb();
      },
      fieldLabels: {
        fullName: 'Full Name',
        contact: 'Contact Number',
      }
    });
  }
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
  router();
});
