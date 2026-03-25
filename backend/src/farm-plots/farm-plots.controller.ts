import { Controller, Get, Post, Body, UseGuards, Req, Patch, Param, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FarmPlotsService } from './farm-plots.service';
import { CreateFarmPlotDto } from './dto/create-farm-plot.dto';

@ApiTags('FarmPlots')
@Controller('farm-plots')
export class FarmPlotsController {
  constructor(private readonly farmPlotsService: FarmPlotsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Creates a new farm plot and returns the overproduction risk analysis.' })
  @ApiResponse({ status: 201, description: 'Calculated risk returned.' })
  async create(@Req() req: any, @Body() dto: CreateFarmPlotDto) {
    const userId = req.user.id;
    const result = await this.farmPlotsService.create(userId, dto);
    return { success: true, data: result };
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all farm plots as GeoJSON entities.' })
  async findAll() {
    const data = await this.farmPlotsService.findAll();
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a farm plot by id.' })
  async update(@Param('id') id: string, @Body() updateData: any) {
    const data = await this.farmPlotsService.update(id, updateData);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a farm plot by id.' })
  async remove(@Param('id') id: string) {
    await this.farmPlotsService.remove(id);
    return { success: true };
  }
}
