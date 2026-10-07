import { describe, expect, it } from '@jest/globals';
import {
  validateBody,
  validationMessages,
} from '../../../../test/helpers/validation';
import { AssignApplicationDto } from '../assign-application.dto';

describe('AssignApplicationDto', () => {
  it('accepts an integer applicationId', async () => {
    const dto = await validateBody(AssignApplicationDto, { applicationId: 3 });

    expect(dto).toBeInstanceOf(AssignApplicationDto);
    expect(dto.applicationId).toBe(3);
  });

  it('rejects a missing applicationId', async () => {
    const messages = await validationMessages(() =>
      validateBody(AssignApplicationDto, {}),
    );

    expect(messages).toEqual(['applicationId must be an integer number']);
  });

  it('rejects a decimal applicationId', async () => {
    const messages = await validationMessages(() =>
      validateBody(AssignApplicationDto, { applicationId: 1.5 }),
    );

    expect(messages).toEqual(['applicationId must be an integer number']);
  });

  it('rejects a numeric string (no implicit conversion in body)', async () => {
    const messages = await validationMessages(() =>
      validateBody(AssignApplicationDto, { applicationId: '3' }),
    );

    expect(messages).toEqual(['applicationId must be an integer number']);
  });

  it('strips unknown properties', async () => {
    const dto = await validateBody(AssignApplicationDto, {
      applicationId: 3,
      admin: true,
    });

    expect(dto).toEqual({ applicationId: 3 });
  });
});
