import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = {
  title: 'Đăng ký - AI Maturity Assessment',
  description: 'Tạo tài khoản mới',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Đăng ký</CardTitle>
          <CardDescription>
            Tạo tài khoản mới để bắt đầu đánh giá AI maturity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
