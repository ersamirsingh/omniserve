import { OAuth2Client } from 'google-auth-library';

export interface IIdentityProvider {
  verifyToken(token: string): Promise<{
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
  }>;
}

export class GoogleProvider implements IIdentityProvider {
  private client: OAuth2Client;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    this.client = new OAuth2Client(clientId);
  }

  async verifyToken(token: string) {
    const audience = process.env.GOOGLE_CLIENT_ID;
    if (!audience) {
      throw new Error('Google Client ID is not configured on the server');
    }
    const ticket = await this.client.verifyIdToken({
      idToken: token,
      audience: audience,
    }) as any;
    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid token payload');
    }
    return {
      providerId: payload.sub,
      email: payload.email || '',
      firstName: payload.given_name || '',
      lastName: payload.family_name || '',
      emailVerified: !!payload.email_verified,
    };
  }
}
