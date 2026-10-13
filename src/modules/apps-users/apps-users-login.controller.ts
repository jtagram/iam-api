import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
	OriginApplication,
	TargetApplication,
} from '../../common/decorators/application-name.decorator';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { Public } from '../../common/guards/public.decorator';
import { LoginDto } from './dto/login.dto';
import { ApiAppUserLogin } from './swagger/apps-users-login.swagger';
import { AppUsersLoginService } from './apps-users-login.service';

@ApiTags('Apps users')
@Controller('apps-users')
export class AppUsersLoginController {
	constructor(private readonly appUsersLoginService: AppUsersLoginService) {}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	@Public()
	@ApiAppUserLogin()
	login(
		@Body() dto: LoginDto,
		@OriginApplication() originApplicationName: string,
		@TargetApplication() targetApplicationName: string,
	): Promise<ResponseLogin> {
		return this.appUsersLoginService.login(dto, originApplicationName, targetApplicationName);
	}
}
