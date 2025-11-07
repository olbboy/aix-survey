'use client';

/**
 * Forgot Password Form
 * Request password reset link
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { forgetPassword } from '@/lib/auth/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await forgetPassword({
        email: data.email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (result.error) {
        setError(result.error.message || 'Gửi email thất bại');
        return;
      }

      setEmail(data.email);
      setSuccess(true);
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      console.error('Forgot password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-medium">✅ Email đã được gửi!</p>
          <p className="mt-2 text-sm">
            Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>.
            Vui lòng kiểm tra hộp thư và click vào link để đặt lại mật khẩu.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Link sẽ hết hạn sau 1 giờ.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSuccess(false)}
          className="w-full"
        >
          Gửi lại email
        </Button>
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2 text-center text-sm text-muted-foreground">
        <p>
          Nhập email của bạn và chúng tôi sẽ gửi link để đặt lại mật khẩu.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
          {...register('email')}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </form>
  );
}
