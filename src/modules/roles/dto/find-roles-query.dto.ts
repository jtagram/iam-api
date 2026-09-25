import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class FindRolesQueryDto {
  @Type(() => Number)
  @IsInt()
  applicationId: number;
}
