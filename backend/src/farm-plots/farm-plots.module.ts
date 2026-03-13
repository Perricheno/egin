import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmPlotsService } from './farm-plots.service';
import { FarmPlotsController } from './farm-plots.controller';
import { FarmPlot } from './entities/farm-plot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FarmPlot])],
  controllers: [FarmPlotsController],
  providers: [FarmPlotsService],
  exports: [FarmPlotsService]
})
export class FarmPlotsModule {}
