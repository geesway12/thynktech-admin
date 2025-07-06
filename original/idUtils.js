import { db } from './db.js';

/**
 * Generates a randomized patient ID based on:
 * - 2 letters from Region
 * - 3 letters from District
 * - 2 letters from Facility
 * - 6-digit random serial number
 * - All characters are mixed and shuffled
 * - Appended with last 2 digits of year from registration date
 * Example Output: "A2S0G6C1N2O5-22"
 */
export function generatePatientID(registrationDate = new Date()) {
  const region = db.facility?.regionName?.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || "RG";
  const district = db.facility?.districtName?.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || "DST";
  const facility = db.facility?.name?.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || "FC";

  let serial;
  do {
    serial = String(Math.floor(100000 + Math.random() * 900000)); // Ensure it's a string
  } while (db.patients && db.patients.some(p => p.patientID?.includes(serial)));

  // Merge all characters from region, district, facility, and serial
  const allChars = (region + district + facility + serial).split('');

  // Shuffle all characters
  for (let i = allChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allChars[i], allChars[j]] = [allChars[j], allChars[i]];
  }

  // Get last 2 digits of year from registration date (string or Date)
  let year;
  if (typeof registrationDate === 'string') {
    // Try to parse string as date
    const d = new Date(registrationDate);
    year = String(d.getFullYear()).slice(-2);
  } else {
    year = String(new Date(registrationDate).getFullYear()).slice(-2);
  }

  // Return ID with year appended, no dash
  return `${allChars.join('')}${year}`;
}
