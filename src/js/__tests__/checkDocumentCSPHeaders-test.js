/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {checkDocumentCSPHeaders} from '../content/checkDocumentCSPHeaders';
import {ORIGIN_TYPE} from '../config';

describe('checkDocumentCSPHeaders', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
  });
  describe('Enforce precedence', () => {
    it('Enforce valid policy from script-src', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
            `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';` +
            'worker-src *.facebook.com/worker_url;',
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Enforce valid policy from default-src', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
            'worker-src *.facebook.com/worker_url;',
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Enforce invalid due to script-src, missing Report policy', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          `default-src data: blob: 'self' *.facebook.com *.fbcdn.net;` +
            `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';` +
            'worker-src *.facebook.com/worker_url;',
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeFalsy();
    });
    it('Enforce invalid due to default-src, missing Report policy', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'unsafe-eval';` +
            'worker-src *.facebook.com/worker_url;',
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeFalsy();
    });
  });
  describe('Report affecting outcome', () => {
    it('Enforce invalid, correct Report policy because of script-src', () => {
      const isValid = checkDocumentCSPHeaders(
        ['worker-src *.facebook.com/worker_url;'],
        [
          `default-src data: blob: 'self' *.facebook.com *.fbcdn.net;` +
            `script-src *.facebook.com *.fbcdn.net blob: data: 'self';`,
        ],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Enforce invalid, correct Report policy because of default-src', () => {
      const isValid = checkDocumentCSPHeaders(
        ['worker-src *.facebook.com/worker_url;'],
        [`default-src data: blob: 'self' *.facebook.com *.fbcdn.net;`],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Enforce invalid, incorrect Report policy because of script-src', () => {
      const isValid = checkDocumentCSPHeaders(
        ['worker-src *.facebook.com/worker_url;'],
        [
          `default-src data: blob: 'self' *.facebook.com *.fbcdn.net;` +
            `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
        ],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeFalsy();
    });
    it('Enforce invalid, incorrect Report policy because of default-src', () => {
      const isValid = checkDocumentCSPHeaders(
        ['worker-src *.facebook.com/worker_url;'],
        [
          `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'unsafe-eval';`,
        ],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeFalsy();
    });
  });
  describe('Multiple policies, enforcement', () => {
    it('Should be valid if one of the policies is enforcing, both script-src', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';` +
            'worker-src *.facebook.com/worker_url;',
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Should be valid if one of the policies is enforcing, both default-src', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          `default-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';` +
            'worker-src *.facebook.com/worker_url;',
          `default-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Should be valid if one of the policies is enforcing, script-src precedence', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          `default-src 'unsafe-eval';` +
            'worker-src *.facebook.com/worker_url;',
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Should be valid if one of the policies is enforcing, script-src precedence', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          ``,
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';` +
            'worker-src *.facebook.com/worker_url;',
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Should be valid if one of the policies is enforcing, default-src precedence', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          ``,
          `default-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';` +
            'worker-src *.facebook.com/worker_url;',
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Should be invalid if policy with precedence is not enforcing, script-src precedence', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          `default-src *.facebook.com;`,
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeFalsy();
    });
    it('Should be invalid if none of the policies are enforcing, script-src precedence', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          `default-src *.facebook.com;` +
            `script-src *.facebook.com 'unsafe-eval';`,
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeFalsy();
    });
    it('Should be invalid if valid policies but missing worker-src', () => {
      const isValid = checkDocumentCSPHeaders(
        [
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeFalsy();
    });
  });
  describe('Multiple policies, report-only', () => {
    it('Should be valid if one of the policies is reporting, both script-src', () => {
      const isValid = checkDocumentCSPHeaders(
        ['worker-src *.facebook.com/worker_url;'],
        [
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self';`,
        ],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Should be valid if one of the policies is reporting, both default-src', () => {
      const isValid = checkDocumentCSPHeaders(
        ['worker-src *.facebook.com/worker_url;'],
        [
          `default-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
          `default-src *.facebook.com *.fbcdn.net blob: data: 'self';`,
        ],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Should be valid if one of the policies is reporting, script-src precedence', () => {
      const isValid = checkDocumentCSPHeaders(
        ['worker-src *.facebook.com/worker_url;'],
        [
          `default-src 'unsafe-eval';`,
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self';`,
        ],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Should be valid if one of the policies is reporting, script-src precedence', () => {
      const isValid = checkDocumentCSPHeaders(
        ['worker-src *.facebook.com/worker_url;'],
        [``, `script-src *.facebook.com *.fbcdn.net blob: data: 'self';`],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Should be valid if one of the policies is reporting, default-src precedence', () => {
      const isValid = checkDocumentCSPHeaders(
        ['worker-src *.facebook.com/worker_url;'],
        [``, `default-src *.facebook.com *.fbcdn.net blob: data: 'self';`],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeTruthy();
    });
    it('Should be invalid if policy with precedence is not reporting, script-src precedence', () => {
      const isValid = checkDocumentCSPHeaders(
        [],
        [
          `default-src *.facebook.com;`,
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
        ],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeFalsy();
    });
    it('Should be invalid if none of the policies are reporting, script-src precedence', () => {
      const isValid = checkDocumentCSPHeaders(
        [],
        [
          `default-src *.facebook.com;` +
            `script-src *.facebook.com 'unsafe-eval';`,
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
        ],
        ORIGIN_TYPE.FACEBOOK,
      );
      expect(isValid).toBeFalsy();
    });
  });
  describe('Worker CSP', () => {
    it('Should be invalid if no worker-src', () => {
      expect(
        checkDocumentCSPHeaders(
          [
            `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
              `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
          ],
          [],
          ORIGIN_TYPE.FACEBOOK,
        ),
      ).toBeFalsy();
    });
    it('Should be invalid if we have a valid worker-src', () => {
      expect(
        checkDocumentCSPHeaders(
          [
            `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
              `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';` +
              'worker-src *.facebook.com/worker_url;',
          ],
          [],
          ORIGIN_TYPE.FACEBOOK,
        ),
      ).toBeTruthy();
    });
    it('Should be invalid if we have an invalid worker-src (domain wide url scheme)', () => {
      expect(
        checkDocumentCSPHeaders(
          [
            `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
              `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';` +
              'worker-src *.facebook.com;',
          ],
          [],
          ORIGIN_TYPE.FACEBOOK,
        ),
      ).toBeFalsy();
    });
    it('Should be valid if we have valid worker-src (different origin domain wide url scheme)', () => {
      expect(
        checkDocumentCSPHeaders(
          [
            `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
              `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';` +
              'worker-src *.facebook.com/;',
          ],
          [],
          ORIGIN_TYPE.INSTAGRAM,
        ),
      ).toBeTruthy();
    });
    it('Should be invalid if we have an invalid worker-src (domain wide url scheme)', () => {
      expect(
        checkDocumentCSPHeaders(
          [
            `default-src data: blob: 'self' *.instagram.com *.fbcdn.net 'wasm-unsafe-eval';` +
              `script-src *.instagram.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';` +
              'worker-src *.instagram.com/;',
          ],
          [],
          ORIGIN_TYPE.INSTAGRAM,
        ),
      ).toBeFalsy();
    });
    it('Should be invalid if we have an invalid worker-src (data:)', () => {
      expect(
        checkDocumentCSPHeaders(
          [
            `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
              `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';` +
              'worker-src data:',
          ],
          [],
          ORIGIN_TYPE.FACEBOOK,
        ),
      ).toBeFalsy();
    });
    it('Should be invalid if we have an invalid worker-src (blob:)', () => {
      expect(
        checkDocumentCSPHeaders(
          [
            `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
              `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';` +
              'worker-src blob:',
          ],
          [],
          ORIGIN_TYPE.FACEBOOK,
        ),
      ).toBeFalsy();
    });
    it('Should be invalid if we have a mix of valid and invalid source values', () => {
      expect(
        checkDocumentCSPHeaders(
          [
            `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
              `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';` +
              'worker-src blob: facebook.com/worker_url;',
          ],
          [],
          ORIGIN_TYPE.FACEBOOK,
        ),
      ).toBeFalsy();
    });
  });
});
