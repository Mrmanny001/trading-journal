const crypto = require('crypto');
const store = require('../lib/store');
const { hashPassword, verifyPassword, generateToken, tokenExpiry, isValidEmail } = require('../lib/auth');
const { sendJson } = require('../lib/http-utils');

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

async function handleSignup(req, res, { body }) {
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!name || name.length < 2) {
    return sendJson(res, 400, { error: 'Enter a name with at least 2 characters.' });
  }
  if (!isValidEmail(email)) {
    return sendJson(res, 400, { error: 'Enter a valid email address.' });
  }
  if (!password || password.length < 6) {
    return sendJson(res, 400, { error: 'Password must be at least 6 characters.' });
  }

  const result = await store.update((db) => {
    const existing = db.users.find((u) => u.email === email);
    if (existing) {
      return { error: 'An account with that email already exists.' };
    }
    const { salt, hash } = hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      salt,
      hash,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);

    const token = generateToken();
    db.tokens[token] = { userId: user.id, expiresAt: tokenExpiry() };

    return { user, token };
  });

  if (result.error) return sendJson(res, 409, { error: result.error });
  return sendJson(res, 201, { user: publicUser(result.user), token: result.token });
}

async function handleLogin(req, res, { body }) {
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  const db = store.readDb();
  const user = db.users.find((u) => u.email === email);

  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return sendJson(res, 401, { error: 'Incorrect email or password.' });
  }

  const token = generateToken();
  await store.update((db2) => {
    db2.tokens[token] = { userId: user.id, expiresAt: tokenExpiry() };
  });

  return sendJson(res, 200, { user: publicUser(user), token });
}

async function handleMe(req, res, { user }) {
  return sendJson(res, 200, { user: publicUser(user) });
}

async function handleLogout(req, res, { token }) {
  await store.update((db) => {
    delete db.tokens[token];
  });
  return sendJson(res, 200, { ok: true });
}

module.exports = { handleSignup, handleLogin, handleMe, handleLogout, publicUser };
