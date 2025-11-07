'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GuestLinkBanner } from '@/components/assessment/guest-link-banner';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Lightbulb,
  Download,
  Loader2,
  AlertCircle,
  Mail,
} from 'lucide-react';

interface Gap {
  itemCode: string;
  itemName: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  priority: string;
  effort: string;
  impact: string;
}

interface Strength {
  itemCode: string;
  itemName: string;
  score: number;
}

interface Analysis {
  strengths: Strength[];
  weaknesses: Strength[];
  gaps: Gap[];
  recommendations: string[];
}

interface Snapshot {
  id: string;
  totalScore: number;
  maturityLevel: string;
  completeness: number;
  domainScores: Record<string, number>;
  itemScores: Record<string, number>;
  createdAt: string;
}

interface Assessment {
  id: string;
  status: string;
  industry: string | null;
  size: string | null;
  region: string | null;
  finalizedAt: string | null;
}

interface ResultsData {
  assessment: Assessment;
  snapshot: Snapshot;
  analysis: Analysis;
}

const MATURITY_CONFIG = {
  'Sơ khai': { color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  'Khởi đầu': { color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  'Phát triển': { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  'Trưởng thành': { color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  'Tối ưu': { color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
};

const PRIORITY_CONFIG = {
  HIGH: { label: 'Cao', color: 'bg-red-100 text-red-800' },
  MEDIUM: { label: 'Trung bình', color: 'bg-yellow-100 text-yellow-800' },
  LOW: { label: 'Thấp', color: 'bg-green-100 text-green-800' },
};

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');

  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await fetch(`/api/assessments/${params.id}/results`);
        if (!response.ok) {
          throw new Error('Failed to load results');
        }

        const data = await response.json();
        setResultsData(data);
      } catch (err) {
        setError('Không thể tải kết quả. Vui lòng kiểm tra xem đánh giá đã được hoàn thành chưa.');
        console.error('Failed to load results:', err);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [params.id]);

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const response = await fetch(`/api/assessments/${params.id}/export/pdf`);

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `AI_Maturity_Assessment_${params.id}.pdf`;

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Không thể xuất báo cáo PDF. Vui lòng thử lại.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCSV = async (format: 'full' | 'simple' = 'full') => {
    try {
      setExportingCSV(true);
      const response = await fetch(`/api/assessments/${params.id}/export/csv?format=${format}`);

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `AI_Maturity_Assessment_${params.id}.csv`;

      // Download the CSV
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Không thể xuất dữ liệu CSV. Vui lòng thử lại.');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      alert('Vui lòng nhập địa chỉ email.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      alert('Địa chỉ email không hợp lệ.');
      return;
    }

    try {
      setSendingEmail(true);
      const response = await fetch(`/api/assessments/${params.id}/send-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          recipientName: recipientName || undefined,
          includePDF: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      alert('Email đã được gửi thành công! Vui lòng kiểm tra hộp thư của bạn.');
      setShowEmailDialog(false);
      setRecipientEmail('');
      setRecipientName('');
    } catch (err) {
      console.error('Failed to send email:', err);
      alert('Không thể gửi email. Vui lòng thử lại.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Đang tải kết quả...</p>
        </div>
      </div>
    );
  }

  if (error || !resultsData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Không tìm thấy kết quả</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Thử lại</Button>
        </div>
      </div>
    );
  }

  const { assessment, snapshot, analysis } = resultsData;
  const maturityConfig = MATURITY_CONFIG[snapshot.maturityLevel as keyof typeof MATURITY_CONFIG];

  // Prepare radar chart data
  const radarData = Object.entries(snapshot.domainScores).map(([code, score]) => {
    const domainNames: Record<string, string> = {
      data: 'Dữ liệu',
      infra: 'Hạ tầng',
      tech: 'Công nghệ',
      org: 'Tổ chức',
      policy: 'Chính sách',
    };
    return {
      domain: domainNames[code] || code,
      score: Math.round(score * 10) / 10,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-2 shadow-sm mb-4">
            <Award className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-slate-600">Kết quả đánh giá</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Mức Độ Trưởng Thành AI
          </h1>
          <p className="text-slate-600">
            Hoàn thành vào {new Date(snapshot.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>

        {/* Guest Link Banner */}
        <GuestLinkBanner assessmentId={params.id} />

        {/* Maturity Level Banner */}
        <Card className={`mb-8 border-2 ${maturityConfig.bgLight}`}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-4">
                <div
                  className={`inline-flex items-center gap-3 px-8 py-4 ${maturityConfig.color} text-white rounded-full shadow-lg text-2xl font-bold`}
                >
                  <Award className="h-8 w-8" />
                  {snapshot.maturityLevel}
                </div>
              </div>
              <div className="text-5xl font-bold text-slate-900 mb-2">
                {snapshot.totalScore.toFixed(2)} / 5.00
              </div>
              <p className="text-slate-600">
                Điểm trung bình tổng hợp ({snapshot.completeness}% hoàn thành)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart & Domain Scores */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Biểu đồ năng lực 5 lĩnh vực</CardTitle>
              <CardDescription>Điểm trung bình theo từng lĩnh vực</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="domain" />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} />
                  <Radar
                    name="Điểm"
                    dataKey="score"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Domain Scores Table */}
          <Card>
            <CardHeader>
              <CardTitle>Chi tiết điểm theo lĩnh vực</CardTitle>
              <CardDescription>Phân tích chi tiết từng lĩnh vực</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {radarData.map((item) => (
                  <div key={item.domain} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 mb-1">
                        {item.domain}
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(item.score / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-xl font-bold text-slate-900">
                        {item.score}
                      </div>
                      <div className="text-xs text-slate-500">/ 5.0</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top 5 Điểm Mạnh
              </CardTitle>
              <CardDescription>
                Các tiêu chí có điểm số cao nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.strengths.map((strength) => (
                  <div
                    key={strength.itemCode}
                    className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {strength.score}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 text-sm">
                        {strength.itemCode}: {strength.itemName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weaknesses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Top 5 Điểm Yếu
              </CardTitle>
              <CardDescription>
                Các tiêu chí cần cải thiện ưu tiên
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.weaknesses.map((weakness) => (
                  <div
                    key={weakness.itemCode}
                    className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {weakness.score}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 text-sm">
                        {weakness.itemCode}: {weakness.itemName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gap Analysis */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Phân Tích Khoảng Cách (Top 10)
            </CardTitle>
            <CardDescription>
              Các tiêu chí cần cải thiện với mức độ ưu tiên, nỗ lực, và tác động
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">
                      Tiêu chí
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-slate-700">
                      Hiện tại
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-slate-700">
                      Mục tiêu
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-slate-700">
                      Khoảng cách
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-slate-700">
                      Ưu tiên
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-slate-700">
                      Nỗ lực
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-slate-700">
                      Tác động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.gaps.map((gap) => (
                    <tr key={gap.itemCode} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-2 text-sm">
                        <div className="font-medium text-slate-900">
                          {gap.itemCode}
                        </div>
                        <div className="text-xs text-slate-600">
                          {gap.itemName}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm">
                        {gap.currentScore}
                      </td>
                      <td className="text-center py-3 px-2 text-sm">
                        {gap.targetScore}
                      </td>
                      <td className="text-center py-3 px-2">
                        <Badge variant="outline" className="font-bold">
                          +{gap.gap}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-2">
                        <Badge
                          className={
                            PRIORITY_CONFIG[gap.priority as keyof typeof PRIORITY_CONFIG]
                              ?.color
                          }
                        >
                          {
                            PRIORITY_CONFIG[gap.priority as keyof typeof PRIORITY_CONFIG]
                              ?.label
                          }
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-2 text-sm capitalize">
                        {gap.effort === 'LOW'
                          ? 'Thấp'
                          : gap.effort === 'MEDIUM'
                          ? 'TB'
                          : 'Cao'}
                      </td>
                      <td className="text-center py-3 px-2 text-sm capitalize">
                        {gap.impact === 'LOW'
                          ? 'Thấp'
                          : gap.impact === 'MEDIUM'
                          ? 'TB'
                          : 'Cao'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Khuyến Nghị Cải Thiện
            </CardTitle>
            <CardDescription>
              Các hành động cụ thể để nâng cao mức độ trưởng thành AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </div>
                  <p className="text-sm text-slate-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            size="lg"
            variant="outline"
            onClick={handleExportPDF}
            disabled={exportingPDF}
          >
            {exportingPDF ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {exportingPDF ? 'Đang xuất PDF...' : 'Xuất báo cáo PDF'}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => handleExportCSV('full')}
            disabled={exportingCSV}
          >
            {exportingCSV ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {exportingCSV ? 'Đang xuất CSV...' : 'Xuất CSV (Full)'}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => handleExportCSV('simple')}
            disabled={exportingCSV}
          >
            {exportingCSV ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {exportingCSV ? 'Đang xuất CSV...' : 'Xuất CSV (Simple)'}
          </Button>
          <Button
            size="lg"
            onClick={() => setShowEmailDialog(true)}
          >
            <Mail className="mr-2 h-4 w-4" />
            Gửi kết quả qua Email
          </Button>
        </div>

        {/* Email Dialog */}
        {showEmailDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Gửi kết quả qua Email</CardTitle>
                <CardDescription>
                  Báo cáo PDF sẽ được đính kèm trong email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email người nhận *
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tên người nhận (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="flex-1"
                  >
                    {sendingEmail ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Gửi Email
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEmailDialog(false);
                      setRecipientEmail('');
                      setRecipientName('');
                    }}
                    disabled={sendingEmail}
                  >
                    Hủy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
