import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDirectChatDto {
  @ApiProperty()
  @IsUUID()
  participantUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listingId?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ default: 'text' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
