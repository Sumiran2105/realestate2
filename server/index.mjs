import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.PORT || 4000);
const DB_FILE = resolve(process.cwd(), 'server/data/db.json');
const OTP_CODE = '123456';
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const withoutPassword = (user) => {
  const { password, ...safe } = user;
  return safe;
};

const readDb = () => JSON.parse(readFileSync(DB_FILE, 'utf8'));
const writeDb = (db) => writeFileSync(DB_FILE, `${JSON.stringify(db, null, 2)}\n`, 'utf8');

const send = (res, status, payload, origin) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Credentials': 'true',
  });
  res.end(JSON.stringify(payload));
};

const parseBody = (req) =>
  new Promise((resolveBody, rejectBody) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        rejectBody(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(raw));
      } catch {
        rejectBody(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', rejectBody);
  });

const getAuthUser = (req, db) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  const session = db.sessions.find((item) => item.token === token);
  if (!session) return null;

  const user = db.users.find((item) => item.id === session.userId);
  if (!user) return null;

  return { token, user };
};

const nextNumericId = (items) => {
  const max = items.reduce((acc, item) => Math.max(acc, Number(item.id) || 0), 0);
  return max + 1;
};

const normalizeRole = (role) => {
  if (role === 'admin' || role === 'agent') return role;
  return 'user';
};

const isAllowedOrigin = (origin) => !origin || allowedOrigins.has(origin);

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const corsOrigin = isAllowedOrigin(origin) ? origin : null;

  if (req.method === 'OPTIONS') {
    if (!isAllowedOrigin(origin)) {
      send(res, 403, { success: false, message: 'CORS origin blocked' });
      return;
    }

    res.writeHead(204, {
      ...(corsOrigin ? { 'Access-Control-Allow-Origin': corsOrigin } : {}),
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    });
    res.end();
    return;
  }

  if (!isAllowedOrigin(origin)) {
    send(res, 403, { success: false, message: 'CORS origin blocked' }, corsOrigin);
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      send(res, 200, { success: true, message: 'API server is running' }, corsOrigin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await parseBody(req);
      const { name, email, phone, password, role } = body;

      if (!name || !email || !phone || !password || !role) {
        send(res, 400, { success: false, message: 'Missing required fields' }, corsOrigin);
        return;
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const normalizedPhone = String(phone).trim();
      const db = readDb();

      if (db.users.some((user) => user.email === normalizedEmail)) {
        send(res, 409, { success: false, message: 'Email already registered' }, corsOrigin);
        return;
      }

      db.pendingRegistrations = db.pendingRegistrations.filter((item) => item.email !== normalizedEmail);
      db.pendingRegistrations.push({
        id: randomUUID(),
        name: String(name).trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        password: String(password),
        role: normalizeRole(role),
        emailOtp: OTP_CODE,
        phoneOtp: OTP_CODE,
        createdAt: new Date().toISOString(),
      });
      writeDb(db);

      send(
        res,
        200,
        {
          success: true,
          message: 'Registration initiated. Please verify OTP.',
          otpHint: process.env.NODE_ENV === 'production' ? undefined : OTP_CODE,
        },
        corsOrigin
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/resend-otp') {
      const body = await parseBody(req);
      const email = String(body.email || '').toLowerCase().trim();

      if (!email) {
        send(res, 400, { success: false, message: 'Email is required' }, corsOrigin);
        return;
      }

      const db = readDb();
      const pending = db.pendingRegistrations.find((item) => item.email === email);
      if (!pending) {
        send(res, 404, { success: false, message: 'Registration session not found' }, corsOrigin);
        return;
      }

      pending.emailOtp = OTP_CODE;
      pending.phoneOtp = OTP_CODE;
      writeDb(db);

      send(
        res,
        200,
        {
          success: true,
          message: 'OTP resent successfully',
          otpHint: process.env.NODE_ENV === 'production' ? undefined : OTP_CODE,
        },
        corsOrigin
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/verify-otp') {
      const body = await parseBody(req);
      const email = String(body.email || '').toLowerCase().trim();
      const phone = String(body.phone || '').trim();
      const emailOtp = String(body.emailOtp || '');
      const phoneOtp = String(body.phoneOtp || '');

      const db = readDb();
      const pending = db.pendingRegistrations.find((item) => item.email === email && item.phone === phone);
      if (!pending) {
        send(res, 404, { success: false, message: 'Registration session not found' }, corsOrigin);
        return;
      }

      if (pending.emailOtp !== emailOtp || pending.phoneOtp !== phoneOtp) {
        send(res, 401, { success: false, message: 'Invalid OTP' }, corsOrigin);
        return;
      }

      const newUser = {
        id: nextNumericId(db.users),
        name: pending.name,
        email: pending.email,
        phone: pending.phone,
        password: pending.password,
        role: normalizeRole(pending.role),
        kycStatus: 'not_started',
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date().toISOString(),
      };

      db.users.push(newUser);
      db.pendingRegistrations = db.pendingRegistrations.filter((item) => item.email !== pending.email);
      writeDb(db);

      send(
        res,
        200,
        { success: true, message: 'Verification successful! Please login.', user: withoutPassword(newUser) },
        corsOrigin
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await parseBody(req);
      const email = String(body.email || '').toLowerCase().trim();
      const password = String(body.password || '');

      const db = readDb();
      const user = db.users.find((item) => item.email === email);

      if (!user || user.password !== password) {
        send(res, 401, { success: false, message: 'Invalid credentials' }, corsOrigin);
        return;
      }

      const normalizedRole = normalizeRole(user.role);
      if (normalizedRole !== user.role) {
        user.role = normalizedRole;
        writeDb(db);
      }

      const token = randomUUID();
      db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
      writeDb(db);

      send(res, 200, { success: true, token, user: withoutPassword(user) }, corsOrigin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const db = readDb();
      const auth = getAuthUser(req, db);

      if (!auth) {
        send(res, 401, { success: false, message: 'Unauthorized' }, corsOrigin);
        return;
      }

      const normalizedRole = normalizeRole(auth.user.role);
      if (normalizedRole !== auth.user.role) {
        auth.user.role = normalizedRole;
        writeDb(db);
      }

      send(res, 200, { success: true, user: withoutPassword(auth.user) }, corsOrigin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const db = readDb();
      const auth = getAuthUser(req, db);

      if (auth) {
        db.sessions = db.sessions.filter((item) => item.token !== auth.token);
        writeDb(db);
      }

      send(res, 200, { success: true }, corsOrigin);
      return;
    }

    if (req.method === 'PATCH' && url.pathname === '/api/users/me/kyc-status') {
      const body = await parseBody(req);
      const nextStatus = String(body.status || '').trim();
      if (!nextStatus) {
        send(res, 400, { success: false, message: 'Status is required' }, corsOrigin);
        return;
      }

      const db = readDb();
      const auth = getAuthUser(req, db);
      if (!auth) {
        send(res, 401, { success: false, message: 'Unauthorized' }, corsOrigin);
        return;
      }

      const currentUser = db.users.find((item) => item.id === auth.user.id);
      currentUser.kycStatus = nextStatus;
      writeDb(db);

      send(res, 200, { success: true, user: withoutPassword(currentUser) }, corsOrigin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/listings') {
      const db = readDb();
      const sellerId = url.searchParams.get('sellerId');

      const listings = sellerId
        ? db.sellerListings.filter((item) => String(item.sellerId) === String(sellerId))
        : db.sellerListings;

      send(res, 200, { success: true, listings }, corsOrigin);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/listings/')) {
      const listingId = url.pathname.split('/').pop();
      const db = readDb();
      const listing = db.sellerListings.find((item) => String(item.id) === String(listingId));

      if (!listing) {
        send(res, 404, { success: false, message: 'Listing not found' }, corsOrigin);
        return;
      }

      send(res, 200, { success: true, listing }, corsOrigin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/listings') {
      const body = await parseBody(req);
      const db = readDb();
      const auth = getAuthUser(req, db);

      if (!auth) {
        send(res, 401, { success: false, message: 'Unauthorized' }, corsOrigin);
        return;
      }

      if (!['agent', 'admin'].includes(auth.user.role)) {
        send(res, 403, { success: false, message: 'Only agent/admin can create listings' }, corsOrigin);
        return;
      }

      const listing = {
        ...body,
        id: nextNumericId(db.sellerListings),
        sellerId: auth.user.id,
        sellerName: auth.user.name,
        status: body.status || 'under_review',
        views: body.views || 0,
        inquiries: body.inquiries || 0,
        listedDate: body.listedDate || new Date().toISOString().split('T')[0],
      };

      db.sellerListings.unshift(listing);
      writeDb(db);

      send(res, 201, { success: true, listing }, corsOrigin);
      return;
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/listings/')) {
      const listingId = url.pathname.split('/').pop();
      const body = await parseBody(req);
      const db = readDb();
      const auth = getAuthUser(req, db);

      if (!auth) {
        send(res, 401, { success: false, message: 'Unauthorized' }, corsOrigin);
        return;
      }

      const index = db.sellerListings.findIndex((item) => String(item.id) === String(listingId));
      if (index === -1) {
        send(res, 404, { success: false, message: 'Listing not found' }, corsOrigin);
        return;
      }

      const listing = db.sellerListings[index];
      const canManage = auth.user.role === 'admin' || String(listing.sellerId) === String(auth.user.id);
      if (!canManage) {
        send(res, 403, { success: false, message: 'Forbidden' }, corsOrigin);
        return;
      }

      const updated = { ...listing, ...body, id: listing.id, sellerId: listing.sellerId, sellerName: listing.sellerName };
      db.sellerListings[index] = updated;
      writeDb(db);

      send(res, 200, { success: true, listing: updated }, corsOrigin);
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/listings/')) {
      const listingId = url.pathname.split('/').pop();
      const db = readDb();
      const auth = getAuthUser(req, db);

      if (!auth) {
        send(res, 401, { success: false, message: 'Unauthorized' }, corsOrigin);
        return;
      }

      const listing = db.sellerListings.find((item) => String(item.id) === String(listingId));
      if (!listing) {
        send(res, 404, { success: false, message: 'Listing not found' }, corsOrigin);
        return;
      }

      const canManage = auth.user.role === 'admin' || String(listing.sellerId) === String(auth.user.id);
      if (!canManage) {
        send(res, 403, { success: false, message: 'Forbidden' }, corsOrigin);
        return;
      }

      db.sellerListings = db.sellerListings.filter((item) => String(item.id) !== String(listingId));
      writeDb(db);

      send(res, 200, { success: true }, corsOrigin);
      return;
    }

    send(res, 404, { success: false, message: 'Route not found' }, corsOrigin);
  } catch (error) {
    send(res, 500, { success: false, message: error.message || 'Internal server error' }, corsOrigin);
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server running on http://localhost:${PORT}`);
});
