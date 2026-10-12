import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/guards/public.decorator';
import { JwksService } from './jwks.service';
import { ApiGetJwks } from './swagger/jwks.swagger';

@ApiTags('JWKS')
@Controller('.well-known')
export class JwksController {
  constructor(private readonly jwksService: JwksService) {}

  @Get('jwks.json')
  @Public()
  @ApiGetJwks()
  getJwks() {
    return this.jwksService.getJwks();
  }
}
