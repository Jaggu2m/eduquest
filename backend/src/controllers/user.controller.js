export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  // GET /api/users  (platform admin only)
  getAllUsers = async (_req, res, next) => {
    try {
      const users = await this.userService.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/users/:id  (platform admin only)
  getUserById = async (req, res, next) => {
    try {
      const user = await this.userService.getUserById(req.params.id);
      if (!user) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }
      res.json(user);
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/users/:id — req.body already validated by Zod (UpdateUserSchema)
  updateUser = async (req, res, next) => {
    try {
      const user = await this.userService.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        res.status(404).json({ message });
        return;
      }
      next(error);
    }
  };

  // DELETE /api/users/:id  (platform admin only — soft deactivate, not hard delete)
  deactivateUser = async (req, res, next) => {
    try {
      await this.userService.deactivateUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        res.status(404).json({ message });
        return;
      }
      next(error);
    }
  };
}

//# sourceMappingURL=user.controller.js.map
