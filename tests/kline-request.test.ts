import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCompleteKlineResult, KLINE_REQUEST_OPTIONS } from '../lib/kline-request';

test('K线请求使用独立非思考 JSON 通道', () => {
  assert.equal(KLINE_REQUEST_OPTIONS.thinking, 'disabled');
  assert.equal(KLINE_REQUEST_OPTIONS.responseFormat, 'json_object');
  assert.equal(KLINE_REQUEST_OPTIONS.visualResponse, false);
});

test('K线拒绝不足 7 步大运或 70 年流年的不完整结果', () => {
  assert.throws(
    () => assertCompleteKlineResult({ dayun: Array(7), liunian: Array(69) }),
    /70 年/,
  );
  assert.doesNotThrow(() => assertCompleteKlineResult({ dayun: Array(7), liunian: Array(70) }));
});
