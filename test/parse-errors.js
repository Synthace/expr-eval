/* global describe, it */

'use strict';

var assert = require('assert');
var bundle = require('../dist/bundle');
var Parser = bundle.Parser;
var ParseError = bundle.ParseError;

describe('parse error positions', function () {
  var parser = new Parser();
  var parserNoMember = new Parser({ allowMemberAccess: false });

  function getError(fn) {
    try {
      fn();
      throw new Error('expected parse error but none was thrown');
    } catch (e) {
      return e;
    }
  }

  function assertPosition(msg) {
    assert.ok(/parse error \[\d+:\d+\]/.test(msg), 'expected position in error: ' + msg);
  }

  it('errors are instanceof ParseError', function () {
    var e = getError(function () { parser.parse('1 + @'); });
    assert.ok(e instanceof ParseError, 'expected ParseError instance');
  });

  it('ParseError has startPos and endPos', function () {
    var e = getError(function () { parser.parse('1 + @'); });
    assert.ok(typeof e.startPos === 'number', 'startPos should be a number');
    assert.ok(typeof e.endPos === 'number', 'endPos should be a number');
    assert.ok(e.endPos > e.startPos, 'endPos should be greater than startPos');
  });

  it('unexpected token in atom — message has position', function () {
    var e = getError(function () { parser.parse('1 + @'); });
    assertPosition(e.message);
  });

  it('unexpected end of expression', function () {
    var e = getError(function () { parser.parse('1 +'); });
    assertPosition(e.message);
  });

  it('expected variable for assignment', function () {
    var e = getError(function () { parser.parse('1 = 2'); });
    assertPosition(e.message);
  });

  it('member access not permitted', function () {
    var e = getError(function () { parserNoMember.parse('a.b'); });
    assertPosition(e.message);
  });

  it('unknown character', function () {
    var e = getError(function () { parser.parse('1 + `2`'); });
    assertPosition(e.message);
  });

  it('illegal unicode escape', function () {
    var e = getError(function () { parser.parse('"\\uXXXX"'); });
    assertPosition(e.message);
  });

  it('expected closing paren', function () {
    var e = getError(function () { parser.parse('(1 + 2'); });
    assertPosition(e.message);
  });

  it('column position is correct for mid-expression error', function () {
    // "1 + @"
    //  1234^  => column 5
    var e = getError(function () { parser.parse('1 + @'); });
    assert.ok(e.message.includes('[1:5]'), 'expected column 5, got: ' + e.message);
  });

  it('startPos points at the offending token', function () {
    // "1 + @" — '@' is at index 4
    var e = getError(function () { parser.parse('1 + @'); });
    assert.strictEqual(e.startPos, 4, 'startPos should be 4, got ' + e.startPos);
  });

  it('endPos covers the offending token span for unknown char', function () {
    // '@' at index 4, endPos should be 5
    var e = getError(function () { parser.parse('1 + @'); });
    assert.strictEqual(e.endPos, e.startPos + 1);
  });

  // These tests verify that endPos is a valid number (not NaN) for error paths
  // where the offending token's position is read from the token object.

  it('unexpected token in atom — endPos is a finite number', function () {
    const e = getError(function () { parser.parse('1 + %'); });
    assert.ok(Number.isFinite(e.endPos), 'endPos should be finite, got: ' + e.endPos);
    assert.strictEqual(e.endPos, 5);
  });

  it('expected variable for assignment — endPos is a finite number', function () {
    const e = getError(function () { parser.parse('1 = 2'); });
    assert.strictEqual(e.endPos, 3);
  });

  it('member access not permitted — endPos is a finite number', function () {
    const e = getError(function () { parserNoMember.parse('a.b'); });
    assert.strictEqual(e.endPos, 2);
  });

  it('arrays disabled — endPos is a finite number', function () {
    const parserNoArrays = new Parser({ operators: { array: false } });
    const e = getError(function () { parserNoArrays.parse('a[0]'); });
    assert.strictEqual(e.endPos, 2);
  });
});
