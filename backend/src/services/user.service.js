// ── Implementation ────────────────────────────────────────────────────────────
export class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  // Strip passwordHash before returning — never expose it over HTTP
  sanitize(user) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  async getAllUsers() {
    const users = await this.userRepository.findAll();
    return users.map(this.sanitize);
  }

  async getUserById(id) {
    const user = await this.userRepository.findById(id);
    return user ? this.sanitize(user) : null;
  }

  // 'updates' is already validated + stripped by Zod at the route level
  async updateUser(id, updates) {
    const existing = await this.userRepository.findById(id);
    if (!existing) throw new Error('User not found.');

    const updated = await this.userRepository.update(id, updates);
    return this.sanitize(updated);
  }

  async deactivateUser(id) {
    const existing = await this.userRepository.findById(id);
    if (!existing) throw new Error('User not found.');
    // Platform-level deactivation: mark email as unverified to block login
    await this.userRepository.update(id, { isEmailVerified: false });
  }
}

//# sourceMappingURL=user.service.js.map
