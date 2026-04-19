import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { AiAdviceService } from './ai-advice.service';

type AuthRequest = {
  user: {
    id: string;
    role: UserRole;
  };
};

@ApiTags('AI')
@Controller('farm-plots/:plotId/ai-advice')
export class AiAdviceController {
  constructor(private readonly aiAdviceService: AiAdviceService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get an AI-assisted practical advice for a farm plot.' })
  async getPlotAdvice(
    @Req() req: AuthRequest,
    @Param('plotId') plotId: string,
  ) {
    const data = await this.aiAdviceService.getPlotAdvice(
      plotId,
      req.user.id,
      req.user.role,
    );
    return { success: true, data };
  }
}
