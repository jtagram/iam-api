import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApplicationName,
  TargetApplication,
} from '../../common/decorators/application-name.decorator';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { Public } from '../../common/guards/public.decorator';
import { LoginDto } from './dto/login.dto';
import { AppUsersLoginService } from './apps-users-login.service';

@Controller('apps-users')
export class AppUsersLoginController {
  constructor(private readonly appUsersLoginService: AppUsersLoginService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  login(
    @Body() dto: LoginDto,
    @ApplicationName() originApplicationName: string,
    @TargetApplication() targetApplicationName: string,
  ): Promise<ResponseLogin> {
    return this.appUsersLoginService.login(
      dto,
      originApplicationName,
      targetApplicationName,
    );
  }
}
