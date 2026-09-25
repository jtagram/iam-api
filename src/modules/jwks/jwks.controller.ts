import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/guards/public.decorator';
import { JwksService } from './jwks.service';

@Controller('.well-known')
export class JwksController {
  constructor(private readonly jwksService: JwksService) {}

  @Get('jwks.json')
  @Public()
  getJwks() {
    return this.jwksService.getJwks();
  }
}
