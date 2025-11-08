'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, X, LogIn } from 'lucide-react';

interface GuestLinkBannerProps {
  assessmentId: string;
}

export function GuestLinkBanner({ assessmentId }: GuestLinkBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <Card className="mb-8 border-2 border-blue-200 bg-blue-50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Lưu kết quả vĩnh viễn
            </h3>
            <p className="text-sm text-slate-700 mb-4">
              Bạn đang xem kết quả dưới chế độ khách. Kết quả này sẽ được lưu trong 30 ngày.
              <br />
              Đăng nhập hoặc đăng ký để lưu trữ vĩnh viễn và truy cập lịch sử đánh giá.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  // Redirect to login with return URL
                  router.push(`/auth/login?redirect=/assessment/results/${assessmentId}`);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Đăng nhập
              </Button>
              <Button
                onClick={() => {
                  router.push(`/auth/register?redirect=/assessment/results/${assessmentId}`);
                }}
                variant="outline"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Đăng ký
              </Button>
              <Button
                onClick={() => setDismissed(true)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
