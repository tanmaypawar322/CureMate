const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface User {
  id: string;
  email: string;
  phone?: string;
  abhaId?: string;
  createdAt: string;
  updatedAt: string;
  memberships?: OrgMembership[];
}

export interface Organization {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'lab';
  subscriptionPlanId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMembership {
  id: string;
  userId: string;
  orgId: string;
  role: 'admin' | 'doctor' | 'pharmacy_owner' | 'lab_owner' | 'staff';
  organization: Organization;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class ApiClient {
  private static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('curemate_access_token');
  }

  private static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('curemate_refresh_token');
  }

  public static setTokens(accessToken: string, refreshToken: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('curemate_access_token', accessToken);
    localStorage.setItem('curemate_refresh_token', refreshToken);
  }

  public static clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('curemate_access_token');
    localStorage.removeItem('curemate_refresh_token');
  }

  public static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    activeOrgId?: string,
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (activeOrgId) {
      headers['x-org-id'] = activeOrgId;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Attempt token refresh once if unauthorized
    if (response.status === 401 && this.getRefreshToken() && !endpoint.includes('/auth/')) {
      const refreshToken = this.getRefreshToken();
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          this.setTokens(data.accessToken, data.refreshToken);
          headers['Authorization'] = `Bearer ${data.accessToken}`;

          response = await fetch(url, {
            ...options,
            headers,
          });
        } else {
          this.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } catch (_e) {
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.message && Array.isArray(data.message)
          ? data.message.join(', ')
          : data?.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return data as T;
  }

  // Auth endpoints
  static async signup(body: { email: string; password: string; phone?: string; abhaId?: string }): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  static async login(body: { email: string; password: string }): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  static async getMe(): Promise<User> {
    return this.request<User>('/me', {
      method: 'GET',
    });
  }

  // Organizations endpoints
  static async createOrganization(body: { name: string; type: string }): Promise<Organization> {
    return this.request<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
