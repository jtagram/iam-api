import { Module } from '@nestjs/common';
import { JwksController } from './jwks.controller';
import { JwksService } from './jwks.service';

@Module({
  controllers: [JwksController],
  providers: [JwksService],
})
export class JwksModule {}
