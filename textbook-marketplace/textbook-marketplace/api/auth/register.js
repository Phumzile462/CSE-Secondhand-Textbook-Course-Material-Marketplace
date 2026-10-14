const bcrypt = require('bcryptjs');
const db = require('../../lib/db');
const { route, signToken, HttpError } = require('../../lib/http');
const { checkRegistration } = require('../../lib/validate');

module.exports = route({
  POST: async (req, res, body) => {
    const u = checkRegistration(body);
    const hash = await bcrypt.hash(u.password, 10);
    try {
      const r = await db.query(
        'INSERT INTO users (name, email, phone, password_hash) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role',
        [u.name, u.email, u.phone, hash]
      );
      const user = r.rows[0];
      return { status: 201, json: { token: signToken(user), user } };
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, 'EMAIL_TAKEN', 'An account with that email already exists.');
      throw e;
    }
  },
});
