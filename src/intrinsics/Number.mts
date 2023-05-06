// @ts-nocheck
import {
  IsIntegralNumber,
  OrdinaryCreateFromConstructor,
  ToNumeric,
  F,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  NumberValue,
  BigIntValue,
  Value,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** http://tc39.es/ecma262/#sec-number-constructor-number-value */
function NumberConstructor([value], { NewTarget }) {
  let n;
  if (value !== undefined) {
    const prim = Q(ToNumeric(value));
    if (prim instanceof BigIntValue) {
      n = F(Number(prim.bigintValue()));
    } else {
      n = prim;
    }
  } else {
    n = F(+0);
  }
  if (NewTarget === Value.undefined) {
    return n;
  }
  const O = OrdinaryCreateFromConstructor(NewTarget, '%Number.prototype%', ['NumberData']);
  O.NumberData = n;
  return O;
}

/** http://tc39.es/ecma262/#sec-number.isfinite */
function Number_isFinite([number = Value.undefined]) {
  if (!(number instanceof NumberValue)) {
    return Value.false;
  }

  if (number.isNaN() || number.isInfinity()) {
    return Value.false;
  }
  return Value.true;
}

/** http://tc39.es/ecma262/#sec-number.isinteger */
function Number_isInteger([number = Value.undefined]) {
  return X(IsIntegralNumber(number));
}

/** http://tc39.es/ecma262/#sec-number.isnan */
function Number_isNaN([number = Value.undefined]) {
  if (!(number instanceof NumberValue)) {
    return Value.false;
  }

  if (number.isNaN()) {
    return Value.true;
  }
  return Value.false;
}

/** http://tc39.es/ecma262/#sec-number.issafeinteger */
function Number_isSafeInteger([number = Value.undefined]) {
  if (!(number instanceof NumberValue)) {
    return Value.false;
  }

  if (X(IsIntegralNumber(number)) === Value.true) {
    if (Math.abs(number.numberValue()) <= (2 ** 53) - 1) {
      return Value.true;
    }
  }

  return Value.false;
}

export function bootstrapNumber(realmRec) {
  const override = {
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  };
  const numberConstructor = bootstrapConstructor(realmRec, NumberConstructor, 'Number', 1, realmRec.Intrinsics['%Number.prototype%'], [
    ['EPSILON', F(Number.EPSILON), undefined, override],
    ['MAX_SAFE_INTEGER', F(Number.MAX_SAFE_INTEGER), undefined, override],
    ['MAX_VALUE', F(Number.MAX_VALUE), undefined, override],
    ['MIN_SAFE_INTEGER', F(Number.MIN_SAFE_INTEGER), undefined, override],
    ['MIN_VALUE', F(Number.MIN_VALUE), undefined, override],
    ['NaN', F(NaN), undefined, override],
    ['NEGATIVE_INFINITY', F(-Infinity), undefined, override],
    ['POSITIVE_INFINITY', F(+Infinity), undefined, override],

    ['isFinite', Number_isFinite, 1],
    ['isInteger', Number_isInteger, 1],
    ['isNaN', Number_isNaN, 1],
    ['isSafeInteger', Number_isSafeInteger, 1],
  ]);

  /** http://tc39.es/ecma262/#sec-number.parsefloat */
  // The value of the Number.parseFloat data property is the same built-in function object that is the value of the parseFloat property of the global object defined in 18.2.4.
  X(numberConstructor.DefineOwnProperty(Value('parseFloat'), Descriptor({
    Value: realmRec.Intrinsics['%parseFloat%'],
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  /** http://tc39.es/ecma262/#sec-number.parseint */
  // The value of the Number.parseInt data property is the same built-in function object that is the value of the parseInt property of the global object defined in 18.2.5.
  X(numberConstructor.DefineOwnProperty(Value('parseInt'), Descriptor({
    Value: realmRec.Intrinsics['%parseInt%'],
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%Number%'] = numberConstructor;
}
