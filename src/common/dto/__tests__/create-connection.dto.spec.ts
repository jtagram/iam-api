import { describe, expect, it } from '@jest/globals';
import {
  validateBody,
  validationMessages,
} from '../../../../test/helpers/validation';
import { CreateConnectionDto } from '../create-connection.dto';

describe('CreateConnectionDto', () => {
  it('accepts two integer application ids', async () => {
    const dto = await validateBody(CreateConnectionDto, {
      originApplicationId: 1,
      destinationApplicationId: 2,
    });

    expect(dto).toBeInstanceOf(CreateConnectionDto);
    expect(dto).toEqual({
      originApplicationId: 1,
      destinationApplicationId: 2,
    });
  });

  it('rejects a missing originApplicationId', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateConnectionDto, { destinationApplicationId: 2 }),
    );

    expect(messages).toEqual(['originApplicationId must be an integer number']);
  });

  it('rejects a missing destinationApplicationId', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateConnectionDto, { originApplicationId: 1 }),
    );

    expect(messages).toEqual([
      'destinationApplicationId must be an integer number',
    ]);
  });

  it('reports both fields when the body is empty', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateConnectionDto, {}),
    );

    expect(messages).toEqual([
      'originApplicationId must be an integer number',
      'destinationApplicationId must be an integer number',
    ]);
  });

  it('rejects non-integer ids', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateConnectionDto, {
        originApplicationId: 1.1,
        destinationApplicationId: '2',
      }),
    );

    expect(messages).toHaveLength(2);
  });

  it('accepts equal ids (the same-application rule lives in the service)', async () => {
    await expect(
      validateBody(CreateConnectionDto, {
        originApplicationId: 1,
        destinationApplicationId: 1,
      }),
    ).resolves.toBeInstanceOf(CreateConnectionDto);
  });

  it('strips unknown properties', async () => {
    const dto = await validateBody(CreateConnectionDto, {
      originApplicationId: 1,
      destinationApplicationId: 2,
      appUserId: 50,
    });

    expect(dto).toEqual({
      originApplicationId: 1,
      destinationApplicationId: 2,
    });
  });
});
