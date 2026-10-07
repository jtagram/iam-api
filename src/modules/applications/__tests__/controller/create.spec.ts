import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import {
  basePathOf,
  bodyParamsOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { CreateApplicationDto } from '../../dto/create-application.dto';
import { ApplicationsController } from '../../applications.controller';
import { ApplicationsService } from '../../applications.service';

describe('ApplicationsController.create', () => {
  let service: { create: ReturnType<typeof mockFn> };
  let controller: ApplicationsController;

  beforeEach(() => {
    service = { create: mockFn() };
    controller = new ApplicationsController(
      service as unknown as ApplicationsService,
    );
  });

  it('delegates to ApplicationsService.create and returns its result', async () => {
    const dto = { name: 'iam', description: 'Identity' };
    const result = { msg: 'ok', data: [] };
    service.create.mockResolvedValue(result);

    await expect(controller.create(dto)).resolves.toBe(result);

    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('propagates a service rejection', async () => {
    const dto = { name: 'iam', description: 'Identity' };
    const failure = new Error('boom');
    service.create.mockRejectedValue(failure);

    await expect(controller.create(dto)).rejects.toBe(failure);
  });

  it('is mounted at POST /applications', () => {
    const info = routeOf(ApplicationsController, 'create');

    expect(basePathOf(ApplicationsController)).toBe('applications');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe('/');
  });

  it('answers with status 201', () => {
    expect(routeOf(ApplicationsController, 'create').httpCode).toBe(201);
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(ApplicationsController, 'create');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('reads the body as CreateApplicationDto', () => {
    const params = bodyParamsOf(ApplicationsController, 'create');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      ApplicationsController.prototype,
      'create',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(CreateApplicationDto);
  });
});
