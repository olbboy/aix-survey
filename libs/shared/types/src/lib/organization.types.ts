// Organization-related types and interfaces

export interface Organization {
  id: string;
  name: string;
  industry?: string;
  size?: OrganizationSize;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrganizationSize {
  SMALL = 'SMALL',           // < 50 employees
  MEDIUM = 'MEDIUM',         // 50-250 employees
  LARGE = 'LARGE',           // 250-1000 employees
  ENTERPRISE = 'ENTERPRISE', // > 1000 employees
}

export interface CreateOrganizationInput {
  name: string;
  industry?: string;
  size?: OrganizationSize;
}

export interface UpdateOrganizationInput {
  name?: string;
  industry?: string;
  size?: OrganizationSize;
}
