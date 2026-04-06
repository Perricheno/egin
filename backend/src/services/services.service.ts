import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { ServiceCategory, ServiceListing } from './entities/service-listing.entity';

type SeedProvider = {
  phone: string;
  fullName: string;
  region: string;
  district: string;
};

type SeedService = {
  category: ServiceCategory;
  title: string;
  description: string;
  priceFrom: number;
  urgentAvailable: boolean;
  country: string;
  region: string;
  district: string;
  locality: string;
  rating: number;
  reviewsCount: number;
  completedJobs: number;
  imageUrl: string;
  providerPhone: string;
};

const SEED_PROVIDERS: SeedProvider[] = [
  {
    phone: '+77010000011',
    fullName: 'Agro Service Talgar',
    region: 'Алматинская область',
    district: 'Талгарский район',
  },
  {
    phone: '+77010000012',
    fullName: 'Turkestan Agro Help',
    region: 'Туркестанская область',
    district: 'Сайрамский район',
  },
  {
    phone: '+77010000013',
    fullName: 'Kostanay Field Team',
    region: 'Костанайская область',
    district: 'г. Костанай',
  },
];

const SEED_SERVICES: SeedService[] = [
  {
    category: ServiceCategory.MACHINERY_RENTAL,
    title: 'Аренда трактора и сеялки',
    description:
      'Трактор, сеялка и оператор. Подходит для весеннего сева и коротких выездов по району.',
    priceFrom: 45000,
    urgentAvailable: true,
    country: 'Казахстан',
    region: 'Алматинская область',
    district: 'Талгарский район',
    locality: 'Талгар',
    rating: 4.8,
    reviewsCount: 37,
    completedJobs: 112,
    imageUrl:
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1200&auto=format&fit=crop',
    providerPhone: '+77010000011',
  },
  {
    category: ServiceCategory.IRRIGATION,
    title: 'Настройка полива и проверка орошения',
    description:
      'Проверка линии полива, настройка давления, выезд агроспециалиста и рекомендации по влаге.',
    priceFrom: 30000,
    urgentAvailable: true,
    country: 'Казахстан',
    region: 'Туркестанская область',
    district: 'Сайрамский район',
    locality: 'Шымкент',
    rating: 4.7,
    reviewsCount: 24,
    completedJobs: 61,
    imageUrl:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=1200&auto=format&fit=crop',
    providerPhone: '+77010000012',
  },
  {
    category: ServiceCategory.AGRONOMIST,
    title: 'Агроном на выезд по болезням растений',
    description:
      'Диагностика поля, рекомендации по болезням и защите, краткий план действий по культуре.',
    priceFrom: 25000,
    urgentAvailable: false,
    country: 'Казахстан',
    region: 'Костанайская область',
    district: 'г. Костанай',
    locality: 'Костанай',
    rating: 4.9,
    reviewsCount: 51,
    completedJobs: 143,
    imageUrl:
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=1200&auto=format&fit=crop',
    providerPhone: '+77010000013',
  },
  {
    category: ServiceCategory.DELIVERY,
    title: 'Доставка урожая по области',
    description:
      'Локальная доставка овощей и зерна, быстрый выезд, можно срочно в день заявки.',
    priceFrom: 18000,
    urgentAvailable: true,
    country: 'Казахстан',
    region: 'Алматинская область',
    district: 'Талгарский район',
    locality: 'Талгар',
    rating: 4.6,
    reviewsCount: 19,
    completedJobs: 72,
    imageUrl:
      'https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=1200&auto=format&fit=crop',
    providerPhone: '+77010000011',
  },
  {
    category: ServiceCategory.REPAIR,
    title: 'Ремонт сельхозтехники на месте',
    description:
      'Диагностика и мелкий ремонт трактора, опрыскивателя и навесного оборудования на выезде.',
    priceFrom: 35000,
    urgentAvailable: true,
    country: 'Казахстан',
    region: 'Туркестанская область',
    district: 'Сайрамский район',
    locality: 'Шымкент',
    rating: 4.5,
    reviewsCount: 14,
    completedJobs: 39,
    imageUrl:
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?q=80&w=1200&auto=format&fit=crop',
    providerPhone: '+77010000012',
  },
];

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceListing)
    private readonly serviceRepository: Repository<ServiceListing>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private buildCategoryLabel(category: ServiceCategory) {
    switch (category) {
      case ServiceCategory.MACHINERY_RENTAL:
        return 'Аренда техники';
      case ServiceCategory.PLOWING:
        return 'Вспашка';
      case ServiceCategory.SOWING:
        return 'Посев';
      case ServiceCategory.FERTILIZER:
        return 'Удобрения';
      case ServiceCategory.DELIVERY:
        return 'Доставка';
      case ServiceCategory.STORAGE:
        return 'Склад';
      case ServiceCategory.AGRONOMIST:
        return 'Агроном';
      case ServiceCategory.LABOR:
        return 'Рабочая сила';
      case ServiceCategory.IRRIGATION:
        return 'Полив';
      case ServiceCategory.REPAIR:
        return 'Ремонт техники';
      default:
        return 'Услуги';
    }
  }

  private async ensureSeedData() {
    const count = await this.serviceRepository.count();
    if (count > 0) {
      return;
    }

    for (const provider of SEED_PROVIDERS) {
      const existing = await this.userRepository.findOne({
        where: { phone: provider.phone },
      });

      if (!existing) {
        await this.userRepository.save(
          this.userRepository.create({
            fullName: provider.fullName,
            phone: provider.phone,
            passwordHash: 'service-provider-seed',
            role: UserRole.SELLER,
            region: provider.region,
            district: provider.district,
          }),
        );
      }
    }

    const providers = await this.userRepository.find({
      where: SEED_PROVIDERS.map((provider) => ({ phone: provider.phone })),
    });
    const providerMap = new Map(providers.map((provider) => [provider.phone, provider]));

    await this.serviceRepository.save(
      SEED_SERVICES.map((service) =>
        this.serviceRepository.create({
          category: service.category,
          title: service.title,
          description: service.description,
          priceFrom: service.priceFrom,
          urgentAvailable: service.urgentAvailable,
          country: service.country,
          region: service.region,
          district: service.district,
          locality: service.locality,
          rating: service.rating,
          reviewsCount: service.reviewsCount,
          completedJobs: service.completedJobs,
          imageUrl: service.imageUrl,
          currency: 'KZT',
          isActive: true,
          providerUserId: providerMap.get(service.providerPhone)!.id,
        }),
      ),
    );
  }

  async getCategories() {
    await this.ensureSeedData();

    return Object.values(ServiceCategory).map((category) => ({
      key: category,
      label: this.buildCategoryLabel(category),
    }));
  }

  async listServices(filters?: {
    category?: string;
    region?: string;
    district?: string;
    urgent?: string;
  }) {
    await this.ensureSeedData();

    const query = this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.providerUser', 'providerUser')
      .where('service.isActive = true')
      .orderBy('service.rating', 'DESC')
      .addOrderBy('service.completedJobs', 'DESC');

    if (filters?.category) {
      query.andWhere('service.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.region) {
      query.andWhere('service.region = :region', {
        region: filters.region,
      });
    }

    if (filters?.district) {
      query.andWhere('service.district = :district', {
        district: filters.district,
      });
    }

    if (filters?.urgent === 'true') {
      query.andWhere('service.urgentAvailable = true');
    }

    const services = await query.getMany();

    return services.map((service) => ({
      id: service.id,
      category: service.category,
      categoryLabel: this.buildCategoryLabel(service.category),
      title: service.title,
      description: service.description,
      priceFrom: Number(service.priceFrom),
      currency: service.currency,
      urgentAvailable: service.urgentAvailable,
      country: service.country,
      region: service.region,
      district: service.district,
      locality: service.locality,
      rating: Number(service.rating),
      reviewsCount: service.reviewsCount,
      completedJobs: service.completedJobs,
      imageUrl: service.imageUrl,
      provider: {
        id: service.providerUserId,
        fullName: service.providerUser?.fullName ?? 'Service Provider',
        region: service.providerUser?.region ?? service.region,
        district: service.providerUser?.district ?? service.district,
      },
    }));
  }

  async getServiceById(id: string) {
    await this.ensureSeedData();
    const services = await this.listServices();
    return services.find((service) => service.id === id) ?? null;
  }
}
