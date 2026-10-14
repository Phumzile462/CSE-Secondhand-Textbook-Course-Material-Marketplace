# Campus Textbook Market

Secondhand Textbook & Course Material Marketplace: a static frontend plus serverless REST API
(Node.js) on Vercel, with a Postgres database and email/password login (JWT).

## What it does

- Sign up / log in (bcrypt-hashed passwords, 7-day JWT)
- Post a listing (title, course code, department, price in rand, condition, contact)
- Browse, search by title, filter by course code and department
- View seller contact (logged-in users only, available listings only)
- Mark as sold, change price, delete (owner or admin only, enforced on the server)
- Not included (per scope): payments, delivery, chat, ratings

## API (matches the Server API document)

| Method | Path | Auth |
|---|---|---|
| POST | /api/auth/register | no |
| POST | /api/auth/login | no |
| GET | /api/auth/me | yes |
| GET | /api/books?courseCode=&department=&status=&search= | no (no contact info returned) |
| POST | /api/books | yes |
| GET | /api/books/mine | yes |
| GET | /api/books/:id | no |
| PATCH | /api/books/:id | owner/admin |
| DELETE | /api/books/:id | owner/admin |
| PATCH | /api/books/:id/status | owner/admin |
| GET | /api/books/:id/contact | yes |

Differences from the document, made for its own security rules: the single-book endpoint does not
return `sellerContact` (use `/contact`, which needs login), and I added register/login, `mine` and DELETE.

## Deploy to Vercel

1. Create a GitHub repo and push this folder.
2. On vercel.com choose Add New → Project and import the repo (no build settings needed).
3. In the project, open Storage (or Marketplace) and add a Neon Postgres database. This adds a
   `DATABASE_URL` environment variable. (Any Postgres works: set `DATABASE_URL` yourself.)
4. Add environment variable `JWT_SECRET` with a long random string
   (generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
5. Redeploy. Tables are created automatically on the first request.

CLI alternative: `npm i -g vercel`, `vercel login`, `vercel`, `vercel env add DATABASE_URL`,
`vercel env add JWT_SECRET`, `vercel --prod`.

## Make an admin (optional)

After registering, run in the database SQL editor:
`UPDATE users SET role = 'admin' WHERE email = 'you@example.com';`

## Local run

```
npm i -g vercel
npm install
export DATABASE_URL="postgres://..."  JWT_SECRET="any-long-random-string"
vercel dev
```

## Still to do before real use

Rate limiting (e.g. Vercel Firewall or Upstash), automatic database backups (Neon provides branches/PITR),
and student-email verification.

