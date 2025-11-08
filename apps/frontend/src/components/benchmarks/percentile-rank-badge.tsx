/**
 * Percentile Rank Badge Component
 * Displays percentile ranking with visual styling
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Star } from 'lucide-react';

interface PercentileRankBadgeProps {
  percentile: number;
  ranking: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PercentileRankBadge({
  percentile,
  ranking,
  size = 'md',
}: PercentileRankBadgeProps) {
  const getColorClass = () => {
    if (percentile >= 90) return 'bg-yellow-500 hover:bg-yellow-600 text-white';
    if (percentile >= 75) return 'bg-blue-500 hover:bg-blue-600 text-white';
    if (percentile >= 50) return 'bg-green-500 hover:bg-green-600 text-white';
    if (percentile >= 25) return 'bg-orange-500 hover:bg-orange-600 text-white';
    return 'bg-red-500 hover:bg-red-600 text-white';
  };

  const getIcon = () => {
    if (percentile >= 90) return <Trophy className="h-4 w-4" />;
    if (percentile >= 75) return <Medal className="h-4 w-4" />;
    if (percentile >= 50) return <Award className="h-4 w-4" />;
    return <Star className="h-4 w-4" />;
  };

  const sizeClass = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }[size];

  return (
    <Badge className={`${getColorClass()} ${sizeClass} flex items-center gap-1.5 font-semibold`}>
      {getIcon()}
      <span>{ranking}</span>
      <span className="opacity-90">({percentile}th)</span>
    </Badge>
  );
}
