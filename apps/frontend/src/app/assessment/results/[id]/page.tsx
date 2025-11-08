'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GuestLinkBanner } from '@/components/assessment/guest-link-banner';
import { BenchmarkComparison } from '@/components/benchmarks/benchmark-comparison';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
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
import { api } from '@/lib/api';

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

interface DomainWithItems {
  code: string;
  name: string;
  items: Array<{
    itemCode: string;
    itemName: string;
    score: number;
  }>;
}

interface ResultsData {
  assessment: Assessment;
  snapshot: Snapshot;
  domains: DomainWithItems[];
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
        const data = await api.assessments.getResults(params.id);
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
      const blob = await api.assessments.exportPDF(params.id);

      // Download the PDF
      const filename = `AI_Maturity_Assessment_${params.id}.pdf`;
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
      const blob = await api.assessments.exportCSV(params.id, format);

      // Download the CSV
      const filename = `AI_Maturity_Assessment_${params.id}.csv`;
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
      await api.assessments.sendResults(params.id, {
        emails: [recipientEmail],
        format: 'pdf',
      });

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

  const { assessment, snapshot, domains, analysis } = resultsData;
  const maturityConfig = MATURITY_CONFIG[snapshot.maturityLevel as keyof typeof MATURITY_CONFIG];

  // Domain name mapping for display
  const domainNames: Record<string, string> = {
    data: 'Dữ liệu',
    infra: 'Hạ tầng',
    tech: 'Công nghệ',
    org: 'Tổ chức',
    policy: 'Chính sách',
  };

  // Chart color configuration for each domain
  const domainChartConfigs: Record<string, ChartConfig> = {
    data: {
      score: {
        label: 'Điểm số',
        color: 'hsl(var(--chart-1))',
      },
    } satisfies ChartConfig,
    infra: {
      score: {
        label: 'Điểm số',
        color: 'hsl(var(--chart-2))',
      },
    } satisfies ChartConfig,
    tech: {
      score: {
        label: 'Điểm số',
        color: 'hsl(var(--chart-3))',
      },
    } satisfies ChartConfig,
    org: {
      score: {
        label: 'Điểm số',
        color: 'hsl(var(--chart-4))',
      },
    } satisfies ChartConfig,
    policy: {
      score: {
        label: 'Điểm số',
        color: 'hsl(var(--chart-5))',
      },
    } satisfies ChartConfig,
  };

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

        {/* Domain Radar Charts - One for Each Domain */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Phân Tích Chi Tiết Theo Lĩnh Vực
            </h2>
            <p className="text-slate-600">
              Biểu đồ radar cho từng lĩnh vực với điểm số các tiêu chí
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domains.map((domain) => {
              const domainScore = snapshot.domainScores[domain.code];
              const radarData = domain.items.map((item) => ({
                itemCode: item.itemCode,
                itemName: item.itemName.length > 30
                  ? item.itemName.substring(0, 27) + '...'
                  : item.itemName,
                score: item.score,
              }));

              const chartConfig = domainChartConfigs[domain.code] || domainChartConfigs.data;

              return (
                <Card key={domain.code} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {domain.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-sm font-bold">
                        {domainScore.toFixed(2)} / 5.0
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {domain.items.length} tiêu chí đánh giá
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={chartConfig}
                      className="mx-auto aspect-square max-h-[250px]"
                    >
                      <RadarChart data={radarData}>
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="line" />}
                        />
                        <PolarGrid
                          className="fill-[--color-score] opacity-20"
                          gridType="polygon"
                        />
                        <PolarAngleAxis
                          dataKey="itemCode"
                          tick={{
                            fill: 'hsl(var(--foreground))',
                            fontSize: 10,
                          }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 5]}
                          tick={{
                            fill: 'hsl(var(--muted-foreground))',
                            fontSize: 9,
                          }}
                          axisLine={false}
                        />
                        <Radar
                          name={domain.name}
                          dataKey="score"
                          fill="var(--color-score)"
                          fillOpacity={0.5}
                          stroke="var(--color-score)"
                          strokeWidth={2}
                          dot={{
                            fill: 'var(--color-score)',
                            fillOpacity: 1,
                            r: 3,
                          }}
                        />
                      </RadarChart>
                    </ChartContainer>

                    {/* Items List */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-xs font-semibold text-slate-700 mb-2">
                        Chi tiết điểm:
                      </div>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {domain.items.map((item) => (
                          <div
                            key={item.itemCode}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-slate-600 truncate flex-1 mr-2">
                              {item.itemCode}
                            </span>
                            <span className="font-semibold text-slate-900 shrink-0">
                              {item.score.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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

        {/* Benchmark Comparison */}
        {assessment.industry && assessment.size && (
          <BenchmarkComparison assessmentId={params.id} />
        )}

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
