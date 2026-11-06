import { ResponseBody } from '../../src/common/dto/response-body.dto';

/** Failure envelope produced by the global exception filters. */
export interface ErrorBody {
	ok: false;
	/** Plain string; ValidationPipe messages are joined with ', '. */
	msg: string;
	data: null;
}

/**
 * supertest types `response.body` as `any`; this pins it to the shape the test
 * expects (the assertions in the test verify the actual values).
 */
export function bodyOf<T>(res: { body: unknown }): T {
	return res.body as T;
}

/** Typed `data` of the `ResponseBody<T>` envelope. */
export function dataOf<T>(res: { body: unknown }): T {
	return bodyOf<ResponseBody<T>>(res).data as T;
}

/** One connection of the user as serialized, both applications loaded. */
export interface ConnectionBody {
	id: number;
	originApplicationId: number;
	destinationApplicationId: number;
	originApplication: { id: number; name: string };
	destinationApplication: { id: number; name: string };
}

/** Internal or app user serialized with its connections. */
export interface UserWithConnectionsBody {
	id: number;
	connections: ConnectionBody[];
}
