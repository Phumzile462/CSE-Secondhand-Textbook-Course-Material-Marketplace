const db = require('../../lib/db');
const { route, getUser } = require('../../lib/http');

// Authenticated: the signed-in seller's own listings (all statuses).
module.exports = route({
  GET: async (req) => {
    const user = getUser(req);
    const r = await db.query(
      `SELECT id, title, course_code AS "courseCode", department, price::float AS price, condition, status,
              seller_name AS "sellerName", seller_contact AS "sellerContact", created_at AS "createdAt"
       FROM books WHERE seller_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );
    return { json: { books: r.rows } };
  },
});
