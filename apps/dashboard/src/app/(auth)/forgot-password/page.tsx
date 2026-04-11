'use client';

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@cafetoolbox/supabase/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await forgotPassword(email);

    if (!result.success) {
      setError(result.error || 'Không thể gửi email khôi phục mật khẩu');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md border border-borderMain rounded-xl p-8 bg-white">
        <h1 className="text-2xl font-semibold text-charcoal mb-2">Quên mật khẩu</h1>
        <p className="text-sm text-charcoalMuted mb-6">
          Nhập email để nhận link đặt lại mật khẩu.
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư của bạn.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your-email@example.com"
                className="w-full px-4 py-3 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-charcoal text-white font-medium px-6 py-3 rounded-lg text-sm hover:bg-charcoalLight transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-charcoalMuted hover:text-charcoal transition-colors">
            ← Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
