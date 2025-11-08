import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
      errorFormat: 'pretty',
    });

    // Log Prisma warnings and errors
    this.$on('warn' as never, (e: any) => {
      this.logger.warn(e);
    });

    this.$on('error' as never, (e: any) => {
      this.logger.error(e);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Enable database query logging in development
   */
  enableQueryLogging() {
    this.$on('query' as never, (e: any) => {
      this.logger.debug(`Query: ${e.query}`);
      this.logger.debug(`Duration: ${e.duration}ms`);
    });
  }

  /**
   * Clean database (for testing purposes only)
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Object.keys(this).filter(
      (key) => !key.startsWith('_') && !key.startsWith('$')
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = this[modelKey as keyof this] as any;
        if (model && typeof model.deleteMany === 'function') {
          return model.deleteMany();
        }
      })
    );
  }
}
