import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { Chat, ChatMessage, ChatParticipant } from '../chat/entities/chat.entity';
import { Crop } from '../crops/entities/crop.entity';
import { FarmPlot } from '../farm-plots/entities/farm-plot.entity';
import { InfoCenterItem } from '../info-center/entities/info-center-item.entity';
import { MarketplaceListing } from '../marketplace/entities/marketplace-listing.entity';
import { Order, OrderItem } from '../orders/entities/order.entity';
import { ServiceListing } from '../services/entities/service-listing.entity';
import { User } from '../users/entities/user.entity';
import { parseEnvBoolean, parseEnvNumber } from '../common/utils/env.util';

export const DATABASE_ENTITIES = [
  User,
  FarmPlot,
  Crop,
  MarketplaceListing,
  Order,
  OrderItem,
  Chat,
  ChatParticipant,
  ChatMessage,
  InfoCenterItem,
  ServiceListing,
];

export const buildDatabaseOptions = (
  env: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions & DataSourceOptions => ({
  type: 'postgres',
  host: env.DB_HOST || 'localhost',
  port: parseEnvNumber(env.DB_PORT, 5432),
  username: env.DB_USERNAME || 'postgres',
  password: env.DB_PASSWORD || 'postgres',
  database: env.DB_NAME || 'agro_platform_db',
  entities: DATABASE_ENTITIES,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: parseEnvBoolean(env.DB_SYNCHRONIZE, false),
  migrationsRun: parseEnvBoolean(env.DB_MIGRATIONS_RUN, false),
  logging: parseEnvBoolean(env.DB_LOGGING, false),
});
