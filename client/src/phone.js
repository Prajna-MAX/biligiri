// Mirrors server/utils/phone.js: Indian mobile, optional +91 / 91 / 0 prefix.
export function normalizePhone(value = '') {
  let digits = value.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export const isValidPhone = (value) => /^[6-9]\d{9}$/.test(normalizePhone(value));

export const formatPhone = (p) => (p && p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p);
