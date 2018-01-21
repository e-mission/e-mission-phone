/*globals beforeEach, describe, it, module, inject, expect */

describe('Polyfill : string.startsWith', function () {
    'use strict';

    it('should be defined', function () {
        expect(String.prototype.startsWith).toBeDefined();
    });

    it('should be truthy', function () {
        expect('a'.startsWith('a')).toBeTruthy();
        expect('abc'.startsWith('a')).toBeTruthy();
        expect('abc'.startsWith('ab')).toBeTruthy();
        expect('abc'.startsWith('abc')).toBeTruthy();
        expect('0'.startsWith('0')).toBeTruthy();
        expect('0s5d456svd'.startsWith('0')).toBeTruthy();
        expect('0s5d456svd'.startsWith('0s5d456')).toBeTruthy();
    });

    it('should be falsy', function () {
        expect('b'.startsWith('a')).toBeFalsy();
        expect('b'.startsWith('abc')).toBeFalsy();
        expect('bcd'.startsWith('a')).toBeFalsy();
        expect('bcd'.startsWith('bd')).toBeFalsy();
        expect('bcd'.startsWith('bcde')).toBeFalsy();
    });
});