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
