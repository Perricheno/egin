import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmActivity } from '../farm-activities/entities/farm-activity.entity';
import { FarmPlot } from '../farm-plots/entities/farm-plot.entity';
import { UserRole } from '../users/entities/user.entity';
import { WeatherService } from '../weather/weather.service';

type AiAdvice = {
  source: 'openai' | 'fallback';
  title: string;
  summary: string;
  actions: string[];
  risks: string[];
  confidenceNote: string;
};

@Injectable()
export class AiAdviceService {
  private readonly logger = new Logger(AiAdviceService.name);

  constructor(
    @InjectRepository(FarmPlot)
    private readonly plotRepository: Repository<FarmPlot>,
    @InjectRepository(FarmActivity)
    private readonly activityRepository: Repository<FarmActivity>,
    private readonly weatherService: WeatherService,
    private readonly configService: ConfigService,
  ) {}

  private async getAccessiblePlotOrFail(
    plotId: string,
    userId: string,
    role: UserRole,
  ) {
    const plot = await this.plotRepository.findOne({ where: { id: plotId } });

    if (!plot) {
      throw new NotFoundException('Farm plot not found');
    }

    if (role !== UserRole.ADMIN && plot.userId !== userId) {
      throw new ForbiddenException('You do not have access to this farm plot');
    }

    return plot;
  }

  private getDaysSince(date?: Date | string | null) {
    if (!date) return null;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;

    return Math.max(
      0,
      Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)),
    );
  }

  private summarizeActivity(activity: FarmActivity) {
    return {
      type: activity.type,
      activityDate: activity.activityDate,
      description: activity.description ?? null,
      costKzt: Number(activity.costKzt || 0),
      materials: activity.materials ?? [],
    };
  }

  private buildFallbackAdvice(input: {
    plot: FarmPlot;
    activities: FarmActivity[];
    weather: Awaited<ReturnType<WeatherService['getForecast']>> | null;
  }): AiAdvice {
    const { plot, activities, weather } = input;
    const daysSincePlanting = this.getDaysSince(plot.plantingDate);
    const latestActivity = activities[0] ?? null;
    const totalCost = activities.reduce(
      (sum, activity) => sum + Number(activity.costKzt || 0),
      0,
    );
    const hasHeatRisk = weather?.alerts?.some((alert) => alert.type === 'heat');
    const hasRain = weather?.alerts?.some((alert) => alert.type === 'rain');
    const hasWind = weather?.alerts?.some((alert) => alert.type === 'wind');

    const actions = [
      latestActivity
        ? `Проверьте результат последней работы: ${latestActivity.type} от ${String(latestActivity.activityDate).slice(0, 10)}.`
        : 'Добавьте первую запись в журнал: полив, осмотр или расход.',
      hasHeatRisk
        ? 'Из-за жары проверьте влажность почвы утром или вечером.'
        : 'Проведите короткий осмотр участка и зафиксируйте состояние культуры.',
      totalCost > 0
        ? `Расходы сезона уже ${Math.round(totalCost).toLocaleString('ru-RU')} ₸. Продолжайте вести учет.`
        : 'Начните фиксировать расходы, чтобы видеть экономику сезона.',
    ];

    const risks = [
      hasRain ? 'Осадки могут изменить график полива и обработки.' : null,
      hasWind ? 'Сильный ветер может повысить риск пересыхания почвы.' : null,
      !plot.plantingDate
        ? 'Дата посадки не указана, поэтому прогноз стадии роста ограничен.'
        : null,
    ].filter((item): item is string => Boolean(item));

    return {
      source: 'fallback',
      title: `Совет по участку "${plot.title}"`,
      summary: `${plot.cropType || 'Культура'}${
        daysSincePlanting !== null ? `, ${daysSincePlanting} дн. после посадки` : ''
      }. Данные рассчитаны локально по журналу, погоде и параметрам участка.`,
      actions,
      risks: risks.length ? risks : ['Критичных рисков по текущим данным не видно.'],
      confidenceNote:
        'Это базовая рекомендация без OpenAI. Для более точного совета добавьте OPENAI_API_KEY.',
    };
  }

  private extractOutputText(response: any) {
    if (typeof response?.output_text === 'string') {
      return response.output_text;
    }

    const output = Array.isArray(response?.output) ? response.output : [];
    return output
      .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
      .map((content: any) => content?.text)
      .filter((text: unknown): text is string => typeof text === 'string')
      .join('\n')
      .trim();
  }

  private parseAdvice(text: string): Omit<AiAdvice, 'source'> | null {
    try {
      const parsed = JSON.parse(text);
      const actions = Array.isArray(parsed.actions)
        ? parsed.actions.filter((item: unknown) => typeof item === 'string')
        : [];
      const risks = Array.isArray(parsed.risks)
        ? parsed.risks.filter((item: unknown) => typeof item === 'string')
        : [];

      if (
        typeof parsed.title !== 'string' ||
        typeof parsed.summary !== 'string' ||
        actions.length === 0
      ) {
        return null;
      }

      return {
        title: parsed.title,
        summary: parsed.summary,
        actions: actions.slice(0, 4),
        risks: risks.slice(0, 4),
        confidenceNote:
          typeof parsed.confidenceNote === 'string'
            ? parsed.confidenceNote
            : 'AI совет носит справочный характер и не заменяет агронома.',
      };
    } catch {
      return null;
    }
  }

  private async callOpenAi(input: {
    plot: FarmPlot;
    activities: FarmActivity[];
    weather: Awaited<ReturnType<WeatherService['getForecast']>> | null;
  }): Promise<AiAdvice | null> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is missing. Using fallback AI advice.');
      return null;
    }

    const model =
      this.configService.get<string>('OPENAI_MODEL')?.trim() ||
      'gpt-5-mini-2025-08-07';
    const context = {
      plot: {
        title: input.plot.title,
        cropType: input.plot.cropType,
        region: input.plot.region,
        district: input.plot.district,
        village: input.plot.village,
        areaSizeHectares: Number(input.plot.areaSizeHectares || 0),
        seasonYear: input.plot.seasonYear,
        plantingDate: input.plot.plantingDate,
        plantingStatus: input.plot.plantingStatus,
      },
      recentActivities: input.activities.slice(0, 8).map((activity) =>
        this.summarizeActivity(activity),
      ),
      weather: input.weather
        ? {
            forecast: input.weather.forecast?.slice(0, 5),
            alerts: input.weather.alerts ?? [],
            agriSignals: input.weather.agriSignals,
          }
        : null,
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions:
          'Ты агро-помощник для фермеров Казахстана. Дай практичный, короткий совет по участку. Не обещай точность диагноза и не заменяй агронома. Ответь строго JSON без markdown: {"title": string, "summary": string, "actions": string[], "risks": string[], "confidenceNote": string}.',
        input: `Контекст участка, журнала работ и погоды:\n${JSON.stringify(context, null, 2)}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.warn(
        `OpenAI advice request failed: ${response.status} ${response.statusText}. Model: ${model}. Body: ${errorText.slice(0, 500)}`,
      );
      return null;
    }

    const json = await response.json();
    const text = this.extractOutputText(json);
    const parsed = this.parseAdvice(text);

    if (!parsed) {
      this.logger.warn(
        `OpenAI advice response could not be parsed as expected JSON. Model: ${model}. Text: ${text.slice(0, 500)}`,
      );
    }

    return parsed ? { source: 'openai', ...parsed } : null;
  }

  async getPlotAdvice(plotId: string, userId: string, role: UserRole) {
    const plot = await this.getAccessiblePlotOrFail(plotId, userId, role);
    const activities = await this.activityRepository.find({
      where: { plotId },
      order: {
        activityDate: 'DESC',
        createdAt: 'DESC',
      },
      take: 12,
    });

    const coords = this.weatherService.getPlotCoordinates(plot.geometry);
    let weather: Awaited<ReturnType<WeatherService['getForecast']>> | null = null;

    if (coords) {
      try {
        weather = await this.weatherService.getForecast(coords.lat, coords.lng, 7);
      } catch {
        weather = null;
      }
    }

    const fallback = this.buildFallbackAdvice({ plot, activities, weather });

    try {
      return (await this.callOpenAi({ plot, activities, weather })) ?? fallback;
    } catch (error) {
      this.logger.warn(
        `OpenAI advice request crashed. Using fallback. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return fallback;
    }
  }
}
