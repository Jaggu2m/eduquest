import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { UserService } from '../services/user.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { requireAuth, requirePlatformAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { UpdateUserSchema } from '../schemas/index.js';
// ── Dependency Injection (Composition Root — wired once at startup) ────────────
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);
const router = Router();
// All routes below are platform-admin only.
router.use(requireAuth, requirePlatformAdmin);
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.patch('/:id', validate(UpdateUserSchema), userController.updateUser);
router.delete('/:id', userController.deactivateUser);
export default router;
//# sourceMappingURL=user.routes.js.map
