import { beforeEach, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { RolesService } from '../../roles.service';

describe('RolesService.findAllByApplicationId', () => {
  let rolesRepository: { findAllByApplicationId: ReturnType<typeof mockFn> };
  let applicationsRepository: { findById: ReturnType<typeof mockFn> };
  let service: RolesService;

  beforeEach(() => {
    rolesRepository = { findAllByApplicationId: mockFn() };
    applicationsRepository = { findById: mockFn() };
    service = new RolesService(
      rolesRepository as unknown as RolesRepository,
      applicationsRepository as unknown as ApplicationsRepository,
    );
    applicationsRepository.findById.mockResolvedValue({ id: 1, name: 'iam' });
  });

  it('throws NotFound when the application does not exist', async () => {
    applicationsRepository.findById.mockResolvedValue(null);

    await expect(
      service.findAllByApplicationId({ applicationId: 99 }),
    ).rejects.toThrow(new NotFoundException('Application not found'));
    expect(rolesRepository.findAllByApplicationId).not.toHaveBeenCalled();
  });

  it('maps the roles of the application to their response shape', async () => {
    rolesRepository.findAllByApplicationId.mockResolvedValue([
      { id: 1, applicationId: 1, name: 'ADMIN', description: 'Admin' },
      { id: 2, applicationId: 1, name: 'VIEWER', description: 'Viewer' },
    ]);

    await expect(
      service.findAllByApplicationId({ applicationId: 1 }),
    ).resolves.toEqual({
      msg: 'Roles retrieved successfully',
      data: [
        { id: 1, applicationId: 1, name: 'ADMIN', description: 'Admin' },
        { id: 2, applicationId: 1, name: 'VIEWER', description: 'Viewer' },
      ],
    });
    expect(rolesRepository.findAllByApplicationId).toHaveBeenCalledWith(1);
  });

  it('returns an empty list for an application without roles', async () => {
    rolesRepository.findAllByApplicationId.mockResolvedValue([]);

    await expect(
      service.findAllByApplicationId({ applicationId: 1 }),
    ).resolves.toEqual({ msg: 'Roles retrieved successfully', data: [] });
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    rolesRepository.findAllByApplicationId.mockRejectedValue(failure);

    await expect(
      service.findAllByApplicationId({ applicationId: 1 }),
    ).rejects.toBe(failure);
  });
});
