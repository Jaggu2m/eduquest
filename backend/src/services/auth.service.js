import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthService {
  SALT_ROUNDS = 12;

  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  signToken(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');
    return jwt.sign(payload, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    });
  }

  // 'credentials' is already validated by Zod at the route level
  async register(credentials) {
    const existing = await this.userRepository.findByEmail(credentials.email);
    if (existing) {
      throw new Error('A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(credentials.password, this.SALT_ROUNDS);
    const user = await this.userRepository.create({
      email: credentials.email,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      passwordHash,
    });

    const token = this.signToken({
      userId: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPlatformAdmin: user.isPlatformAdmin,
      },
    };
  }

  // 'credentials' is already validated by Zod at the route level
  async login(credentials) {
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password.');
    }

    const token = this.signToken({
      userId: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPlatformAdmin: user.isPlatformAdmin,
      },
    };
  }
}

//# sourceMappingURL=auth.service.js.map
