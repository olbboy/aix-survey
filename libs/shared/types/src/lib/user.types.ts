// User-related types and interfaces

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER',
  RESPONDENT = 'RESPONDENT',
  VIEWER = 'VIEWER',
}

export interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}
