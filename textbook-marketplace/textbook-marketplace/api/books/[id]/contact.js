const db = require('../../../lib/db');
const { route, getUser, parseId, HttpError } = require('../../../lib/http');

// Contact details are only shown to logged-in users, and only for available listings.
module.exports = route({
  GET: async (req) => {
    getUser(req);
    const id = parseId(req.query.id);
    const r = await db.query('SELECT seller_name, seller_contact, status FROM books WHERE id = $1', [id]);
    const book = r.rows[0];
    if (!book) throw new HttpError(404, 'NOT_FOUND', 'Listing not found.');
    if (book.status === 'Sold') throw new HttpError(409, 'ALREADY_SOLD', 'This book has already been sold.');
    return { json: { sellerName: book.seller_name, sellerContact: book.seller_contact } };
  },
});
