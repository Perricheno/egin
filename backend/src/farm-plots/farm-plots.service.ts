import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmPlot } from './entities/farm-plot.entity';
import { CreateFarmPlotDto } from './dto/create-farm-plot.dto';

@Injectable()
export class FarmPlotsService {
  constructor(
    @InjectRepository(FarmPlot)
    private readonly plotRepository: Repository<FarmPlot>,
  ) {}

  async create(userId: string, dto: CreateFarmPlotDto): Promise<any> {
    try {
      const plot = this.plotRepository.create({
        ...dto,
        userId,
        // PostGIS expects a valid GeoJSON syntax when geometry is saved
        geometry: typeof dto.geometry === 'string' ? JSON.parse(dto.geometry) : dto.geometry
      });

      const savedPlot = await this.plotRepository.save(plot);

      // Now we run Risk analysis for this new plot
      const riskAnalysis = await this.calculateRisk(dto.cropType, dto.seasonYear, savedPlot.geometry);

      return {
        plot: savedPlot,
        analysis: riskAnalysis
      };
    } catch (error) {
       throw new InternalServerErrorException('Error saving farm plot: ' + error.message);
    }
  }

  async calculateRisk(cropType: string, seasonYear: number, geometry: any, radiusMeters = 5000) {
    // We want to find the total sum of hectares of the same crop planted in the vicinity
    
    // We use ST_Centroid to get the center of the newly added polygon
    // ST_DWithin checks if the plots are within `radiusMeters` of the centroid
    
    const queryResult = await this.plotRepository
      .createQueryBuilder('plot')
      .select('SUM(plot.areaSizeHectares)', 'totalHectares')
      .addSelect('COUNT(plot.id)', 'plotCount')
      .where('plot.cropType = :cropType', { cropType })
      .andWhere('plot.seasonYear = :seasonYear', { seasonYear })
      .andWhere(
        'ST_DWithin(plot.geometry, ST_Centroid(ST_GeomFromGeoJSON(:newGeometry)), :distance)'
      )
      .setParameters({ 
        newGeometry: JSON.stringify(geometry),
        distance: radiusMeters 
      })
      .getRawOne();

    const totalHectares = parseFloat(queryResult?.totalHectares || '0');
    const plotCount = parseInt(queryResult?.plotCount || '0', 10);
    
    // Simple logic for overproduction detection to answer the MVP requirement
    // In real env, these thresholds would come from a database or AI model.
    const riskThresholdHa = 200; 

    if (totalHectares > riskThresholdHa) {
      return {
         riskLevel: 'HIGH',
         message: `Внимание: Высок риск перепроизводства! В радиусе ${radiusMeters/1000}км уже запланировано ${totalHectares} Га культуры "${cropType}".`
      };
    } else if (totalHectares > riskThresholdHa / 2) {
      return {
         riskLevel: 'MEDIUM',
         message: `Средний риск. Рядом находится ${totalHectares} Га культуры "${cropType}".`
      };
    } else {
      return {
         riskLevel: 'LOW',
         message: `Отличный выбор. Конкуренция на культуру "${cropType}" в этом районе низкая.`
      };
    }
  }

  findAll(): Promise<FarmPlot[]> {
    return this.plotRepository.find();
  }
}
