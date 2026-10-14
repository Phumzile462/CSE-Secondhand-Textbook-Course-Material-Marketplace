const db = require('../../lib/db');
const { route, getUser, HttpError } = require('../../lib/http');

module.exports = route({
  GET: async (req) => {
    const u = getUser(req);
    const r = await db.query('SELECT id, name, email, phone, role FROM users WHERE id = $1', [u.id]);
    if (!r.rows[0]) throw new HttpError(401, 'UNAUTHORIZED', 'Account no longer exists.');
    return { json: { user: r.rows[0] } };
  },
});
