const bcrypt = require('bcryptjs');
const db = require('../../lib/db');
const { route, signToken, HttpError } = require('../../lib/http');
const { checkEmail } = require('../../lib/validate');

module.exports = route({
  POST: async (req, res, body) => {
    const email = checkEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const r = await db.query('SELECT id, name, email, role, password_hash FROM users WHERE email = $1', [email]);
    const row = r.rows[0];
    const ok = row && (await bcrypt.compare(password, row.password_hash));
    if (!ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    return { json: { token: signToken(user), user } };
  },
});
