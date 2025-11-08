/**
 * Goal Tracker Component
 * Displays and manages progress goals
 *
 * Phase 5B: Progress Tracking
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, Trophy, Calendar, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description?: string;
  goalType: string;
  targetValue: number;
  targetDate: Date;
  status: 'ACTIVE' | 'ACHIEVED' | 'MISSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  progress: {
    currentValue: number;
    percentComplete: number;
    isOnTrack: boolean;
    daysRemaining: number;
  };
  milestones: Array<{
    id: string;
    title: string;
    targetValue: number;
    status: string;
  }>;
}

interface GoalTrackerProps {
  goals: Goal[];
  statistics?: {
    total: number;
    active: number;
    achieved: number;
    achievementRate: number;
  };
}

export function GoalTracker({ goals, statistics }: GoalTrackerProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'achieved'>('active');

  const filteredGoals = goals.filter(g => {
    if (filter === 'active') return g.status === 'ACTIVE';
    if (filter === 'achieved') return g.status === 'ACHIEVED';
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-600';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACHIEVED': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'MISSED': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <Target className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{statistics.total}</div>
                <div className="text-sm text-muted-foreground mt-1">Total Goals</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{statistics.active}</div>
                <div className="text-sm text-muted-foreground mt-1">Active</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{statistics.achieved}</div>
                <div className="text-sm text-muted-foreground mt-1">Achieved</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {statistics.achievementRate.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">Success Rate</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
          size="sm"
        >
          Active
        </Button>
        <Button
          variant={filter === 'achieved' ? 'default' : 'outline'}
          onClick={() => setFilter('achieved')}
          size="sm"
        >
          Achieved
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          All
        </Button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-muted-foreground">No goals found</div>
            </CardContent>
          </Card>
        ) : (
          filteredGoals.map((goal) => {
            const daysClass = goal.progress.daysRemaining < 7
              ? 'text-red-600'
              : goal.progress.daysRemaining < 30
              ? 'text-orange-600'
              : 'text-gray-600';

            return (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(goal.status)}
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        <Badge className={`${getPriorityColor(goal.priority)} text-white`}>
                          {goal.priority}
                        </Badge>
                        {goal.status === 'ACHIEVED' && (
                          <Badge className="bg-green-600">
                            <Trophy className="h-3 w-3 mr-1" />
                            Achieved
                          </Badge>
                        )}
                      </div>
                      {goal.description && (
                        <CardDescription className="mt-1">{goal.description}</CardDescription>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {goal.progress.percentComplete}%
                      </div>
                      <div className="text-xs text-muted-foreground">Complete</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <Progress value={goal.progress.percentComplete} className="h-3" />
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-muted-foreground">
                        Current: {goal.progress.currentValue.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        Target: {goal.targetValue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Time & Status */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className={daysClass}>
                        {goal.progress.daysRemaining > 0
                          ? `${goal.progress.daysRemaining} days remaining`
                          : goal.status === 'ACHIEVED'
                          ? 'Completed'
                          : 'Overdue'}
                      </span>
                    </div>

                    {goal.status === 'ACTIVE' && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className={`h-4 w-4 ${
                          goal.progress.isOnTrack ? 'text-green-600' : 'text-red-600'
                        }`} />
                        <span className={
                          goal.progress.isOnTrack ? 'text-green-600' : 'text-red-600'
                        }>
                          {goal.progress.isOnTrack ? 'On Track' : 'Behind Schedule'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Milestones */}
                  {goal.milestones.length > 0 && (
                    <div className="pt-4 border-t">
                      <div className="text-sm font-medium mb-2">
                        Milestones ({goal.milestones.filter(m => m.status === 'ACHIEVED').length}/{goal.milestones.length} completed)
                      </div>
                      <div className="space-y-1">
                        {goal.milestones.map((milestone) => (
                          <div key={milestone.id} className="flex items-center gap-2 text-sm">
                            {milestone.status === 'ACHIEVED' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
                            )}
                            <span className={milestone.status === 'ACHIEVED' ? 'line-through text-muted-foreground' : ''}>
                              {milestone.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
