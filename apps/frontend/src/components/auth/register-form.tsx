'use client';

/**
 * Registration Form Component
 * Features:
 * - Email/Password signup
 * - Auto sign-in after email verification
 * - Real-time validation
 * - Loading states
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signUp } from '@/lib/auth/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

// Validation schema
const registerSchema = z
  .object({
    name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
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

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.error) {
        setError(result.error.message || 'Đăng ký thất bại');
        return;
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-medium">✅ Đăng ký thành công!</p>
          <p className="mt-2 text-sm">
            Chúng tôi đã gửi email xác thực đến <strong>{}</strong>.
            Vui lòng kiểm tra hộp thư và click vào link xác thực để hoàn tất.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSuccess(false)}
          className="w-full"
        >
          Gửi lại email xác thực
        </Button>
        <p className="text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Họ và tên</Label>
        <Input
          id="name"
          type="text"
          placeholder="Nguyễn Văn A"
          {...register('name')}
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu</Label>
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
        {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link href="/auth/login" className="text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        Bằng việc đăng ký, bạn đồng ý với{' '}
        <Link href="/terms" className="underline">
          Điều khoản dịch vụ
        </Link>{' '}
        và{' '}
        <Link href="/privacy" className="underline">
          Chính sách bảo mật
        </Link>
      </p>
    </form>
  );
}
