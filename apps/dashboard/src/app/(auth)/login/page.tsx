'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login } from '@cafetoolbox/supabase/auth';
import { BrandMark } from '@cafetoolbox/ui';
import type { LoginResult } from '@cafetoolbox/supabase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result: LoginResult = await login(email, password);

    if (result.success) {
      setSuccess(true);
      // Redirect to dashboard after successful login
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } else {
      setError(result.message || 'Đăng nhập thất bại');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <BrandMark size={48} variant="on-light" />
          <h1 className="text-2xl font-semibold tracking-tight ml-3">
            CafeToolbox
          </h1>
        </div>

        {/* Form Card */}
        <div className="border border-borderMain rounded-xl p-8 bg-white">
          <h2 className="text-xl font-semibold text-charcoal mb-2 tracking-tight">
            Đăng nhập
          </h2>
          <p className="text-sm text-charcoalMuted mb-6">
            Nhập email và mật khẩu để tiếp tục
          </p>

          {/* Success Message */}
          {success && (
            <div className="bg-neonGhost border border-neon rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <span
                  className="iconify text-neon"
                  data-icon="lucide:check-circle"
                  data-width="20"
                ></span>
                <p className="text-sm text-charcoal font-medium">
                  Đăng nhập thành công! Đang chuyển hướng...
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !success && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <span
                  className="iconify text-red-500"
                  data-icon="lucide:alert-circle"
                  data-width="20"
                ></span>
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 border border-borderMain rounded-lg text-sm text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-2">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  disabled={loading}
                  minLength={6}
                  className="w-full px-4 py-3 border border-borderMain rounded-lg text-sm text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full bg-charcoal text-white font-medium px-6 py-3 rounded-lg text-sm hover:bg-charcoalLight transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </form>
          )}

          {/* Footer Links */}
          {!success && (
            <div className="mt-6 pt-6 border-t border-borderLight flex items-center justify-end text-sm">
              <Link
                href="/forgot-password"
                className="text-charcoalMuted hover:text-charcoal transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
          )}
        </div>

        {/* Back to Home */}
        {!success && (
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-charcoalMuted hover:text-charcoal transition-colors"
            >
              ← Quay lại trang chủ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
