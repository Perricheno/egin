import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmPlot } from '../farm-plots/entities/farm-plot.entity';
import {
  ListingStatus,
  ListingVisibilityStatus,
  MarketplaceListing,
} from './entities/marketplace-listing.entity';
import { CreateListingDto, UpdateListingDto } from './dto/create-listing.dto';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(MarketplaceListing)
    private readonly listingRepository: Repository<MarketplaceListing>,
    @InjectRepository(FarmPlot)
    private readonly plotRepository: Repository<FarmPlot>,
  ) {}

  private toCompetitionLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 0.67) {
      return 'high';
    }

    if (score >= 0.34) {
      return 'medium';
    }

    return 'low';
  }

  private async evaluateVisibility(farmerId: string, cropId: string) {
    const plots = await this.plotRepository.find({
      where: { userId: farmerId, cropType: cropId },
    });

    if (plots.length === 0) {
      return {
        visibilityStatus: ListingVisibilityStatus.VISIBLE,
        competitionLevel: null,
        competitionScore: null,
        visibilityReason:
          'Для этой культуры пока нет связанных полей у фермера. Объявление оставлено видимым до появления геоданных.',
      };
    }

    const totalArea = plots.reduce(
      (sum, plot) => sum + Number(plot.areaSizeHectares || 0),
      0,
    );
    const normalizedArea = Math.min(totalArea / 200, 1);
    const normalizedPlotCount = Math.min(plots.length / 10, 1);
    const score = Number(
      Math.min(normalizedArea * 0.7 + normalizedPlotCount * 0.3, 1).toFixed(2),
    );
    const competitionLevel = this.toCompetitionLevel(score);
    const visibilityStatus =
      competitionLevel === 'low'
        ? ListingVisibilityStatus.HIDDEN
        : ListingVisibilityStatus.VISIBLE;

    const visibilityReason =
      competitionLevel === 'low'
        ? `Конкуренция по культуре "${cropId}" низкая. По MVP-правилу объявление скрыто из общего маркетплейса.`
        : competitionLevel === 'medium'
          ? `Конкуренция по культуре "${cropId}" средняя. Объявление доступно в маркетплейсе.`
          : `Конкуренция по культуре "${cropId}" высокая. Объявление доступно в маркетплейсе для активных продаж.`;

    return {
      visibilityStatus,
      competitionLevel,
      competitionScore: score,
      visibilityReason,
    };
  }

  async create(
    farmerId: string,
    createDto: CreateListingDto,
  ): Promise<MarketplaceListing> {
    const visibility = await this.evaluateVisibility(farmerId, createDto.cropId);

    const listing = this.listingRepository.create({
      ...createDto,
      farmerId,
      availableFrom: new Date(createDto.availableFrom),
      ...visibility,
    });
    return this.listingRepository.save(listing);
  }

  async findAll(
    category?: string,
    search?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<MarketplaceListing[]> {
    const query = this.listingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.farmer', 'farmer');

    query.andWhere('listing.status = :status', { status: ListingStatus.ACTIVE });
    query.andWhere('listing.visibilityStatus = :visibilityStatus', {
      visibilityStatus: ListingVisibilityStatus.VISIBLE,
    });

    if (category && category !== 'Все') {
      query.andWhere('listing.category = :category', { category });
    }

    if (search) {
      query.andWhere(
        '(LOWER(listing.title) LIKE LOWER(:search) OR LOWER(listing.location) LIKE LOWER(:search) OR LOWER(listing.cropId) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const validSortFields = ['createdAt', 'price'];
    const actualSortBy = validSortFields.includes(sortBy) ? `listing.${sortBy}` : 'listing.createdAt';
    const actualSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    query.orderBy(actualSortBy, actualSortOrder);

    return query.getMany();
  }

  async findMine(farmerId: string): Promise<MarketplaceListing[]> {
    return this.listingRepository.find({
      where: { farmerId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepository.findOne({ where: { id }, relations: ['farmer'] });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async update(id: string, farmerId: string, updateDto: UpdateListingDto): Promise<void> {
    // Only author can update
    const authRecord = await this.listingRepository.findOne({ where: { id, farmerId }});
    if (!authRecord) throw new NotFoundException('Listing not found or not yours');

    const cropId = updateDto.cropId ?? authRecord.cropId;
    const recalculatedVisibility =
      updateDto.visibilityStatus !== undefined
        ? {
            visibilityStatus: updateDto.visibilityStatus,
            competitionLevel: authRecord.competitionLevel ?? null,
            competitionScore: authRecord.competitionScore ?? null,
            visibilityReason:
              'Visibility status was manually overridden by the listing owner.',
          }
        : await this.evaluateVisibility(farmerId, cropId);

    await this.listingRepository.update(id, {
      ...updateDto,
      availableFrom: updateDto.availableFrom ? new Date(updateDto.availableFrom) : undefined,
      ...recalculatedVisibility,
    });
  }

  async remove(id: string, farmerId: string): Promise<void> {
    const authRecord = await this.listingRepository.findOne({ where: { id, farmerId }});
    if (!authRecord) throw new NotFoundException('Listing not found or not yours');

    await this.listingRepository.delete(id);
  }
}
