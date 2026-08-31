let accessToken: string | null = null;

export function setStoredAccessToken(token: string | null): void {
  accessToken = token;
}

export async function getStoredAccessToken(): Promise<string | null> {
  return accessToken;
}
