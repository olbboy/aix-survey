'use client';

/**
 * Reset Password Form
 * Set new password with token from email
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/auth/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
      .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
      .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số')
      .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          <p className="font-medium">❌ Link không hợp lệ</p>
          <p className="mt-2 text-sm">
            Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
          </p>
        </div>
        <Link href="/auth/forgot-password">
          <Button variant="outline" className="w-full">
            Yêu cầu link mới
          </Button>
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await resetPassword(token, data.password);

      if (result.error) {
        if (result.error.message?.includes('expired')) {
          setError('Link đã hết hạn. Vui lòng yêu cầu link mới.');
        } else if (result.error.message?.includes('invalid')) {
          setError('Link không hợp lệ.');
        } else {
          setError(result.error.message || 'Đặt lại mật khẩu thất bại');
        }
        return;
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-medium">✅ Mật khẩu đã được đặt lại!</p>
          <p className="mt-2 text-sm">
            Bạn sẽ được chuyển đến trang đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
          {error.includes('hết hạn') && (
            <div className="mt-2">
              <Link
                href="/auth/forgot-password"
                className="font-medium underline"
              >
                Yêu cầu link mới
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu mới</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          {...register('confirmPassword')}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </form>
  );
}
