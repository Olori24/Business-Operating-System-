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
    if (!user) return null;
    if (user.status !== 'active') return null;

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
    if (!token) return null;
    const sessions = this.sessionRepository.records;
    for (const session of sessions.values()) {
      if (session.token === token) return { ...session };
    }
    return null;
  }
}

module.exports = { AuthService };
