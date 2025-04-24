import { reduce } from "ramda";
import { PrimOp } from "./L31-ast";
import { isCompoundSExp, isEmptySExp, isSymbolSExp, makeCompoundSExp, makeEmptySExp, CompoundSExp, EmptySExp, Value, SymbolSExp } from "./L31-value";
import { List, allT, first, isNonEmptyList, rest } from '../shared/list';
import { isBoolean, isNumber, isString } from "../shared/type-predicates";
import { Result, makeOk, makeFailure } from "../shared/result";
import { format } from "../shared/format";

export const applyPrimitive = (proc: PrimOp, args: Value[]): Result<Value> =>
    proc.op === "+" ? (allT(isNumber, args) ? makeOk(reduce((x, y) => x + y, 0, args)) :
        makeFailure(`+ expects numbers only: ${format(args)}`)) :
        proc.op === "-" ? minusPrim(args) :
            proc.op === "*" ? (allT(isNumber, args) ? makeOk(reduce((x, y) => x * y, 1, args)) :
                makeFailure(`* expects numbers only: ${format(args)}`)) :
                proc.op === "/" ? divPrim(args) :
                    proc.op === ">" ? makeOk(args[0] > args[1]) :
                        proc.op === "<" ? makeOk(args[0] < args[1]) :
                            proc.op === "=" ? makeOk(args[0] === args[1]) :
                                proc.op === "not" ? makeOk(!args[0]) :
                                    proc.op === "and" ? isBoolean(args[0]) && isBoolean(args[1]) ? makeOk(args[0] && args[1]) :
                                        makeFailure(`Arguments to "and" not booleans: ${format(args)}`) :
                                        proc.op === "or" ? isBoolean(args[0]) && isBoolean(args[1]) ? makeOk(args[0] || args[1]) :
                                            makeFailure(`Arguments to "or" not booleans: ${format(args)}`) :
                                            proc.op === "eq?" ? makeOk(eqPrim(args)) :
                                                proc.op === "string=?" ? makeOk(args[0] === args[1]) :
                                                    proc.op === "cons" ? makeOk(consPrim(args[0], args[1])) :
                                                        proc.op === "car" ? carPrim(args[0]) :
                                                            proc.op === "cdr" ? cdrPrim(args[0]) :
                                                                proc.op === "list" ? makeOk(listPrim(args)) :
                                                                    proc.op === "pair?" ? makeOk(isPairPrim(args[0])) :
                                                                        proc.op === "number?" ? makeOk(typeof (args[0]) === 'number') :
                                                                            proc.op === "boolean?" ? makeOk(typeof (args[0]) === 'boolean') :
                                                                                proc.op === "symbol?" ? makeOk(isSymbolSExp(args[0])) :
                                                                                    proc.op === "string?" ? makeOk(isString(args[0])) :
                                                                                        // dict functions
                                                                                        proc.op === "dict" ? makeOk(dictPrim(args[0])) :
                                                                                            proc.op === "get" ? getInDict(args[0], args[1]) :
                                                                                                proc.op === "dict?" ? makeOk(isDictPrim(args[0])) :
                                                                                                    makeFailure(`Bad primitive op: ${format(proc.op)}`);

const minusPrim = (args: Value[]): Result<number> => {
    // TODO complete
    const x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return makeOk(x - y);
    }
    else {
        return makeFailure(`Type error: - expects numbers ${format(args)}`);
    }
};

const divPrim = (args: Value[]): Result<number> => {
    // TODO complete
    const x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return makeOk(x / y);
    }
    else {
        return makeFailure(`Type error: / expects numbers ${format(args)}`);
    }
};

const eqPrim = (args: Value[]): boolean => {
    const x = args[0], y = args[1];
    if (isSymbolSExp(x) && isSymbolSExp(y)) {
        return x.val === y.val;
    }
    else if (isEmptySExp(x) && isEmptySExp(y)) {
        return true;
    }
    else if (isNumber(x) && isNumber(y)) {
        return x === y;
    }
    else if (isString(x) && isString(y)) {
        return x === y;
    }
    else if (isBoolean(x) && isBoolean(y)) {
        return x === y;
    }
    else {
        return false;
    }
};

const carPrim = (v: Value): Result<Value> =>
    isCompoundSExp(v) ? makeOk(v.val1) :
        makeFailure(`Car: param is not compound ${format(v)}`);

const cdrPrim = (v: Value): Result<Value> =>
    isCompoundSExp(v) ? makeOk(v.val2) :
        makeFailure(`Cdr: param is not compound ${format(v)}`);

const consPrim = (v1: Value, v2: Value): CompoundSExp =>
    makeCompoundSExp(v1, v2);

export const listPrim = (vals: List<Value>): EmptySExp | CompoundSExp =>
    isNonEmptyList<Value>(vals) ? makeCompoundSExp(first(vals), listPrim(rest(vals))) :
        makeEmptySExp();

const isPairPrim = (v: Value): boolean =>
    isCompoundSExp(v);

// ------------------------------------------------------------------
// Dictionary primitives
// ------------------------------------------------------------------

// Create a dictionary from a list of pairs (key-value pairs)
const dictPrim = (v: Value): CompoundSExp =>
    isCompoundSExp(v) ? v : makeCompoundSExp(v, makeEmptySExp());


/**
 * Get the value associated with a key in a dictionary.
 * @param dict the dictionary to search in
 * @param key the key to look for
 * @returns Result<Value>
 */
const getInDict = (dict: Value, key: Value): Result<Value> =>
    isCompoundSExp(dict) && isSymbolSExp(key)
        ? findInDict(dict, key)
        : makeFailure(
            `Error in get: Expected a dictionary and a symbol key.`
        );

/**
 * helper function to find a key in a dictionary.
 * @param dict the dictionary to search in
 * @param key the key to look for
 * @returns Result<Value>
 */
const findInDict = (dict: CompoundSExp, key: SymbolSExp): Result<Value> =>
    isEmptySExp(dict.val1)
        ? makeFailure(`get: Key not found in dictionary: ${format(key)}`)
        : isCompoundSExp(dict.val1) &&
            isSymbolSExp(dict.val1.val1) &&
            dict.val1.val1.val === key.val
            ? makeOk(dict.val1.val2)
            : isCompoundSExp(dict.val2)
                ? findInDict(dict.val2, key)
                : makeFailure(`get: Key not found in dictionary: ${format(key)}`);

/**
 *  Check if the value is a dictionary.
 * @param v the value to check
 * @returns boolean
 */
const isDictPrim = (v: Value): boolean =>
    isCompoundSExp(v) && validateDict(v);

/**
 * helper function to check if the dictionary is valid.
 * @param dict the dictionary to check
 * @returns boolean
 */
const validateDict = (dict: CompoundSExp): boolean =>
    isEmptySExp(dict.val2)
        ? isValidPair(dict.val1)
        : isValidPair(dict.val1) &&
        isCompoundSExp(dict.val2) &&
        validateDict(dict.val2);

/**
 * Check if the pair is valid (key-value pair).
 * @param pair the pair to check
 * @returns boolean
 * */
const isValidPair = (pair: Value): boolean =>
    isCompoundSExp(pair) && isSymbolSExp(pair.val1);
