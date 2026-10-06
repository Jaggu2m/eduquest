import {} from 'express';

export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = async (req, res, next) => {
    try {
      // req.body already validated by Zod (RegisterSchema) at route level
      const result = await this.authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      if (message.includes('already exists')) {
        res.status(409).json({ message });
        return;
      }
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      // req.body already validated by Zod (LoginSchema) at route level
      const result = await this.authService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      if (message.includes('Invalid email or password')) {
        res.status(401).json({ message });
        return;
      }
      next(error);
    }
  };

  // Returns the currently authenticated user (pulled from req.user by requireAuth middleware)
  me = async (req, res, _next) => {
    res.status(200).json({ user: req.user });
  };
}

//# sourceMappingURL=auth.controller.js.map
