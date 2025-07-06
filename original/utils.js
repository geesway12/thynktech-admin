// utils.js

// Date helpers
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

// Simple debounce for input fields
export function debounce(fn, ms = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// Basic ID/serial generator
export function randomSerial(length = 6) {
  return Math.floor(Math.random() * Math.pow(10, length));
}

// Quick CSV export helper
export function arrayToCSV(rows) {
  return rows.map(row =>
    row.map(cell =>
      (typeof cell === "string" && cell.includes(",")) ? `"${cell.replace(/"/g, '""')}"` : cell
    ).join(",")
  ).join("\r\n");
}
