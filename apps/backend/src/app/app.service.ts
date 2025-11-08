import { Injectable } from '@nestjs/common';
import { PrismaService } from '@aix-survey/database';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    const databaseStatus = await this.checkDatabaseConnection();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: databaseStatus,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async getStatus() {
    const databaseStatus = await this.checkDatabaseConnection();

    return {
      service: 'AIX Survey Backend API',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: this.formatUptime(process.uptime()),
      },
      database: {
        status: databaseStatus,
        type: 'PostgreSQL',
      },
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
      node: process.version,
      platform: process.platform,
    };
  }

  private async checkDatabaseConnection(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch (error) {
      return 'disconnected';
    }
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }
}
