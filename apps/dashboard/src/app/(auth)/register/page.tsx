import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md border border-borderMain rounded-xl p-8 bg-white">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 bg-neon rounded-xl flex items-center justify-center mr-3">
            <span
              className="iconify text-charcoal"
              data-icon="lucide:terminal"
              data-width="24"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">CafeToolbox</h1>
        </div>

        <h2 className="text-xl font-semibold text-charcoal mb-2 tracking-tight text-center">
          Đăng ký đã bị tắt
        </h2>
        <p className="text-sm text-charcoalMuted text-center mb-8">
          Hiện tại không cho phép tự đăng ký. Chỉ Superadmin mới có quyền tạo tài khoản mới.
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full text-center bg-charcoal text-white font-medium px-6 py-3 rounded-lg text-sm hover:bg-charcoalLight transition-colors"
          >
            Đăng nhập
          </Link>
          <Link
            href="/"
            className="block w-full text-center border border-borderMain text-charcoal font-medium px-6 py-3 rounded-lg text-sm hover:bg-borderLight transition-colors"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
