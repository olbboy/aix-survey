'use client';

/**
 * Email Verification Page
 * Handles email verification with token from URL
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/lib/auth/auth-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    'verifying'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Link xác thực không hợp lệ');
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyEmail({
          query: {
            token: token!,
          },
        });

        if (result.error) {
          setStatus('error');
          if (result.error.message?.includes('expired')) {
            setErrorMessage('Link xác thực đã hết hạn');
          } else if (result.error.message?.includes('invalid')) {
            setErrorMessage('Link xác thực không hợp lệ');
          } else {
            setErrorMessage(result.error.message || 'Xác thực email thất bại');
          }
          return;
        }

        setStatus('success');

        // Auto sign-in enabled, redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 2000);
      } catch (err) {
        setStatus('error');
        setErrorMessage('Đã xảy ra lỗi. Vui lòng thử lại.');
        console.error('Email verification error:', err);
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Xác thực Email</CardTitle>
          <CardDescription>
            {status === 'verifying' && 'Đang xác thực email của bạn...'}
            {status === 'success' && 'Email đã được xác thực thành công!'}
            {status === 'error' && 'Xác thực email thất bại'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'verifying' && (
            <div className="flex items-center justify-center py-8">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 text-green-800">
                <p className="font-medium">✅ Xác thực thành công!</p>
                <p className="mt-2 text-sm">
                  Email của bạn đã được xác thực. Bạn sẽ được chuyển đến dashboard...
                </p>
              </div>
              <Link href="/dashboard">
                <Button className="w-full">Đi đến Dashboard</Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-red-50 p-4 text-red-800">
                <p className="font-medium">❌ {errorMessage}</p>
                <p className="mt-2 text-sm">
                  {errorMessage.includes('hết hạn') &&
                    'Vui lòng yêu cầu link xác thực mới.'}
                  {errorMessage.includes('không hợp lệ') &&
                    'Link có thể đã được sử dụng hoặc không chính xác.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/auth/resend-verification" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Gửi lại email
                  </Button>
                </Link>
                <Link href="/auth/login" className="flex-1">
                  <Button className="w-full">Đăng nhập</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
