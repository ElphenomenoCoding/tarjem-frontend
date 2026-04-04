import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AnalyticsService } from './analytics.service';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
}

export interface BaseApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  profilePicUrl: string;
  wilaya: string;
  address: string;
  preferredLanguage: string;
  lastLoginAt: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = '/api/v1/auth';
  private readonly TOKEN_KEY = 'tarjem_token';
  private readonly REFRESH_KEY = 'tarjem_refresh';
  private readonly USER_KEY = 'tarjem_user';

  currentUser = signal<AuthResponse | null>(this.loadUser());
  isAuthenticated = computed(() => !!this.currentUser());
  userRole = computed(() => this.currentUser()?.role ?? null);

  private readonly analytics = inject(AnalyticsService);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    const user = this.currentUser();
    if (user) {
      this.analytics.identify(user.userId, { email: user.email, role: user.role, name: `${user.firstName} ${user.lastName}` });
    }
  }

  registerClient(data: Record<string, string>): Observable<BaseApiResponse<AuthResponse>> {
    return this.http
      .post<BaseApiResponse<AuthResponse>>(`${this.API}/register/client`, data)
      .pipe(tap((res) => this.handleAuth(res.data)));
  }

  registerTranslator(data: Record<string, string>): Observable<BaseApiResponse<AuthResponse>> {
    return this.http
      .post<BaseApiResponse<AuthResponse>>(`${this.API}/register/translator`, data)
      .pipe(tap((res) => this.handleAuth(res.data)));
  }

  login(email: string, password: string): Observable<BaseApiResponse<AuthResponse>> {
    return this.http
      .post<BaseApiResponse<AuthResponse>>(`${this.API}/login`, { email, password })
      .pipe(tap((res) => this.handleAuth(res.data)));
  }

  logout(): void {
    this.analytics.reset();
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getMe(): Observable<BaseApiResponse<UserProfile>> {
    return this.http.get<BaseApiResponse<UserProfile>>(`${this.API}/me`);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<BaseApiResponse<void>> {
    return this.http.patch<BaseApiResponse<void>>(`${this.API}/me/password`, {
      currentPassword,
      newPassword,
    });
  }

  verifyEmail(code: string): Observable<BaseApiResponse<{ success: boolean }>> {
    return this.http
      .post<BaseApiResponse<{ success: boolean }>>(`${this.API}/verify-email`, { code })
      .pipe(
        tap(() => {
          const user = this.currentUser();
          if (user) {
            const updated = { ...user, emailVerified: true };
            localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
            this.currentUser.set(updated);
          }
        }),
      );
  }

  resendVerification(): Observable<BaseApiResponse<{ success: boolean }>> {
    return this.http.post<BaseApiResponse<{ success: boolean }>>(`${this.API}/resend-verification`, {});
  }

  get isEmailVerified(): boolean {
    return this.currentUser()?.emailVerified ?? false;
  }

  private handleAuth(auth: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, auth.accessToken);
    localStorage.setItem(this.REFRESH_KEY, auth.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(auth));
    this.currentUser.set(auth);
    this.analytics.identify(auth.userId, { email: auth.email, role: auth.role, name: `${auth.firstName} ${auth.lastName}` });
  }

  private loadUser(): AuthResponse | null {
    const stored = localStorage.getItem(this.USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }
}
