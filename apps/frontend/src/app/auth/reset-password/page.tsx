import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata = {
  title: 'Đặt lại mật khẩu - AI Maturity Assessment',
  description: 'Tạo mật khẩu mới cho tài khoản của bạn',
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Đặt lại mật khẩu
          </CardTitle>
          <CardDescription>
            Tạo mật khẩu mới cho tài khoản của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
