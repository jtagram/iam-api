import { describe, expect, it } from '@jest/globals';
import { ResponseBody, ResponseBodyBuilder } from '../response-body.dto';

describe('ResponseBody.builder', () => {
  it('returns a builder', () => {
    expect(ResponseBody.builder()).toBeInstanceOf(ResponseBodyBuilder);
  });

  it('builds a ResponseBody with msg and data', () => {
    const body = ResponseBody.builder<{ id: number }>()
      .withMsg('ok')
      .withData({ id: 1 })
      .build();

    expect(body).toBeInstanceOf(ResponseBody);
    expect(body).toEqual({ msg: 'ok', data: { id: 1 } });
  });

  it('accepts falsy data values such as an empty array', () => {
    const body = ResponseBody.builder<number[]>()
      .withMsg('empty')
      .withData([])
      .build();

    expect(body.data).toEqual([]);
  });

  it('accepts an empty message', () => {
    const body = ResponseBody.builder<number>().withMsg('').withData(0).build();

    expect(body).toEqual({ msg: '', data: 0 });
  });

  it('throws when msg was not provided', () => {
    expect(() => ResponseBody.builder<number>().withData(1).build()).toThrow(
      'ResponseBody.Builder: msg is required',
    );
  });

  it('throws when data was not provided', () => {
    expect(() => ResponseBody.builder<number>().withMsg('ok').build()).toThrow(
      'ResponseBody.Builder: data is required',
    );
  });

  it('allows chaining in any order', () => {
    const body = ResponseBody.builder<number>()
      .withData(5)
      .withMsg('later')
      .build();

    expect(body).toEqual({ msg: 'later', data: 5 });
  });
});
