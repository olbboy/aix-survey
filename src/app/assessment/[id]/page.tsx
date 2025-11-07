'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { QuestionItem } from '@/components/assessment/question-item';
import { useAutosave } from '@/hooks/use-autosave';
import {
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileCheck,
  ArrowRight
} from 'lucide-react';

interface Item {
  id: string;
  itemCode: string;
  itemName: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  level5: string;
  weight: number;
  evidenceRequired: boolean;
}

interface Domain {
  id: string;
  code: string;
  name: string;
  items: Item[];
}

interface Template {
  version: string;
  domains: Domain[];
}

interface Assessment {
  id: string;
  status: string;
  industry: string | null;
  size: string | null;
  region: string | null;
  templateVersion: string;
  createdAt: string;
  updatedAt: string;
}

interface ResponseData {
  score: number | null;
  currentState: string;
}

interface AssessmentData {
  assessment: Assessment;
  template: Template;
  responses: Record<string, ResponseData>;
}

export default function AssessmentFormPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [responses, setResponses] = useState<Record<string, ResponseData>>({});
  const [activeTab, setActiveTab] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [finalizing, setFinalizing] = useState(false);

  // Autosave
  const autosaveState = useAutosave(responses, {
    delay: 3000,
    onSave: async (data) => {
      const response = await fetch(`/api/assessments/${params.id}/responses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: data }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      const result = await response.json();
      setProgress(result.progress);
    },
  });

  // Load assessment data
  useEffect(() => {
    const loadAssessment = async () => {
      try {
        const response = await fetch(`/api/assessments/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to load assessment');
        }

        const data: AssessmentData = await response.json();
        setAssessmentData(data);
        setResponses(data.responses);

        // Set initial active tab to first domain
        if (data.template.domains.length > 0) {
          setActiveTab(data.template.domains[0].code);
        }

        // Calculate initial progress
        const totalItems = data.template.domains.reduce(
          (sum, domain) => sum + domain.items.length,
          0
        );
        const answeredItems = Object.values(data.responses).filter(
          (r) => r.score !== null && r.score > 0
        ).length;
        setProgress(Math.round((answeredItems / totalItems) * 100));
      } catch (error) {
        console.error('Failed to load assessment:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [params.id]);

  // Handle score change
  const handleScoreChange = (itemId: string, score: number) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        score,
        currentState: prev[itemId]?.currentState || '',
      },
    }));
  };

  // Handle current state change
  const handleCurrentStateChange = (itemId: string, currentState: string) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        score: prev[itemId]?.score || null,
        currentState,
      },
    }));
  };

  // Handle finalize
  const handleFinalize = async () => {
    if (!assessmentData) return;

    // Check if all items are answered
    const totalItems = assessmentData.template.domains.reduce(
      (sum, domain) => sum + domain.items.length,
      0
    );
    const answeredItems = Object.values(responses).filter(
      (r) => r.score !== null && r.score > 0
    ).length;

    if (answeredItems < totalItems) {
      if (
        !confirm(
          `Bạn chưa trả lời ${totalItems - answeredItems} câu hỏi. Bạn có muốn hoàn thành đánh giá không?`
        )
      ) {
        return;
      }
    }

    setFinalizing(true);

    try {
      const response = await fetch(`/api/assessments/${params.id}/finalize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to finalize assessment');
      }

      const data = await response.json();
      router.push(`/assessment/results/${params.id}`);
    } catch (error) {
      console.error('Failed to finalize:', error);
      alert('Có lỗi xảy ra khi hoàn thành đánh giá. Vui lòng thử lại.');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Đang tải đánh giá...</p>
        </div>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-slate-600">Không tìm thấy đánh giá</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Đánh Giá Mức Độ Trưởng Thành AI
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Template v{assessmentData.template.version}
              </p>
            </div>

            {/* Autosave Indicator */}
            <div className="flex items-center gap-3">
              {autosaveState.status === 'saving' && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Đang lưu...</span>
                </div>
              )}
              {autosaveState.status === 'saved' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Đã lưu</span>
                </div>
              )}
              {autosaveState.status === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Lỗi lưu</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={progress} className="h-2" />
            </div>
            <span className="text-sm font-medium text-slate-700 min-w-[80px] text-right">
              {progress}% hoàn thành
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start mb-6 bg-white p-2 rounded-lg shadow-sm">
                {assessmentData.template.domains.map((domain) => (
                  <TabsTrigger
                    key={domain.code}
                    value={domain.code}
                    className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    {domain.name}
                    <Badge variant="secondary" className="ml-2">
                      {domain.items.length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {assessmentData.template.domains.map((domain) => (
                <TabsContent key={domain.code} value={domain.code}>
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>{domain.name}</CardTitle>
                      <CardDescription>
                        {domain.items.length} tiêu chí đánh giá
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {domain.items.map((item) => (
                    <QuestionItem
                      key={item.id}
                      itemId={item.id}
                      itemCode={item.itemCode}
                      itemName={item.itemName}
                      level1={item.level1}
                      level2={item.level2}
                      level3={item.level3}
                      level4={item.level4}
                      level5={item.level5}
                      score={responses[item.id]?.score || null}
                      currentState={responses[item.id]?.currentState || ''}
                      onScoreChange={handleScoreChange}
                      onCurrentStateChange={handleCurrentStateChange}
                    />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tiến độ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assessmentData.template.domains.map((domain) => {
                    const answered = domain.items.filter(
                      (item) =>
                        responses[item.id]?.score !== null &&
                        responses[item.id]?.score > 0
                    ).length;
                    const domainProgress = Math.round(
                      (answered / domain.items.length) * 100
                    );

                    return (
                      <div key={domain.code}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{domain.name}</span>
                          <span className="text-slate-600">
                            {answered}/{domain.items.length}
                          </span>
                        </div>
                        <Progress value={domainProgress} className="h-2" />
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleFinalize}
                      disabled={finalizing || progress < 50}
                      className="w-full"
                      size="lg"
                    >
                      {finalizing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <FileCheck className="mr-2 h-4 w-4" />
                          Hoàn thành đánh giá
                        </>
                      )}
                    </Button>
                    {progress < 50 && (
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        Cần trả lời ít nhất 50% câu hỏi
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
