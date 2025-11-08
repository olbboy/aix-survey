import { Module } from '@nestjs/common';
import { DatabaseModule } from '@aix-survey/database';
import { BenchmarksController } from './benchmarks.controller';
import { BenchmarksService } from './benchmarks.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BenchmarksController],
  providers: [BenchmarksService],
  exports: [BenchmarksService],
})
export class BenchmarksModule {}
