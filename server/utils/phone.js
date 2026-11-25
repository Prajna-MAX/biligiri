// Indian mobile numbers: 10 digits starting with 6-9, optionally prefixed with +91, 91 or 0.
// Stored normalised as the bare 10 digits.
const PHONE_RE = /^[6-9]\d{9}$/;

function normalizePhone(value) {
  if (value == null) return value;
  let digits = String(value).replace(/[\s\-()]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

const isValidPhone = (value) => PHONE_RE.test(normalizePhone(value) || '');

module.exports = { normalizePhone, isValidPhone };
