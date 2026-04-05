import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FarmPlotsModule } from './farm-plots/farm-plots.module';
import { CropsModule } from './crops/crops.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WeatherModule } from './weather/weather.module';

import { User } from './users/entities/user.entity';
import { FarmPlot } from './farm-plots/entities/farm-plot.entity';
import { Crop } from './crops/entities/crop.entity';
import { MarketplaceListing } from './marketplace/entities/marketplace-listing.entity';
import { Order, OrderItem } from './orders/entities/order.entity';
import { Chat, ChatMessage, ChatParticipant } from './chat/entities/chat.entity';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes env variables accessible everywhere
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'agro_platform_db',
      entities: [
        User,
        FarmPlot,
        Crop,
        MarketplaceListing,
        Order,
        OrderItem,
        Chat,
        ChatParticipant,
        ChatMessage,
      ],
      synchronize: true, // Use migration in actual strict production.
    }),
    UsersModule,
    AuthModule,
    FarmPlotsModule,
    CropsModule,
    MarketplaceModule,
    AnalyticsModule,
    OrdersModule,
    DashboardModule,
    WeatherModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
