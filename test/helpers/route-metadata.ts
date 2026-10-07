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

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type Controller = Function;

export interface RouteInfo {
  path: string;
  method: RequestMethod;
  httpCode: number | undefined;
  isPublic: boolean | undefined;
  roles: unknown;
}

/** Reads the decorators of one controller handler (route, verb, status, guards metadata). */
export function routeOf(controller: Controller, handler: string): RouteInfo {
  const target = controller.prototype[handler];
  return {
    path: Reflect.getMetadata(PATH_METADATA, target),
    method: Reflect.getMetadata(METHOD_METADATA, target),
    httpCode: Reflect.getMetadata(HTTP_CODE_METADATA, target),
    isPublic:
      Reflect.getMetadata(IS_PUBLIC_KEY, target) ??
      Reflect.getMetadata(IS_PUBLIC_KEY, controller),
    roles:
      Reflect.getMetadata(ROLES_KEY, target) ??
      Reflect.getMetadata(ROLES_KEY, controller),
  };
}

/** Base path of the controller (`@Controller('x')`). */
export function basePathOf(controller: Controller): string {
  return Reflect.getMetadata(PATH_METADATA, controller);
}

export interface ParamInfo {
  index: number;
  data: unknown;
  pipes: unknown[];
}

function paramsOf(
  controller: Controller,
  handler: string,
  type: RouteParamtypes,
): ParamInfo[] {
  const metadata: Record<string, ParamInfo> =
    Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, handler) ?? {};
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

/** Custom param decorators (e.g. @ApplicationName()) keyed with a uuid suffix. */
export function customParamsOf(
  controller: Controller,
  handler: string,
): Array<ParamInfo & { factory: (data: unknown, ctx: unknown) => unknown }> {
  const metadata: Record<
    string,
    ParamInfo & { factory: (data: unknown, ctx: unknown) => unknown }
  > = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, handler) ?? {};
  return Object.entries(metadata)
    .filter(([key]) => key.includes('__customRouteArgs__'))
    .map(([, value]) => value)
    .sort((a, b) => a.index - b.index);
}
