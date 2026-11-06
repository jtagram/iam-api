import { DataSource } from 'typeorm';

export interface ParentRows {
	applications?: number[];
	appUsers?: number[];
	internalUsers?: number[];
	roles?: { id: number; applicationId: number }[];
	/** User-application assignments; roles are assigned on top of these rows. */
	internalUserApplications?: { id: number; internalUserId: number; applicationId: number }[];
	appUserApplications?: { id: number; appUserId: number; applicationId: number }[];
}

/**
 * Inserts parent rows with explicit ids so repository specs can reference
 * them from rows with real foreign keys. Applications referenced by a role are
 * created too. Users must be listed to be referenced by an assignment.
 * Call it after clearing the tables.
 *
 * Raw SQL on purpose: TypeORM ignores explicit values for generated primary
 * keys, and the specs need deterministic ids.
 */
export async function insertParentRows(dataSource: DataSource, rows: ParentRows): Promise<void> {
	const applicationIds = new Set([
		...(rows.applications ?? []),
		...(rows.roles ?? []).map((role) => role.applicationId),
		...(rows.internalUserApplications ?? []).map((assignment) => assignment.applicationId),
		...(rows.appUserApplications ?? []).map((assignment) => assignment.applicationId),
	]);
	for (const id of applicationIds) {
		await dataSource.query(
			'INSERT INTO apps_applications (id, name, description) VALUES ($1, $2, $3)',
			[id, `application-${id}`, `Application ${id}`],
		);
	}
	for (const id of rows.appUsers ?? []) {
		await dataSource.query(
			'INSERT INTO apps_users (id, cliente_id, cliente_secret, name, description) VALUES ($1, $2, $3, $4, $5)',
			[id, `client-${id}`, 'secret', `app-user-${id}`, `App user ${id}`],
		);
	}
	for (const id of rows.internalUsers ?? []) {
		await dataSource.query(
			'INSERT INTO internal_users (id, name, lastname, email, password) VALUES ($1, $2, $3, $4, $5)',
			[id, `Name ${id}`, `Lastname ${id}`, `user-${id}@example.com`, 'password'],
		);
	}
	for (const role of rows.roles ?? []) {
		await dataSource.query(
			'INSERT INTO apps_roles (id, application_id, name, description) VALUES ($1, $2, $3, $4)',
			[role.id, role.applicationId, `role-${role.id}`, `Role ${role.id}`],
		);
	}
	for (const assignment of rows.internalUserApplications ?? []) {
		await dataSource.query(
			'INSERT INTO internal_users_applications (id, internal_user_id, application_id) VALUES ($1, $2, $3)',
			[assignment.id, assignment.internalUserId, assignment.applicationId],
		);
	}
	for (const assignment of rows.appUserApplications ?? []) {
		await dataSource.query(
			'INSERT INTO apps_users_applications (id, app_user_id, application_id) VALUES ($1, $2, $3)',
			[assignment.id, assignment.appUserId, assignment.applicationId],
		);
	}
}
