import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface QuestionItemProps {
  itemId: string;
  itemCode: string;
  itemName: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  level5: string;
  score: number | null;
  currentState: string;
  onScoreChange: (itemId: string, score: number) => void;
  onCurrentStateChange: (itemId: string, currentState: string) => void;
}

const SCORE_LABELS = [
  { value: 1, label: 'Sơ khai', color: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
  { value: 2, label: 'Khởi đầu', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-600' },
  { value: 3, label: 'Phát triển', color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600' },
  { value: 4, label: 'Trưởng thành', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
  { value: 5, label: 'Tối ưu', color: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
];

export function QuestionItem({
  itemId,
  itemCode,
  itemName,
  level1,
  level2,
  level3,
  level4,
  level5,
  score,
  currentState,
  onScoreChange,
  onCurrentStateChange,
}: QuestionItemProps) {
  const levels = [level1, level2, level3, level4, level5];

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        {/* Question Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            <span className="text-blue-600">{itemCode}</span> {itemName}
          </h3>
        </div>

        {/* Score Selector */}
        <div className="mb-6">
          <Label className="mb-3 block text-sm font-medium">
            Đánh giá mức độ trưởng thành *
          </Label>
          <div className="grid grid-cols-5 gap-2">
            {SCORE_LABELS.map((scoreOption, index) => (
              <TooltipProvider key={scoreOption.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onScoreChange(itemId, scoreOption.value)}
                      className={`
                        relative p-4 rounded-lg border-2 transition-all
                        ${
                          score === scoreOption.value
                            ? `${scoreOption.color} text-white border-transparent shadow-lg scale-105`
                            : `bg-white border-slate-200 ${scoreOption.hoverColor} hover:text-white hover:border-transparent hover:shadow-md`
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold mb-1">
                          {scoreOption.value}
                        </div>
                        <div className="text-xs font-medium">
                          {scoreOption.label}
                        </div>
                      </div>
                      {score === scoreOption.value && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="max-w-sm bg-slate-800 text-white p-4"
                  >
                    <div className="space-y-2">
                      <div className="font-semibold text-sm">
                        Mức {scoreOption.value}: {scoreOption.label}
                      </div>
                      <p className="text-xs leading-relaxed">{levels[index]}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Level Descriptions - Quick Reference */}
        <div className="mb-6 bg-slate-50 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-2">
            <Info className="h-4 w-4 text-slate-500 mt-0.5" />
            <span className="text-xs font-medium text-slate-700">
              Mô tả các mức độ (Di chuột vào số để xem chi tiết)
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
            {SCORE_LABELS.map((scoreOption, index) => (
              <div key={scoreOption.value} className="flex gap-2">
                <span className="font-semibold text-slate-700 min-w-[20px]">
                  {scoreOption.value}:
                </span>
                <span className="line-clamp-2">{levels[index]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current State Input */}
        <div>
          <Label htmlFor={`current-state-${itemId}`} className="mb-2 block">
            Mô tả tình trạng hiện tại (tùy chọn)
          </Label>
          <Textarea
            id={`current-state-${itemId}`}
            placeholder="Mô tả chi tiết tình trạng hiện tại của tổ chức bạn về tiêu chí này..."
            value={currentState}
            onChange={(e) => onCurrentStateChange(itemId, e.target.value)}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-slate-500 mt-1">
            Thông tin này giúp tạo ra phân tích và khuyến nghị chi tiết hơn
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
