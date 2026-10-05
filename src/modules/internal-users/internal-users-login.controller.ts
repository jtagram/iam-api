import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApplicationName,
  TargetApplication,
} from '../../common/decorators/application-name.decorator';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { Public } from '../../common/guards/public.decorator';
import { InternalUsersLoginService } from './internal-users-login.service';
import { LoginInternalUserDto } from './dto/login-internal-user.dto';

@Controller('internal-users')
export class InternalUsersLoginController {
  constructor(
    private readonly internalUsersLoginService: InternalUsersLoginService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  login(
    @Body() dto: LoginInternalUserDto,
    @ApplicationName() originApplicationName: string,
    @TargetApplication() targetApplicationName: string,
  ): Promise<ResponseLogin> {
    return this.internalUsersLoginService.login(
      dto,
      originApplicationName,
      targetApplicationName,
    );
  }
}
