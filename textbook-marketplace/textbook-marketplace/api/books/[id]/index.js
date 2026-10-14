const db = require('../../../lib/db');
const { route, getUser, parseId, HttpError } = require('../../../lib/http');
const { checkPrice, checkCondition, str, bad } = require('../../../lib/validate');

const PUBLIC = `id, title, course_code AS "courseCode", department, price::float AS price,
  condition, status, created_at AS "createdAt", updated_at AS "updatedAt"`;

async function loadOwned(req, id) {
  const user = getUser(req);
  const r = await db.query('SELECT seller_id FROM books WHERE id = $1', [id]);
  if (!r.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Listing not found.');
  if (r.rows[0].seller_id !== user.id && user.role !== 'admin') {
    throw new HttpError(403, 'FORBIDDEN', 'You can only change your own listings.');
  }
}

module.exports = route({
  GET: async (req) => {
    const id = parseId(req.query.id);
    const r = await db.query(`SELECT ${PUBLIC} FROM books WHERE id = $1`, [id]);
    if (!r.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Listing not found.');
    return { json: r.rows[0] };
  },

  PATCH: async (req, res, body) => {
    const id = parseId(req.query.id);
    await loadOwned(req, id);
    const sets = [];
    const params = [];
    const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };

    if (body.price !== undefined) add('price', checkPrice(body.price));
    if (body.condition !== undefined) add('condition', checkCondition(body.condition));
    if (body.title !== undefined) { const t = str(body.title); if (!t || t.length > 200) throw bad('The book title is required.'); add('title', t); }
    if (body.courseCode !== undefined) { const c = str(body.courseCode).toUpperCase(); if (!c || c.length > 30) throw bad('A course code is required.'); add('course_code', c); }
    if (body.department !== undefined) { const d = str(body.department); if (!d || d.length > 120) throw bad('The department is required.'); add('department', d); }
    if (!sets.length) throw bad('Nothing to update.');

    params.push(id);
    await db.query(`UPDATE books SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
    return { json: { message: 'Book listing updated successfully' } };
  },

  DELETE: async (req) => {
    const id = parseId(req.query.id);
    await loadOwned(req, id);
    await db.query('DELETE FROM books WHERE id = $1', [id]);
    return { json: { message: 'Book listing deleted' } };
  },
});
