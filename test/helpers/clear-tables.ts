import { DataSource } from 'typeorm';
import { ENTITIES } from './entities';

/**
 * Empties every table. Rows are deleted child-first because the relations
 * create real foreign keys (pg-mem rejects TRUNCATE on a referenced table).
 * pg-mem does NOT restart the id sequences, so never assume ids start at 1.
 */
export async function clearAllTables(dataSource: DataSource): Promise<void> {
	for (const entity of [...ENTITIES].reverse()) {
		await dataSource.createQueryBuilder().delete().from(entity).execute();
	}
}
