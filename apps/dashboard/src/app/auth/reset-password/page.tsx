'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentSession, onAuthStateChange, updatePassword } from '@cafetoolbox/supabase/auth';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      const session = await getCurrentSession();
      if (!mounted) return;

      if (session) {
        setReady(true);
      }
    }

    checkRecoverySession();

    const { data: subscription } = onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY' || !!session) {
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp');
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);

    if (!result.success) {
      setError(result.error || 'Không thể cập nhật mật khẩu');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md border border-borderMain rounded-xl p-8 bg-white">
        <h1 className="text-2xl font-semibold text-charcoal mb-2">Đặt lại mật khẩu</h1>
        <p className="text-sm text-charcoalMuted mb-6">
          Tạo mật khẩu mới cho tài khoản của bạn.
        </p>

        {!ready && !success && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-700">
              Đang xác thực link đặt lại mật khẩu. Nếu chờ quá lâu, hãy yêu cầu link mới từ trang quên mật khẩu.
            </p>
          </div>
        )}

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">Đổi mật khẩu thành công. Bạn có thể đăng nhập lại bằng mật khẩu mới.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Mật khẩu mới</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="w-full px-4 py-3 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                className="w-full px-4 py-3 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !ready}
              className="w-full bg-charcoal text-white font-medium px-6 py-3 rounded-lg text-sm hover:bg-charcoalLight transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
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
