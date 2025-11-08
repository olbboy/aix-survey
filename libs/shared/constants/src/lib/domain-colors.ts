// Domain Color Scheme

export const DOMAIN_COLORS = {
  data: '#3B82F6',              // Blue
  infrastructure: '#8B5CF6',    // Purple
  technology: '#10B981',         // Green
  organization: '#F59E0B',       // Amber
  policy: '#EF4444',             // Red
} as const;

export type DomainName = keyof typeof DOMAIN_COLORS;

export function getDomainColor(domain: DomainName): string {
  return DOMAIN_COLORS[domain];
}
