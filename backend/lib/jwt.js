const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
const SESSION_TTL = "30d";

function issueSession(userId, email) {
  if (!SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ sub: userId, email }, SECRET, { expiresIn: SESSION_TTL });
}

function verifySession(token) {
  if (!SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.verify(token, SECRET); // throws on invalid/expired
}

function userFromEvent(event) {
  const header = (event.headers && (event.headers.Authorization || event.headers.authorization)) || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  try {
    return verifySession(match[1]);
  } catch (_) {
    return null;
  }
}

module.exports = { issueSession, verifySession, userFromEvent };
