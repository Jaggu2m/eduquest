import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { RegisterSchema, LoginSchema } from '../schemas/index.js';
import { authLimiter } from '../middleware/rate-limit.middleware.js';

// ── Dependency injection (wired once at startup) ──────────────────────────────
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);
const router = Router();

// POST /api/auth/register
router.post('/register', authLimiter, validate(RegisterSchema), authController.register);

// POST /api/auth/login
router.post('/login', authLimiter, validate(LoginSchema), authController.login);
// GET  /api/auth/me  (protected)
router.get('/me', requireAuth, authController.me);
export default router;
//# sourceMappingURL=auth.routes.js.map
