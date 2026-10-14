const db = require('../../lib/db');
const { route, getUser } = require('../../lib/http');
const { checkListing } = require('../../lib/validate');

const PUBLIC = `id, title, course_code AS "courseCode", department, price::float AS price,
  condition, status, created_at AS "createdAt"`;

module.exports = route({
  // Public: browse / search / filter. Contact details are never included.
  GET: async (req) => {
    const q = req.query || {};
    const where = [];
    const params = [];
    const add = (sql, val) => { params.push(val); where.push(sql.replace('?', '$' + params.length)); };

    const status = (q.status || 'Available').toString();
    if (['Available', 'Sold'].includes(status)) add('status = ?', status);
    if (q.courseCode) add('course_code ILIKE ?', String(q.courseCode).trim().slice(0, 30) + '%');
    if (q.department) add('department ILIKE ?', '%' + String(q.department).trim().slice(0, 120) + '%');
    if (q.search) add('title ILIKE ?', '%' + String(q.search).trim().slice(0, 200) + '%');

    const sql = `SELECT ${PUBLIC} FROM books ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY created_at DESC LIMIT 200`;
    const r = await db.query(sql, params);
    return { json: { books: r.rows } };
  },

  // Authenticated: create a listing. id, status and timestamps are server-controlled.
  POST: async (req, res, body) => {
    const user = getUser(req);
    const b = checkListing(body);
    const r = await db.query(
      `INSERT INTO books (seller_id, title, course_code, department, price, condition, seller_name, seller_contact)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING ${PUBLIC}`,
      [user.id, b.title, b.courseCode, b.department, b.price, b.condition, b.sellerName, b.sellerContact]
    );
    return { status: 201, json: { message: 'Book listing created successfully', book: r.rows[0] } };
  },
});
