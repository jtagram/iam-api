/** Plain-object stand-ins for the entities the assignment queries return. */
export const at = (day: number) => new Date(Date.UTC(2024, 0, day));

export const applicationRow = (id: number, name: string, description: string, day = id) => ({
	id,
	name,
	description,
	createdAt: at(day),
});

export const roleRow = (
	id: number,
	applicationId: number,
	name: string,
	description: string,
	day = id,
) => ({ id, applicationId, name, description, createdAt: at(day) });

type ApplicationRow = ReturnType<typeof applicationRow>;
type RoleRow = ReturnType<typeof roleRow>;

/** A row of the user-role table with its role loaded. */
export const roleAssignment = (role: RoleRow) => ({
	roleId: role.id,
	role,
});

/**
 * A row of the user-application table with its application loaded and the
 * role assignments that hang off it.
 */
export const applicationAssignment = (application: ApplicationRow, roles: RoleRow[] = []) => ({
	applicationId: application.id,
	application,
	roles: roles.map((role) => roleAssignment(role)),
});
