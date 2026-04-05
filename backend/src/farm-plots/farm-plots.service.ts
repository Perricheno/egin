import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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

  private normalizeGeometry(rawGeometry: unknown) {
    const geometry =
      typeof rawGeometry === 'string' ? JSON.parse(rawGeometry) : rawGeometry;

    if (!geometry || typeof geometry !== 'object') {
      throw new Error('Geometry is missing or invalid');
    }

    const polygon = geometry as { type?: string; coordinates?: unknown };

    if (polygon.type !== 'Polygon' || !Array.isArray(polygon.coordinates)) {
      throw new Error('Only Polygon GeoJSON is supported');
    }

    const normalizedCoordinates = polygon.coordinates.map((ring) => {
      if (!Array.isArray(ring) || ring.length < 4) {
        throw new Error('Polygon ring must contain at least 4 points');
      }

      const normalizedRing = ring.map((point) => {
        if (
          !Array.isArray(point) ||
          point.length < 2 ||
          typeof point[0] !== 'number' ||
          typeof point[1] !== 'number'
        ) {
          throw new Error('Polygon point is invalid');
        }

        return [point[0], point[1]];
      });

      const firstPoint = normalizedRing[0];
      const lastPoint = normalizedRing[normalizedRing.length - 1];

      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        normalizedRing.push([...firstPoint]);
      }

      return normalizedRing;
    });

    return {
      type: 'Polygon',
      coordinates: normalizedCoordinates,
    };
  }

  private toCompetitionLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 0.67) {
      return 'high';
    }

    if (score >= 0.34) {
      return 'medium';
    }

    return 'low';
  }

  private calculateCompetitionScore(input: {
    nearbyAreaHectares: number;
    nearbyPlotCount: number;
    radiusKm: number;
  }) {
    const normalizedArea = Math.min(input.nearbyAreaHectares / 200, 1);
    const normalizedPlotCount = Math.min(input.nearbyPlotCount / 10, 1);
    const normalizedRadiusWeight = input.radiusKm <= 5 ? 1 : Math.min(5 / input.radiusKm, 1);

    const score =
      normalizedArea * 0.55 +
      normalizedPlotCount * 0.35 +
      normalizedRadiusWeight * 0.1;

    return Number(Math.min(Math.max(score, 0), 1).toFixed(2));
  }

  private calculateConfidence(input: {
    nearbyPlotCount: number;
    hasCropType: boolean;
    areaSizeHectares: number;
  }) {
    if (!input.hasCropType) {
      return 0.2;
    }

    const plotDensitySignal = Math.min(input.nearbyPlotCount / 5, 1);
    const areaSignal = input.areaSizeHectares > 0 ? 1 : 0.5;

    return Number((0.45 + plotDensitySignal * 0.35 + areaSignal * 0.2).toFixed(2));
  }

  async create(userId: string, dto: CreateFarmPlotDto): Promise<any> {
    try {
      const normalizedGeometry = this.normalizeGeometry(dto.geometry);

      const plot = this.plotRepository.create({
        ...dto,
        userId,
        geometry: null,
      });

      const createdPlot = await this.plotRepository.save(plot);

      await this.plotRepository.query(
        `
          UPDATE farm_plots
          SET geometry = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
          WHERE id = $2
        `,
        [JSON.stringify(normalizedGeometry), createdPlot.id],
      );

      const savedPlot = await this.plotRepository.findOneByOrFail({
        id: createdPlot.id,
      });

      // Now we run Risk analysis for this new plot
      const riskAnalysis = await this.calculateRisk(
        dto.cropType,
        dto.seasonYear,
        normalizedGeometry,
      );

      const competition = await this.getCompetitionByPlotId(createdPlot.id);
      const projectedIncomeKzt = Math.round(
        Number(savedPlot.areaSizeHectares || 0) *
          (competition.level === 'low'
            ? 420000
            : competition.level === 'medium'
              ? 310000
              : 240000),
      );

      return {
        plot: savedPlot,
        analysis: riskAnalysis,
        competition,
        projectedIncomeKzt,
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

  async getCompetitionByPlotId(id: string, radiusKm = 5) {
    if (!radiusKm || Number(radiusKm) <= 0) {
      throw new BadRequestException('radiusKm must be greater than 0');
    }

    const plot = await this.plotRepository.findOne({
      where: { id },
    });

    if (!plot) {
      throw new NotFoundException('Farm plot not found');
    }

    if (!plot.cropType) {
      return {
        plotId: plot.id,
        cropType: null,
        radiusKm,
        score: 0,
        level: 'low',
        confidence: 0.2,
        nearbyAreaHectares: 0,
        nearbyPlotCount: 0,
        marketplaceVisibility: 'hidden',
        explanation:
          'Участок пока без культуры. Сначала назначьте crop, чтобы система могла посчитать конкуренцию.',
      };
    }

    const queryResult = await this.plotRepository.query(
      `
        SELECT
          COALESCE(SUM(fp."areaSizeHectares"), 0) AS "nearbyAreaHectares",
          COUNT(fp.id) AS "nearbyPlotCount"
        FROM farm_plots fp
        WHERE fp."cropType" = $1
          AND fp."seasonYear" = $2
          AND fp.id <> $3
          AND fp.geometry IS NOT NULL
          AND ST_DWithin(
            fp.geometry::geography,
            ST_Centroid((
              SELECT geometry
              FROM farm_plots
              WHERE id = $3
            ))::geography,
            $4
          )
      `,
      [plot.cropType, plot.seasonYear, plot.id, radiusKm * 1000],
    );

    const rawStats = queryResult?.[0] ?? {};
    const nearbyAreaHectares = Number(rawStats.nearbyAreaHectares || 0);
    const nearbyPlotCount = Number(rawStats.nearbyPlotCount || 0);
    const score = this.calculateCompetitionScore({
      nearbyAreaHectares,
      nearbyPlotCount,
      radiusKm,
    });
    const level = this.toCompetitionLevel(score);
    const confidence = this.calculateConfidence({
      nearbyPlotCount,
      hasCropType: Boolean(plot.cropType),
      areaSizeHectares: Number(plot.areaSizeHectares || 0),
    });
    const marketplaceVisibility = level === 'low' ? 'hidden' : 'visible';

    const explanation =
      level === 'high'
        ? `В радиусе ${radiusKm} км уже много участков с культурой "${plot.cropType}". Публикация в маркетплейсе разрешена, но маржа может снижаться из-за насыщения.`
        : level === 'medium'
          ? `По культуре "${plot.cropType}" конкуренция умеренная. Стоит следить за ценой и соседними посевами в радиусе ${radiusKm} км.`
          : `По культуре "${plot.cropType}" конкуренция низкая в радиусе ${radiusKm} км. По вашему MVP-правилу такой товар лучше скрывать из маркетплейса.`;

    return {
      plotId: plot.id,
      cropType: plot.cropType,
      radiusKm,
      score,
      level,
      confidence,
      nearbyAreaHectares: Number(nearbyAreaHectares.toFixed(2)),
      nearbyPlotCount,
      marketplaceVisibility,
      explanation,
      factors: {
        sameCropAreaWeight: 0.55,
        sameCropPlotCountWeight: 0.35,
        radiusWeight: 0.1,
      },
    };
  }

  async update(id: string, updateData: Partial<FarmPlot>): Promise<FarmPlot> {
    await this.plotRepository.update(id, updateData);
    return this.plotRepository.findOneByOrFail({ id });
  }

  async remove(id: string): Promise<void> {
    await this.plotRepository.delete(id);
  }
}
