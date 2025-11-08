'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, Clock, FileCheck, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';

export default function AssessmentStartPage() {
  const router = useRouter();
  const [industry, setIndustry] = useState<string>('');
  const [size, setSize] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartAssessment = async () => {
    if (!industry || !size || !region) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.assessments.start({ industry, size, region });
      router.push(`/assessment/${data.assessmentId}`);
    } catch (err) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Đánh Giá Mức Độ Trưởng Thành AI
          </h1>
          <p className="text-lg text-slate-600">
            Đánh giá năng lực AI của tổ chức và nhận khuyến nghị cải thiện cụ thể
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <ClipboardList className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-sm">37 Câu hỏi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600">
                5 lĩnh vực chính của AI
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Clock className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle className="text-sm">20-30 phút</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600">
                Thời gian hoàn thành trung bình
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <FileCheck className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle className="text-sm">Tự động lưu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600">
                Tiếp tục bất cứ lúc nào
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <TrendingUp className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle className="text-sm">Phân tích chi tiết</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600">
                Roadmap cải thiện cụ thể
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Start Form */}
        <Card>
          <CardHeader>
            <CardTitle>Bắt đầu đánh giá</CardTitle>
            <CardDescription>
              Điền thông tin cơ bản về tổ chức của bạn để bắt đầu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Industry Select */}
            <div className="space-y-2">
              <Label htmlFor="industry">Ngành nghề *</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Chọn ngành nghề" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finance">Tài chính - Ngân hàng</SelectItem>
                  <SelectItem value="healthcare">Y tế - Chăm sóc sức khỏe</SelectItem>
                  <SelectItem value="retail">Bán lẻ - Thương mại điện tử</SelectItem>
                  <SelectItem value="manufacturing">Sản xuất</SelectItem>
                  <SelectItem value="technology">Công nghệ thông tin</SelectItem>
                  <SelectItem value="education">Giáo dục</SelectItem>
                  <SelectItem value="government">Chính phủ - Công quyền</SelectItem>
                  <SelectItem value="telecom">Viễn thông</SelectItem>
                  <SelectItem value="logistics">Logistics - Vận tải</SelectItem>
                  <SelectItem value="energy">Năng lượng</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Size Select */}
            <div className="space-y-2">
              <Label htmlFor="size">Quy mô tổ chức *</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue placeholder="Chọn quy mô" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Nhỏ (1-50 nhân viên)</SelectItem>
                  <SelectItem value="medium">Vừa (51-500 nhân viên)</SelectItem>
                  <SelectItem value="large">Lớn (501-5000 nhân viên)</SelectItem>
                  <SelectItem value="enterprise">Rất lớn (&gt;5000 nhân viên)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Region Select */}
            <div className="space-y-2">
              <Label htmlFor="region">Khu vực hoạt động *</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="region">
                  <SelectValue placeholder="Chọn khu vực" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vietnam">Việt Nam</SelectItem>
                  <SelectItem value="sea">Đông Nam Á</SelectItem>
                  <SelectItem value="asia">Châu Á</SelectItem>
                  <SelectItem value="global">Toàn cầu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Start Button */}
            <Button
              onClick={handleStartAssessment}
              disabled={loading || !industry || !size || !region}
              className="w-full"
              size="lg"
            >
              {loading ? 'Đang khởi tạo...' : 'Bắt đầu đánh giá'}
            </Button>

            {/* Guest Notice */}
            <p className="text-sm text-slate-500 text-center">
              Bạn có thể bắt đầu mà không cần đăng nhập. Kết quả sẽ được lưu trong 30 ngày.
              <br />
              Đăng nhập sau để lưu trữ vĩnh viễn.
            </p>
          </CardContent>
        </Card>

        {/* Assessment Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Quy trình đánh giá</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Trả lời câu hỏi</h3>
                <p className="text-sm text-slate-600">
                  37 câu hỏi về 5 lĩnh vực: Dữ liệu, Hạ tầng, Công nghệ, Tổ chức, và Chính sách
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Chấm điểm (1-5)</h3>
                <p className="text-sm text-slate-600">
                  1 = Sơ khai, 2 = Khởi đầu, 3 = Phát triển, 4 = Trưởng thành, 5 = Tối ưu
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Nhận kết quả</h3>
                <p className="text-sm text-slate-600">
                  Điểm tổng hợp, phân tích điểm mạnh/yếu, và roadmap cải thiện chi tiết
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
