import {
	HTTP_CODE_METADATA,
	METHOD_METADATA,
	PATH_METADATA,
	ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { IS_PUBLIC_KEY } from '../../src/common/guards/public.decorator';
import { ROLES_KEY } from '../../src/common/guards/roles.decorator';

type Controller = abstract new (...args: never[]) => unknown;

/** `Reflect.getMetadata` returns `any`; this pins the expected type once. */
function metadataOf<T>(key: unknown, target: object, property?: string): T {
	return (
		property === undefined
			? Reflect.getMetadata(key, target)
			: Reflect.getMetadata(key, target, property)
	) as T;
}

export interface RouteInfo {
	path: string;
	method: RequestMethod;
	httpCode: number | undefined;
	isPublic: boolean | undefined;
	roles: unknown;
}

/** Reads the decorators of one controller handler (route, verb, status, guards metadata). */
export function routeOf(controller: Controller, handler: string): RouteInfo {
	const target = (controller.prototype as Record<string, object>)[handler];
	return {
		path: metadataOf<string>(PATH_METADATA, target),
		method: metadataOf<RequestMethod>(METHOD_METADATA, target),
		httpCode: metadataOf<number | undefined>(HTTP_CODE_METADATA, target),
		isPublic:
			metadataOf<boolean | undefined>(IS_PUBLIC_KEY, target) ??
			metadataOf<boolean | undefined>(IS_PUBLIC_KEY, controller),
		roles: metadataOf<unknown>(ROLES_KEY, target) ?? metadataOf<unknown>(ROLES_KEY, controller),
	};
}

/** Base path of the controller (`@Controller('x')`). */
export function basePathOf(controller: Controller): string {
	return metadataOf<string>(PATH_METADATA, controller);
}

export interface ParamInfo {
	index: number;
	data: unknown;
	pipes: unknown[];
}

function paramsOf(controller: Controller, handler: string, type: RouteParamtypes): ParamInfo[] {
	const metadata: Record<string, ParamInfo> =
		metadataOf<Record<string, ParamInfo> | undefined>(ROUTE_ARGS_METADATA, controller, handler) ??
		{};
	return Object.entries(metadata)
		.filter(([key]) => key.startsWith(`${type}:`))
		.map(([, value]) => value);
}

export const bodyParamsOf = (controller: Controller, handler: string) =>
	paramsOf(controller, handler, RouteParamtypes.BODY);
export const queryParamsOf = (controller: Controller, handler: string) =>
	paramsOf(controller, handler, RouteParamtypes.QUERY);
export const pathParamsOf = (controller: Controller, handler: string) =>
	paramsOf(controller, handler, RouteParamtypes.PARAM);

/** Custom param decorators (e.g. @OriginApplication()) keyed with a uuid suffix. */
export function customParamsOf(
	controller: Controller,
	handler: string,
): Array<ParamInfo & { factory: (data: unknown, ctx: unknown) => unknown }> {
	const metadata: Record<
		string,
		ParamInfo & { factory: (data: unknown, ctx: unknown) => unknown }
	> =
		metadataOf<
			Record<string, ParamInfo & { factory: (data: unknown, ctx: unknown) => unknown }> | undefined
		>(ROUTE_ARGS_METADATA, controller, handler) ?? {};
	return Object.entries(metadata)
		.filter(([key]) => key.includes('__customRouteArgs__'))
		.map(([, value]) => value)
		.sort((a, b) => a.index - b.index);
}
