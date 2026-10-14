const { HttpError } = require('./http');

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const bad = (msg) => new HttpError(400, 'VALIDATION_ERROR', msg);

function checkEmail(v) {
  const e = str(v).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 255) throw bad('A valid email address is required.');
  return e;
}

function checkPhone(v, required = true) {
  const p = str(v);
  if (!p && !required) return null;
  if (!/^[+\d][\d\s-]{6,19}$/.test(p)) throw bad('A valid phone number is required (digits, e.g. 0712345678).');
  return p;
}

function checkRegistration(b) {
  const name = str(b.name);
  if (!name || name.length > 100) throw bad('Your name is required.');
  const password = typeof b.password === 'string' ? b.password : '';
  if (password.length < 8 || password.length > 72) throw bad('Password must be 8 to 72 characters.');
  return { name, email: checkEmail(b.email), phone: checkPhone(b.phone, false), password };
}

function checkPrice(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) throw bad('Enter a valid price greater than 0.');
  return Math.round(n * 100) / 100;
}

function checkCondition(v) {
  if (!CONDITIONS.includes(v)) throw bad('Condition must be one of: ' + CONDITIONS.join(', ') + '.');
  return v;
}

function checkListing(b) {
  const title = str(b.title);
  const courseCode = str(b.courseCode).toUpperCase();
  const department = str(b.department);
  const sellerName = str(b.sellerName);
  if (!title) throw bad('The book title is required.');
  if (title.length > 200) throw bad('The book title is too long.');
  if (!courseCode || courseCode.length > 30) throw bad('A course code is required.');
  if (!department || department.length > 120) throw bad('The department is required.');
  if (!sellerName || sellerName.length > 100) throw bad('The seller name is required.');
  return {
    title,
    courseCode,
    department,
    price: checkPrice(b.price),
    condition: checkCondition(b.condition),
    sellerName,
    sellerContact: checkPhone(b.sellerContact),
  };
}

module.exports = { CONDITIONS, str, checkRegistration, checkEmail, checkPrice, checkCondition, checkListing, bad };
