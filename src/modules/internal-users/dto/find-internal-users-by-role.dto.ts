import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class FindInternalUsersByRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  applicationName!: string;

  /** Comma-separated role names, e.g. `ADMIN,APPROVER`. */
  @IsString()
  @IsNotEmpty()
  roles!: string;
}
