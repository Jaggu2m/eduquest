import {} from 'express';
import jwt from 'jsonwebtoken';
/**
 * requireAuth – verifies the Bearer JWT and attaches the decoded
 * payload to req.user. Returns 401 if the token is missing/invalid.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: missing or malformed Authorization header.' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Unauthorized: missing token.' });
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: 'Server misconfiguration: JWT_SECRET not set.' });
    return;
  }
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized: invalid or expired token.' });
  }
}
/**
 * requirePlatformAdmin – must be chained AFTER requireAuth.
 * Blocks access unless the JWT payload marks the user as a platform admin.
 */
export function requirePlatformAdmin(req, res, next) {
  if (!req.user?.isPlatformAdmin) {
    res.status(403).json({ message: 'Forbidden: platform admin access required.' });
    return;
  }
  next();
}
//# sourceMappingURL=auth.middleware.js.map
