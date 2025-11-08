import { Module } from '@nestjs/common';
import { DatabaseModule } from '@aix-survey/database';
import { GoalsModule } from '../goals/goals.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [DatabaseModule, GoalsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
