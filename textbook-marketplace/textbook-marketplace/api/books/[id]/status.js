const db = require('../../../lib/db');
const { route, getUser, parseId, HttpError } = require('../../../lib/http');
const { bad } = require('../../../lib/validate');

module.exports = route({
  PATCH: async (req, res, body) => {
    const user = getUser(req);
    const id = parseId(req.query.id);
    if (body.status !== 'Sold') throw bad('Status must be "Sold".');

    const r = await db.query('SELECT seller_id, status FROM books WHERE id = $1', [id]);
    const book = r.rows[0];
    if (!book) throw new HttpError(404, 'NOT_FOUND', 'Listing not found.');
    if (book.seller_id !== user.id && user.role !== 'admin') {
      throw new HttpError(403, 'FORBIDDEN', 'You can only change your own listings.');
    }
    if (book.status === 'Sold') throw new HttpError(409, 'ALREADY_SOLD', 'This listing is already marked as sold.');

    await db.query("UPDATE books SET status = 'Sold', updated_at = NOW() WHERE id = $1", [id]);
    return { json: { message: 'Book marked as sold', status: 'Sold' } };
  },
});
