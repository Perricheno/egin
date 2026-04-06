import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Return service categories.' })
  async getCategories() {
    const data = await this.servicesService.getCategories();
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Return service listings with filters.' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'district', required: false })
  @ApiQuery({ name: 'urgent', required: false })
  async list(
    @Query('category') category?: string,
    @Query('region') region?: string,
    @Query('district') district?: string,
    @Query('urgent') urgent?: string,
  ) {
    const data = await this.servicesService.listServices({
      category,
      region,
      district,
      urgent,
    });

    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Return a single service listing.' })
  async getOne(@Param('id') id: string) {
    const data = await this.servicesService.getServiceById(id);
    if (!data) {
      throw new NotFoundException('Service not found');
    }

    return { success: true, data };
  }
}
