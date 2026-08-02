// Token localStorage'da tutuluyor; XSS durumunda çalınabilir. Üretimde httpOnly cookie +
// CSRF token tercih edilmeli. Bu bilinçli bir MVP kararı.

const TOKEN_KEY = "localshop_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // private mode / kota hatası: token bellekte tutulamaz, kullanıcı oturumu bu
    // sekme yenilenene kadar sürer, sessizce yutulur.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // no-op
  }
}
