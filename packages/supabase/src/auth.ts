/**
 * @cafetoolbox/supabase - Authentication Helpers
 *
 * Helper functions for authentication operations.
 * Keeps cookie handling minimal — login/logout only.
 */

import { createClient as createBrowserClient } from './client';
import type { AuthError } from '@supabase/supabase-js';

export type AuthErrorType = 'email_not_confirmed' | 'invalid_credentials' | 'email_exists' | 'unknown';

export interface SignupResult {
  success: boolean;
  error?: AuthErrorType;
  message?: string;
}

export interface LoginResult {
  success: boolean;
  error?: AuthErrorType;
  message?: string;
}

export interface LogoutResult {
  success: boolean;
  error?: string;
}

export interface ForgotPasswordResult {
  success: boolean;
  error?: string;
}

/**
 * Regex to detect Supabase auth cookie names.
 * MUST stay in sync with client.ts, server.ts, middleware.ts.
 */
const SB_AUTH_COOKIE_RE =
  /^sb-[^-]+-auth-token(?:\.\d+)?$|^sb-[^-]+-auth-token-code-verifier$/;

/**
 * Nuke ALL auth cookies across ALL domain variants.
 * Only call after signOut() — this ensures no stale cookies persist.
 *
 * In production: clears host-only + .cafetoolbox.app variants
 * In dev: clears host-only + .cafetoolbox.app variants (belt and suspenders)
 */
export function clearAllAuthCookies(): void {
  if (typeof document === "undefined") return;

  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const raw = document.cookie;
  if (!raw) return;

  const allNames = raw
    .split("; ")
    .map((c) => c.split("=")[0])
    .filter((n): n is string => Boolean(n));
  const authCookieNames = allNames.filter((n) => SB_AUTH_COOKIE_RE.test(n));

  // Clear across both domain variants to be thorough
  const domains: (string | undefined)[] = [undefined, ".cafetoolbox.app"];

  for (const name of authCookieNames) {
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure ? "; Secure" : ""}${domain ? `; Domain=${domain}` : ""}`;
    }
  }
}

/**
 * Sign up a new user with email and password
 */
export async function signup(
  email: string,
  password: string,
  displayName?: string
): Promise<SignupResult> {
  const supabase = createBrowserClient();

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        return {
          success: false,
          error: 'email_exists',
          message: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.',
        };
      }

      return {
        success: false,
        error: 'unknown',
        message: error.message,
      };
    }

    return {
      success: true,
      message: data.session
        ? 'Đăng ký thành công!'
        : 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.',
    };
  } catch (err) {
    console.error('Signup error:', err);
    return {
      success: false,
      error: 'unknown',
      message: 'Có lỗi xảy ra. Vui lòng thử lại.',
    };
  }
}

/**
 * Log in with email and password.
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const supabase = createBrowserClient();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        return {
          success: false,
          error: 'email_not_confirmed',
          message: 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư của bạn.',
        };
      }

      if (error.message.includes('Invalid login credentials')) {
        return {
          success: false,
          error: 'invalid_credentials',
          message: 'Email hoặc mật khẩu không đúng.',
        };
      }

      return {
        success: false,
        error: 'unknown',
        message: error.message,
      };
    }

    return { success: true, message: 'Đăng nhập thành công!' };
  } catch (err) {
    console.error('Login error:', err);
    return {
      success: false,
      error: 'unknown',
      message: 'Có lỗi xảy ra. Vui lòng thử lại.',
    };
  }
}

/**
 * Log out current user and nuke all auth cookies.
 */
export async function logout(): Promise<LogoutResult> {
  const supabase = createBrowserClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Nuke ALL auth cookie variants to prevent stale cookies on next login
    clearAllAuthCookies();

    return { success: true };
  } catch (err) {
    console.error('Logout error:', err);
    return {
      success: false,
      error: 'Có lỗi xảy ra khi đăng xuất.',
    };
  }
}

/**
 * Request password reset email
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const supabase = createBrowserClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error('Forgot password error:', err);
    return {
      success: false,
      error: 'Có lỗi xảy ra. Vui lòng thử lại.',
    };
  }
}

/**
 * Update password for authenticated user
 */
export async function updatePassword(newPassword: string): Promise<LogoutResult> {
  const supabase = createBrowserClient();

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Update password error:', err);
    return {
      success: false,
      error: 'Có lỗi xảy ra. Vui lòng thử lại.',
    };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const supabase = createBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  const supabase = createBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  const supabase = createBrowserClient();
  return supabase.auth.onAuthStateChange(callback);
}
