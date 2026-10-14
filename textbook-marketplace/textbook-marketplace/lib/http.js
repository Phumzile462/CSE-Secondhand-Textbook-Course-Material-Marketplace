const jwt = require('jsonwebtoken');

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
};

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, secret(), { expiresIn: '7d' });
}

function getUser(req, required = true) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    if (required) throw new HttpError(401, 'UNAUTHORIZED', 'Please log in first.');
    return null;
  }
  try {
    const p = jwt.verify(token, secret());
    return { id: p.sub, role: p.role, name: p.name };
  } catch {
    throw new HttpError(401, 'UNAUTHORIZED', 'Your session has expired. Please log in again.');
  }
}

function parseId(value) {
  if (!/^\d{1,9}$/.test(String(value))) throw new HttpError(400, 'INVALID_ID', 'The listing id is invalid.');
  return parseInt(value, 10);
}

// Wrap a handler: method routing, JSON errors, no internals leaked.
function route(methods) {
  return async (req, res) => {
    try {
      const fn = methods[req.method];
      if (!fn) {
        res.setHeader('Allow', Object.keys(methods).join(', '));
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const out = await fn(req, res, body);
      if (out) res.status(out.status || 200).json(out.json);
    } catch (e) {
      if (e instanceof HttpError) {
        return res.status(e.status).json({ error: { code: e.code, message: e.message } });
      }
      console.error(e);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' } });
    }
  };
}

module.exports = { HttpError, signToken, getUser, parseId, route };
