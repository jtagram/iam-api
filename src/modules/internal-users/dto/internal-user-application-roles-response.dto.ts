export interface InternalUserApplicationRoleResponse {
  id: number;
  name: string;
  description: string;
}

export interface InternalUserApplicationRolesResponse {
  applicationId: number;
  applicationName: string;
  applicationDescription: string;
  roles: InternalUserApplicationRoleResponse[];
}
