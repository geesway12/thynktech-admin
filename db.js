export const db = {
  facility: null,
  users: [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "nurse1", password: "nursepass", role: "nurse" }
  ],
  roles: [
    { name: "Admin", permissions: ["all"] },
    { name: "Nurse", permissions: ["patient-reg", "visit-log", "service-entry"] },
    { name: "Records", permissions: ["patient-reg", "visit-log", "reports"] },
    { name: "Clinician", permissions: ["service-entry"] }
  ],
  patients: [], // Each patient: { patientID, surname, otherNames, dob, sex, phone, address, idType, idNumber, age, customFields }
  visits: [],
  registers: [],
  serviceEntries: {},
  appointments: [],
  servicesList: ["OPD", "ANC", "Immunization", "Lab"],
  currentUser: null,
  customPatientFields: []
};

export function saveDb() {
  localStorage.setItem("afya_db", JSON.stringify(db));
}

export function loadDb() {
  const stored = localStorage.getItem("afya_db");
  if (stored) {
    const loaded = JSON.parse(stored);
    Object.keys(db).forEach(key => {
      db[key] = loaded[key] !== undefined ? loaded[key] : db[key];
    });
  }

  db.patients = db.patients || [];
  db.visits = db.visits || [];
  db.registers = db.registers || [];
  db.serviceEntries = db.serviceEntries || {};
  db.appointments = db.appointments || [];
  db.users = db.users || [];
  db.roles = db.roles || [];
  db.servicesList = db.servicesList || [];
  db.customPatientFields = db.customPatientFields || [];
}

