import { Injectable, computed, signal } from "@angular/core";

const TOKEN_KEY = "deploy_access_token";
const REFRESH_KEY = "deploy_refresh_token";
const USER_KEY = "deploy_user";
const COMPANY_KEY = "deploy_company";

export interface CompanyInfo {
  id: number;
  name: string;
  businessType?: "retail" | "restaurant";
}

@Injectable({ providedIn: "root" })
export class AuthStore {
  private userSignal = signal<any>(this.load(USER_KEY));
  private companySignal = signal<CompanyInfo | null>(this.load(COMPANY_KEY));
  private tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private refreshSignal = signal<string | null>(
    localStorage.getItem(REFRESH_KEY),
  );

  user = this.userSignal.asReadonly();
  company = this.companySignal.asReadonly();
  accessToken = this.tokenSignal.asReadonly();
  refreshToken = this.refreshSignal.asReadonly();
  isLoggedIn = computed(() => !!this.tokenSignal());

  setSession(
    user: any,
    access: string,
    refresh: string,
    company?: CompanyInfo | null,
  ): void {
    this.userSignal.set(user);
    this.tokenSignal.set(access);
    this.refreshSignal.set(refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    if (company) {
      this.companySignal.set(company);
      localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
    }
  }

  updateTokens(access: string, refresh: string): void {
    this.tokenSignal.set(access);
    this.refreshSignal.set(refresh);
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }

  updateUser(user: any): void {
    this.userSignal.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    this.userSignal.set(null);
    this.companySignal.set(null);
    this.tokenSignal.set(null);
    this.refreshSignal.set(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(COMPANY_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  isTokenExpiringSoon(thresholdMs: number): boolean {
    const token = this.tokenSignal();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 - Date.now() < thresholdMs;
    } catch {
      return true;
    }
  }

  private load(key: string): any {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
}
