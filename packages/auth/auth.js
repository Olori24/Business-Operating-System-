class AuthService {
  constructor({ userRepository, sessionRepository, tokenGenerator }) {
    if (!userRepository || !sessionRepository || !tokenGenerator) {
      throw new TypeError('AuthService requires repositories and token generator');
    }
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
  }

  async createSession({ userId, organizationId }) {
    const user = await this.userRepository.find('user', userId);
    if (!user || user.status !== 'active') return null;

    const token = await this.tokenGenerator.generate();
    const session = {
      id: token.id,
      token: token.value,
      userId,
      organizationId,
      createdAt: new Date().toISOString()
    };

    await this.sessionRepository.save('session', session.id, session);
    return session;
  }

  async authenticate(token) {
    if (!token || typeof this.sessionRepository.findByToken !== 'function') return null;
    return this.sessionRepository.findByToken(token);
  }
}

module.exports = { AuthService };
