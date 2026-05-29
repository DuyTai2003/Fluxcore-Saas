// Direct Supabase Auth API calls — bypasses @supabase/supabase-js client
// which hangs on Vercel for unknown reasons (works fine via fetch)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface SignInResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    // ... other fields
  };
}

interface SignUpResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
}

interface SessionResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
}

class SupabaseAuthError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'SupabaseAuthError';
    this.code = code;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new SupabaseAuthError(body.msg || body.message || 'Request failed', res.status);
  }

  return body as T;
}

export async function signInWithPassword(email: string, password: string): Promise<SignInResponse> {
  return apiFetch<SignInResponse>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signUpWithPassword(email: string, password: string): Promise<SignUpResponse> {
  return apiFetch<SignUpResponse>('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshSession(refreshToken: string): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function getSession(accessToken: string): Promise<{ id: string; email: string }> {
  return apiFetch<{ id: string; email: string }>('/auth/v1/user', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}

export async function signOut(accessToken: string): Promise<void> {
  await apiFetch<void>('/auth/v1/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}
