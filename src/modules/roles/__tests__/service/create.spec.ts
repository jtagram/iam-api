import { beforeEach, describe, expect, it } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RoleEntity } from '../../../../common/database/role/role.entity';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { RolesService } from '../../roles.service';

const dto = { applicationId: 1, name: 'ADMIN', description: 'Administrator' };

describe('RolesService.create', () => {
  let rolesRepository: {
    findAllByApplicationIdAndNames: ReturnType<typeof mockFn>;
    createRole: ReturnType<typeof mockFn>;
  };
  let applicationsRepository: { findById: ReturnType<typeof mockFn> };
  let service: RolesService;

  beforeEach(() => {
    rolesRepository = {
      findAllByApplicationIdAndNames: mockFn(),
      createRole: mockFn(),
    };
    applicationsRepository = { findById: mockFn() };
    service = new RolesService(
      rolesRepository as unknown as RolesRepository,
      applicationsRepository as unknown as ApplicationsRepository,
    );
    applicationsRepository.findById.mockResolvedValue({ id: 1, name: 'iam' });
    rolesRepository.findAllByApplicationIdAndNames.mockResolvedValue([]);
    rolesRepository.createRole.mockImplementation(async (entity: RoleEntity) =>
      Object.assign(entity, { id: 11 }),
    );
  });

  it('throws NotFound when the application does not exist', async () => {
    applicationsRepository.findById.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toThrow(
      new NotFoundException('Application not found'),
    );
    expect(applicationsRepository.findById).toHaveBeenCalledWith(1);
  });

  it('does not look for duplicates nor create when the application is missing', async () => {
    applicationsRepository.findById.mockResolvedValue(null);

    await service.create(dto).catch(() => undefined);

    expect(
      rolesRepository.findAllByApplicationIdAndNames,
    ).not.toHaveBeenCalled();
    expect(rolesRepository.createRole).not.toHaveBeenCalled();
  });

  it('checks for a role with the same name in that application', async () => {
    await service.create(dto);

    expect(rolesRepository.findAllByApplicationIdAndNames).toHaveBeenCalledWith(
      1,
      ['ADMIN'],
    );
  });

  it('throws Conflict when the role name already exists in the application', async () => {
    rolesRepository.findAllByApplicationIdAndNames.mockResolvedValue([
      { id: 5, name: 'ADMIN' },
    ]);

    await expect(service.create(dto)).rejects.toThrow(
      new ConflictException(
        'A role with this name already exists for this application',
      ),
    );
    expect(rolesRepository.createRole).not.toHaveBeenCalled();
  });

  it('persists an entity built from the dto', async () => {
    await service.create(dto);

    const entity = rolesRepository.createRole.mock.calls[0][0];
    expect(entity).toBeInstanceOf(RoleEntity);
    expect(entity).toMatchObject(dto);
  });

  it('returns the created role wrapped in a ResponseBody', async () => {
    await expect(service.create(dto)).resolves.toEqual({
      msg: 'Role created successfully',
      data: {
        id: 11,
        applicationId: 1,
        name: 'ADMIN',
        description: 'Administrator',
      },
    });
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    rolesRepository.createRole.mockRejectedValue(failure);

    await expect(service.create(dto)).rejects.toBe(failure);
  });
});
