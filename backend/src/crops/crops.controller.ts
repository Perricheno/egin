import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CropsService } from './crops.service';
import { CreateCropDto } from './dto/create-crop.dto';

@ApiTags('Crops Catalog')
@Controller('crops')
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new crop type in the catalog' })
  create(@Body() createCropDto: CreateCropDto) {
    return this.cropsService.create(createCropDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all available crop types' })
  findAll() {
    return this.cropsService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update crop details' })
  update(@Param('id') id: string, @Body() updateCropDto: Partial<CreateCropDto>) {
    return this.cropsService.update(id, updateCropDto);
  }
}
