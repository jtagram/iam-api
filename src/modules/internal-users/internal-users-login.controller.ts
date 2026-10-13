import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
	OriginApplication,
	TargetApplication,
} from '../../common/decorators/application-name.decorator';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { Public } from '../../common/guards/public.decorator';
import { InternalUsersLoginService } from './internal-users-login.service';
import { ApiInternalUserLogin } from './swagger/internal-users-login.swagger';
import { LoginInternalUserDto } from './dto/login-internal-user.dto';

@ApiTags('Internal users')
@Controller('internal-users')
export class InternalUsersLoginController {
	constructor(private readonly internalUsersLoginService: InternalUsersLoginService) {}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	@Public()
	@ApiInternalUserLogin()
	login(
		@Body() dto: LoginInternalUserDto,
		@OriginApplication() originApplicationName: string,
		@TargetApplication() targetApplicationName: string,
	): Promise<ResponseLogin> {
		return this.internalUsersLoginService.login(dto, originApplicationName, targetApplicationName);
	}
}
