/**
 * Progress Timeline Component
 * Visual timeline of assessment history with improvements
 *
 * Phase 5B: Progress Tracking
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Calendar } from 'lucide-react';

interface AssessmentProgress {
  assessmentId: string;
  assessmentNumber: number;
  finalizedAt: Date;
  overallScore: number;
  maturityLevel: string;
  scoreChange?: number;
  levelChange?: number;
  improvementRate?: number;
  daysSincePrevious?: number;
}

interface ProgressTimelineProps {
  assessments: AssessmentProgress[];
  currentScore: number;
  currentLevel: string;
  overallImprovement: number;
  predictedNextScore?: number;
}

export function ProgressTimeline({
  assessments,
  currentScore,
  currentLevel,
  overallImprovement,
  predictedNextScore,
}: ProgressTimelineProps) {
  if (assessments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progress Timeline</CardTitle>
          <CardDescription>No assessment history available yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const maxScore = Math.max(...assessments.map(a => a.overallScore), 5);
  const minScore = Math.min(...assessments.map(a => a.overallScore), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Progress Timeline
            </CardTitle>
            <CardDescription>
              {assessments.length} assessments • Overall improvement: {overallImprovement > 0 ? '+' : ''}
              {overallImprovement.toFixed(2)}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Current Score</div>
            <div className="text-3xl font-bold text-blue-600">{currentScore.toFixed(2)}</div>
            <Badge className="mt-1">{currentLevel}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Timeline Chart */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Timeline items */}
          <div className="space-y-8">
            {assessments.map((assessment, index) => {
              const isFirst = index === 0;
              const isLast = index === assessments.length - 1;
              const date = new Date(assessment.finalizedAt);

              return (
                <div key={assessment.assessmentId} className="relative pl-14">
                  {/* Timeline dot */}
                  <div className={`absolute left-3.5 w-5 h-5 rounded-full border-2 ${
                    isLast
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-gray-300'
                  }`} />

                  {/* Content card */}
                  <Card className={isLast ? 'border-blue-200 bg-blue-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              Assessment #{assessment.assessmentNumber}
                            </span>
                            {isLast && (
                              <Badge className="bg-blue-600">Latest</Badge>
                            )}
                            {isFirst && (
                              <Badge variant="outline">First</Badge>
                            )}
                          </div>

                          <div className="text-sm text-muted-foreground mb-2">
                            {date.toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                            {assessment.daysSincePrevious && (
                              <span className="ml-2">
                                ({assessment.daysSincePrevious} days since previous)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-xs text-muted-foreground">Score</div>
                              <div className="text-2xl font-bold">
                                {assessment.overallScore.toFixed(2)}
                              </div>
                            </div>

                            {assessment.scoreChange !== undefined && (
                              <div className="flex items-center gap-1">
                                {assessment.scoreChange > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : assessment.scoreChange < 0 ? (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                ) : (
                                  <Minus className="h-4 w-4 text-gray-400" />
                                )}
                                <span className={`text-sm font-medium ${
                                  assessment.scoreChange > 0
                                    ? 'text-green-600'
                                    : assessment.scoreChange < 0
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                                }`}>
                                  {assessment.scoreChange > 0 ? '+' : ''}
                                  {assessment.scoreChange.toFixed(2)}
                                </span>
                                {assessment.improvementRate !== undefined && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({assessment.improvementRate > 0 ? '+' : ''}
                                    {assessment.improvementRate.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <Badge variant="outline" className="mt-2">
                            {assessment.maturityLevel}
                          </Badge>

                          {assessment.levelChange && assessment.levelChange > 0 && (
                            <Badge className="ml-2 mt-2 bg-green-600">
                              <Trophy className="h-3 w-3 mr-1" />
                              Level Up! (+{assessment.levelChange})
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Predicted next score */}
          {predictedNextScore && (
            <div className="relative pl-14 mt-8">
              <div className="absolute left-3.5 w-5 h-5 rounded-full border-2 border-dashed border-purple-400 bg-purple-50" />

              <Card className="border-dashed border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-semibold text-purple-900">
                        Predicted Next Score
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {predictedNextScore.toFixed(2)}
                      </div>
                      <div className="text-sm text-purple-700">
                        Based on current trajectory
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {assessments.length}
            </div>
            <div className="text-xs text-muted-foreground">Total Assessments</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${
              overallImprovement > 0 ? 'text-green-600' : 'text-gray-600'
            }`}>
              {overallImprovement > 0 ? '+' : ''}
              {overallImprovement.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Total Improvement</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {assessments.filter(a => (a.scoreChange || 0) > 0).length}
            </div>
            <div className="text-xs text-muted-foreground">Improvements</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
