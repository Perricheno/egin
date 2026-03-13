import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmPlot } from '../farm-plots/entities/farm-plot.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(FarmPlot)
    private readonly plotRepository: Repository<FarmPlot>,
  ) {}

  async getRegionStats(region: string) {
    if (!region) throw new BadRequestException('Region is required');

    return this.plotRepository
      .createQueryBuilder('plot')
      .select('plot.cropType', 'cropType')
      .addSelect('SUM(plot.areaSizeHectares)', 'totalHectares')
      .addSelect('COUNT(plot.id)', 'farmsCount')
      .where('plot.region = :region', { region })
      .groupBy('plot.cropType')
      .getRawMany();
  }

  async getOverproductionRisk(lat: number, lng: number, cropType: string, radiusKm = 50) {
    if (!lat || !lng || !cropType) throw new BadRequestException('lat, lng, and cropType are required');

    const result = await this.plotRepository
      .createQueryBuilder('plot')
      .select('SUM(plot.areaSizeHectares)', 'totalHectares')
      .where('plot.cropType = :cropType', { cropType })
      .andWhere(
        'ST_DWithin(plot.geometry, ST_MakePoint(:lng, :lat)::geography, :distance)'
      )
      .setParameters({ 
        lng, 
        lat, 
        distance: radiusKm * 1000 
      })
      .getRawOne();
      
    const ha = parseFloat(result?.totalHectares || '0');
    
    // Abstract risk threshold calculation logic
    let riskLevel = 'LOW';
    if (ha > 500) {
      riskLevel = 'HIGH';
    } else if (ha > 200) {
      riskLevel = 'MEDIUM';
    }

    return {
      cropType,
      radiusKm,
      totalHectaresPlanted: ha,
      riskLevel
    };
  }

  async getCropDensity(lat: number, lng: number, radiusKm = 50) {
    if (!lat || !lng) throw new BadRequestException('lat and lng are required');

    return this.plotRepository
      .createQueryBuilder('plot')
      .select('plot.cropType', 'cropType')
      .addSelect('SUM(plot.areaSizeHectares)', 'totalHectares')
      .where(
        'ST_DWithin(plot.geometry, ST_MakePoint(:lng, :lat)::geography, :distance)'
      )
      .setParameters({ 
        lng, 
        lat, 
        distance: radiusKm * 1000 
      })
      .groupBy('plot.cropType')
      .orderBy('totalHectares', 'DESC')
      .getRawMany();
  }
}
