export interface AppUserApplicationRoleResponse {
  id: number;
  name: string;
  description: string;
}

export interface AppUserApplicationRolesResponse {
  applicationId: number;
  applicationName: string;
  applicationDescription: string;
  roles: AppUserApplicationRoleResponse[];
}
