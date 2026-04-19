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
import { ApiUsage } from '../api-usage/entities/api-usage.entity';

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
  ApiUsage,
];

export const buildDatabaseOptions = (
  env: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions & DataSourceOptions => {
  const isSslEnabled = parseEnvBoolean(env.DB_SSL, env.APP_ENV === 'production');

  const baseConfig: any = {
    type: 'postgres',
    entities: DATABASE_ENTITIES,
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: parseEnvBoolean(env.DB_SYNCHRONIZE, false),
    migrationsRun: parseEnvBoolean(env.DB_MIGRATIONS_RUN, false),
    logging: parseEnvBoolean(env.DB_LOGGING, false),
    ssl: isSslEnabled ? { rejectUnauthorized: false } : false,
  };

  if (env.DATABASE_URL) {
    baseConfig.url = env.DATABASE_URL;
  } else {
    baseConfig.host = env.DB_HOST || 'localhost';
    baseConfig.port = parseEnvNumber(env.DB_PORT, 5432);
    baseConfig.username = env.DB_USERNAME || 'postgres';
    baseConfig.password = env.DB_PASSWORD || 'postgres';
    baseConfig.database = env.DB_NAME || 'agro_platform_db';
  }

  return baseConfig;
};
