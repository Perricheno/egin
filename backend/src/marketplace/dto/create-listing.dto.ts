import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ListingStatus,
  ListingVisibilityStatus,
} from '../entities/marketplace-listing.entity';

export class CreateListingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cropId: string;

  @ApiProperty({ example: 'Продам арбузы сладкие прям с поля' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Фрукты' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 'tons' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: 35000 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 'KZT', default: 'KZT' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: '2024-08-01' })
  @IsDateString()
  availableFrom: string;

  @ApiProperty({ example: 'Turkestan Region, Zhetisay' })
  @IsString()
  @IsNotEmpty()
  location: string;
}

export class UpdateListingDto extends CreateListingDto {
  @ApiPropertyOptional({ enum: ListingStatus })
  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;

  @ApiPropertyOptional({ enum: ListingVisibilityStatus })
  @IsEnum(ListingVisibilityStatus)
  @IsOptional()
  visibilityStatus?: ListingVisibilityStatus;
}
