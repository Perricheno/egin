import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmPlot } from '../farm-plots/entities/farm-plot.entity';
import {
  ListingStatus,
  MarketplaceListing,
} from '../marketplace/entities/marketplace-listing.entity';

type CompetitionLevel = 'low' | 'medium' | 'high';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(FarmPlot)
    private readonly plotRepository: Repository<FarmPlot>,
    @InjectRepository(MarketplaceListing)
    private readonly listingRepository: Repository<MarketplaceListing>,
  ) {}

  private calculateCompetition(areaSizeHectares: number) {
    const safeArea = Number(areaSizeHectares || 0);

    if (safeArea >= 200) {
      return { score: 0.85, level: 'high' as CompetitionLevel };
    }

    if (safeArea >= 80) {
      return { score: 0.55, level: 'medium' as CompetitionLevel };
    }

    return { score: 0.2, level: 'low' as CompetitionLevel };
  }

  private buildInsight(level: CompetitionLevel, cropName: string | null) {
    if (!cropName) {
      return {
        title: 'Добавьте культуру',
        message:
          'Назначьте культуру хотя бы одному участку, чтобы получить анализ конкуренции и прогноз дохода.',
        confidence: 0.25,
      };
    }

    if (level === 'high') {
      return {
        title: 'Высокая конкуренция',
        message: `По культуре "${cropName}" уже высокая плотность. Лучше проверить альтернативную культуру или другое окно продаж.`,
        confidence: 0.78,
      };
    }

    if (level === 'medium') {
      return {
        title: 'Средняя конкуренция',
        message: `По культуре "${cropName}" ситуация умеренная. Стоит следить за соседними посевами и ценой в маркетплейсе.`,
        confidence: 0.66,
      };
    }

    return {
      title: 'Низкая конкуренция',
      message: `По культуре "${cropName}" конкуренция низкая. Это хороший кандидат для фокусной посадки, но listing можно скрывать по вашей стратегии niche-first.`,
      confidence: 0.72,
    };
  }

  async getHomeDashboard(userId: string) {
    const [plots, activeListings] = await Promise.all([
      this.plotRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      }),
      this.listingRepository.count({
        where: {
          farmerId: userId,
          status: ListingStatus.ACTIVE,
        },
      }),
    ]);

    const totalArea = plots.reduce(
      (sum, plot) => sum + Number(plot.areaSizeHectares || 0),
      0,
    );

    const cropBuckets = new Map<
      string,
      { area: number; plotCount: number; fillColor: string | null }
    >();

    for (const plot of plots) {
      if (!plot.cropType) {
        continue;
      }

      const current = cropBuckets.get(plot.cropType) ?? {
        area: 0,
        plotCount: 0,
        fillColor: plot.fillColor ?? null,
      };

      current.area += Number(plot.areaSizeHectares || 0);
      current.plotCount += 1;
      current.fillColor = current.fillColor ?? plot.fillColor ?? null;
      cropBuckets.set(plot.cropType, current);
    }

    const cropSummaries = Array.from(cropBuckets.entries())
      .map(([cropType, data]) => {
        const competition = this.calculateCompetition(data.area);

        return {
          cropType,
          areaHectares: Number(data.area.toFixed(2)),
          plotsCount: data.plotCount,
          fillColor: data.fillColor,
          competitionLevel: competition.level,
          competitionScore: competition.score,
        };
      })
      .sort((left, right) => right.areaHectares - left.areaHectares);

    const dominantCrop = cropSummaries[0] ?? null;
    const averageCompetitionScore =
      cropSummaries.length > 0
        ? cropSummaries.reduce((sum, crop) => sum + crop.competitionScore, 0) /
          cropSummaries.length
        : 0;

    const averageCompetitionLevel = this.calculateCompetition(
      averageCompetitionScore * 200,
    ).level;

    const projectedIncome =
      cropSummaries.reduce(
        (sum, crop) =>
          sum + crop.areaHectares * (crop.competitionLevel === 'low' ? 420000 : 310000),
        0,
      ) || 0;

    const insight = this.buildInsight(
      dominantCrop?.competitionLevel ?? 'low',
      dominantCrop?.cropType ?? null,
    );

    return {
      stats: {
        totalPlots: plots.length,
        cropsCount: cropSummaries.length,
        totalAreaHectares: Number(totalArea.toFixed(2)),
        averageCompetitionLevel,
        averageCompetitionScore: Number(averageCompetitionScore.toFixed(2)),
        projectedIncomeKzt: Math.round(projectedIncome),
        activeListings,
      },
      crops: cropSummaries,
      weather: {
        status: 'pending_provider',
        summary:
          'Погодный провайдер еще не подключен. На следующем этапе сюда добавим текущую погоду и 7-14 дневный прогноз.',
      },
      insight,
    };
  }

  async getNotifications(userId: string) {
    const [plots, activeListings] = await Promise.all([
      this.plotRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      }),
      this.listingRepository.count({
        where: {
          farmerId: userId,
          status: ListingStatus.ACTIVE,
        },
      }),
    ]);

    const notifications: Array<{
      id: string;
      type: 'info' | 'warning' | 'success';
      title: string;
      message: string;
    }> = [];

    const unassignedPlots = plots.filter((plot) => !plot.cropType).length;
    if (unassignedPlots > 0) {
      notifications.push({
        id: 'assign-crop',
        type: 'warning',
        title: 'Назначьте культуру',
        message: `У вас ${unassignedPlots} участков без культуры. Без этого AI не сможет посчитать конкуренцию.`,
      });
    }

    const highCompetitionPlots = plots.filter(
      (plot) => this.calculateCompetition(Number(plot.areaSizeHectares || 0)).level === 'high',
    ).length;
    if (highCompetitionPlots > 0) {
      notifications.push({
        id: 'competition-high',
        type: 'warning',
        title: 'Есть участки с высокой конкуренцией',
        message: `Найдено ${highCompetitionPlots} участков, где конкуренция по площади уже высокая.`,
      });
    }

    if (plots.length > 0 && activeListings === 0) {
      notifications.push({
        id: 'marketplace-empty',
        type: 'info',
        title: 'Маркетплейс пока пустой',
        message:
          'У вас есть поля, но нет активных объявлений. После добавления visibility rule часть культур можно публиковать автоматически.',
      });
    }

    if (notifications.length === 0) {
      notifications.push({
        id: 'all-good',
        type: 'success',
        title: 'Система в порядке',
        message:
          'Ключевые данные заполнены. Следующий шаг: подключить погоду, чат и AI-рекомендации.',
      });
    }

    return notifications;
  }

  async getInsights(userId: string) {
    const dashboard = await this.getHomeDashboard(userId);

    return {
      summary: dashboard.insight,
      drivers: [
        {
          label: 'competition',
          impact: dashboard.stats.averageCompetitionScore,
        },
        {
          label: 'crop_mix',
          impact: dashboard.stats.cropsCount > 1 ? 0.62 : 0.39,
        },
        {
          label: 'market_readiness',
          impact: dashboard.stats.activeListings > 0 ? 0.74 : 0.31,
        },
      ],
      explainability: {
        model: 'rule-based-mvp',
        notes:
          'Insight построен на реальных данных полей и объявлений, без синтетической погоды и без внешнего ML.',
      },
    };
  }
}
