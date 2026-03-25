import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceListing } from './entities/marketplace-listing.entity';
import { CreateListingDto, UpdateListingDto } from './dto/create-listing.dto';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(MarketplaceListing)
    private readonly listingRepository: Repository<MarketplaceListing>,
  ) {}

  create(farmerId: string, createDto: CreateListingDto): Promise<MarketplaceListing> {
    const listing = this.listingRepository.create({
      ...createDto,
      farmerId,
      availableFrom: new Date(createDto.availableFrom),
    });
    return this.listingRepository.save(listing);
  }

  async findAll(category?: string, search?: string, sortBy: string = 'createdAt', sortOrder: 'ASC' | 'DESC' = 'DESC'): Promise<MarketplaceListing[]> {
    const query = this.listingRepository.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.farmer', 'farmer');

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

  async findOne(id: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepository.findOne({ where: { id }, relations: ['farmer'] });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async update(id: string, farmerId: string, updateDto: UpdateListingDto): Promise<void> {
    // Only author can update
    const authRecord = await this.listingRepository.findOne({ where: { id, farmerId }});
    if (!authRecord) throw new NotFoundException('Listing not found or not yours');

    await this.listingRepository.update(id, {
      ...updateDto,
      availableFrom: updateDto.availableFrom ? new Date(updateDto.availableFrom) : undefined,
    });
  }

  async remove(id: string, farmerId: string): Promise<void> {
    const authRecord = await this.listingRepository.findOne({ where: { id, farmerId }});
    if (!authRecord) throw new NotFoundException('Listing not found or not yours');

    await this.listingRepository.delete(id);
  }
}
