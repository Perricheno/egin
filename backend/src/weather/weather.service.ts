import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class WeatherService {
  private normalizeCoordinate(value: number | undefined, field: 'lat' | 'lng') {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      throw new BadRequestException(`${field} is required`);
    }

    return Number(value);
  }

  getCurrent(lat?: number, lng?: number) {
    const safeLat = this.normalizeCoordinate(lat, 'lat');
    const safeLng = this.normalizeCoordinate(lng, 'lng');

    return {
      provider: 'pending_provider',
      location: {
        lat: safeLat,
        lng: safeLng,
      },
      current: null,
      status: {
        ready: false,
        reason:
          'Weather provider is not connected yet. This endpoint is production-shaped but intentionally returns no synthetic weather data.',
      },
      nextStep:
        'Connect Open-Meteo, Tomorrow.io, Meteomatics, or another provider in the next stage.',
    };
  }

  getForecast(lat?: number, lng?: number, days = 7) {
    const safeLat = this.normalizeCoordinate(lat, 'lat');
    const safeLng = this.normalizeCoordinate(lng, 'lng');
    const normalizedDays = Math.min(Math.max(Number(days || 7), 1), 14);

    return {
      provider: 'pending_provider',
      location: {
        lat: safeLat,
        lng: safeLng,
      },
      forecastDays: normalizedDays,
      forecast: [],
      agriSignals: {
        frostRisk: null,
        droughtRisk: null,
        irrigationWindow: null,
        plantingWindow: null,
      },
      status: {
        ready: false,
        reason:
          'Forecast contract is available, but external weather integration is still pending.',
      },
    };
  }

  getAlerts(region?: string, district?: string) {
    return {
      provider: 'pending_provider',
      region: region ?? null,
      district: district ?? null,
      alerts: [],
      status: {
        ready: false,
        reason:
          'No government or weather alert feed is connected yet. Returning empty list instead of fake alerts.',
      },
    };
  }
}
