import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AssessmentsService } from './assessments.service';
import {
  StartAssessmentDto,
  SaveResponsesDto,
  GenerateUploadUrlDto,
  ConfirmEvidenceDto,
  SendResultsDto,
  CompareAssessmentsDto,
} from './dto';

@ApiTags('assessments')
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  /**
   * Start new assessment
   * POST /assessments/start
   */
  @Post('start')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start new assessment',
    description: 'Create new assessment for guest or authenticated user. Returns sessionId for guests.',
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment created successfully',
    schema: {
      example: {
        assessmentId: 'assess-123',
        sessionId: 'guest-session-abc',
        templateVersion: 'v1.0',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'No active template found' })
  async startAssessment(@Body() dto: StartAssessmentDto, @CurrentUser() user?: any) {
    return this.assessmentsService.startAssessment(dto, user?.id);
  }

  /**
   * Get assessment with template and responses
   * GET /assessments/:id
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get assessment details',
    description: 'Retrieve assessment with template, items, and responses. Supports both authenticated users and guests.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getAssessment(@Param('id') id: string, @CurrentUser() user?: any, @Req() req?: Request) {
    const sessionId = req?.cookies?.['assessment_session'];
    return this.assessmentsService.getAssessment(id, user?.id, sessionId);
  }

  /**
   * Save/autosave responses
   * PATCH /assessments/:id/responses
   */
  @Patch(':id/responses')
  @Public()
  @ApiOperation({
    summary: 'Save assessment responses',
    description: 'Autosave responses for an assessment. Supports both authenticated users and guests.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'Responses saved successfully',
    schema: {
      example: {
        success: true,
        savedAt: '2025-01-08T00:00:00.000Z',
        progress: 75,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async saveResponses(
    @Param('id') id: string,
    @Body() dto: SaveResponsesDto,
    @CurrentUser() user?: any,
    @Req() req?: Request
  ) {
    const sessionId = req?.cookies?.['assessment_session'];
    return this.assessmentsService.saveResponses(id, dto, user?.id, sessionId);
  }

  /**
   * Finalize assessment
   * POST /assessments/:id/finalize
   */
  @Post(':id/finalize')
  @Public()
  @ApiOperation({
    summary: 'Finalize assessment',
    description: 'Complete assessment and create immutable snapshot with calculated scores.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment finalized successfully',
    schema: {
      example: {
        snapshotId: 'snapshot-123',
        scores: {
          itemScores: {},
          domainScores: {},
          totalScore: 3.75,
          maturityLevel: 'Quản lý',
          maturityLevelEn: 'Managed',
          completeness: 95,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Assessment incomplete or validation failed' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async finalizeAssessment(@Param('id') id: string, @CurrentUser() user?: any, @Req() req?: Request) {
    const sessionId = req?.cookies?.['assessment_session'];
    return this.assessmentsService.finalizeAssessment(id, user?.id, sessionId);
  }

  /**
   * Get assessment results
   * GET /assessments/:id/results
   */
  @Get(':id/results')
  @Public()
  @ApiOperation({
    summary: 'Get assessment results',
    description: 'Retrieve calculated results with analysis, strengths, weaknesses, and recommendations.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'Results retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Assessment not finalized yet' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getResults(@Param('id') id: string, @CurrentUser() user?: any, @Req() req?: Request) {
    const sessionId = req?.cookies?.['assessment_session'];
    return this.assessmentsService.getResults(id, user?.id, sessionId);
  }

  /**
   * List evidence files
   * GET /assessments/:id/evidence
   */
  @Get(':id/evidence')
  @Public()
  @ApiOperation({
    summary: 'List evidence files',
    description: 'Get all evidence files uploaded for this assessment.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'Evidence list retrieved successfully',
    schema: {
      example: {
        assessmentId: 'assess-123',
        count: 3,
        evidences: [],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async listEvidence(@Param('id') id: string) {
    return this.assessmentsService.listEvidence(id);
  }

  /**
   * Generate upload URL for evidence
   * POST /assessments/:id/evidence/upload-url
   */
  @Post(':id/evidence/upload-url')
  @Public()
  @ApiOperation({
    summary: 'Generate presigned upload URL',
    description: 'Generate a presigned URL for client-side file upload.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'Upload URL generated successfully',
    schema: {
      example: {
        uploadUrl: 'https://storage.example.com/upload/...',
        fileKey: 'assessments/assess-123/evidence/file.pdf',
        expiresIn: 3600,
        assessmentId: 'assess-123',
        itemCode: 'DATA_01',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed or assessment status invalid' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async generateUploadUrl(@Param('id') id: string, @Body() dto: GenerateUploadUrlDto) {
    return this.assessmentsService.generateUploadUrl(id, dto);
  }

  /**
   * Confirm evidence upload
   * POST /assessments/:id/evidence/confirm
   */
  @Post(':id/evidence/confirm')
  @Public()
  @ApiOperation({
    summary: 'Confirm evidence upload',
    description: 'Create evidence record after successful upload.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 201,
    description: 'Evidence confirmed successfully',
  })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async confirmEvidence(@Param('id') id: string, @Body() dto: ConfirmEvidenceDto, @CurrentUser() user?: any) {
    return this.assessmentsService.confirmEvidence(id, dto, user?.id);
  }

  /**
   * Download evidence file
   * GET /assessments/:id/evidence/:evidenceId/download
   */
  @Get(':id/evidence/:evidenceId/download')
  @Public()
  @ApiOperation({
    summary: 'Download evidence file',
    description: 'Generate presigned download URL for evidence file.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiParam({ name: 'evidenceId', description: 'Evidence ID' })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    schema: {
      example: {
        downloadUrl: 'https://storage.example.com/download/...',
        fileName: 'document.pdf',
        fileSize: 1048576,
        expiresIn: 3600,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  async downloadEvidence(@Param('id') id: string, @Param('evidenceId') evidenceId: string) {
    return this.assessmentsService.downloadEvidence(id, evidenceId);
  }

  /**
   * Delete evidence file
   * DELETE /assessments/:id/evidence/:evidenceId
   */
  @Delete(':id/evidence/:evidenceId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete evidence file',
    description: 'Delete evidence file from storage and database.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiParam({ name: 'evidenceId', description: 'Evidence ID' })
  @ApiResponse({
    status: 200,
    description: 'Evidence deleted successfully',
    schema: {
      example: { success: true },
    },
  })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  async deleteEvidence(@Param('id') id: string, @Param('evidenceId') evidenceId: string) {
    return this.assessmentsService.deleteEvidence(id, evidenceId);
  }

  /**
   * Export assessment as PDF
   * GET /assessments/:id/export/pdf
   */
  @Get(':id/export/pdf')
  @Public()
  @ApiOperation({
    summary: 'Export assessment as PDF',
    description: 'Generate and download PDF report for the assessment.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
  })
  @ApiResponse({ status: 400, description: 'Assessment must be finalized before exporting' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async exportPdf(@Param('id') id: string) {
    return this.assessmentsService.exportPdf(id);
  }

  /**
   * Export assessment as CSV
   * GET /assessments/:id/export/csv
   */
  @Get(':id/export/csv')
  @Public()
  @ApiOperation({
    summary: 'Export assessment as CSV',
    description: 'Generate and download CSV export for the assessment.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'CSV generated successfully',
  })
  @ApiResponse({ status: 400, description: 'Assessment must be finalized before exporting' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async exportCsv(@Param('id') id: string) {
    return this.assessmentsService.exportCsv(id);
  }

  /**
   * Send results via email
   * POST /assessments/:id/send-results
   */
  @Post(':id/send-results')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send results via email',
    description: 'Email assessment results to specified address.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'Results sent successfully',
    schema: {
      example: {
        success: true,
        message: 'Results sent successfully',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async sendResults(@Param('id') id: string, @Body() dto: SendResultsDto) {
    return this.assessmentsService.sendResults(id, dto);
  }

  /**
   * Compare two assessments
   * GET /assessments/compare
   */
  @Get('compare')
  @Public()
  @ApiOperation({
    summary: 'Compare two assessments',
    description: 'Compare two assessments side-by-side or get suggested comparisons for an organization.',
  })
  @ApiQuery({ name: 'from', description: 'From assessment ID', required: false })
  @ApiQuery({ name: 'to', description: 'To assessment ID', required: false })
  @ApiQuery({ name: 'organizationId', description: 'Organization ID for suggestions', required: false })
  @ApiResponse({
    status: 200,
    description: 'Comparison retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 404, description: 'Comparison not available' })
  async compareAssessments(@Query() dto: CompareAssessmentsDto) {
    return this.assessmentsService.compareAssessments(dto);
  }

  /**
   * Compare assessment to benchmarks
   * GET /assessments/:id/benchmark
   */
  @Get(':id/benchmark')
  @Public()
  @ApiOperation({
    summary: 'Compare to industry benchmarks',
    description: 'Compare assessment scores against industry benchmarks.',
  })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'Benchmark comparison retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Assessment not found or not finalized' })
  async compareToBenchmarks(@Param('id') id: string) {
    return this.assessmentsService.compareToBenchmarks(id);
  }
}
