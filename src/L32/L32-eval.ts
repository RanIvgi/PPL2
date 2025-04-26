// L32-eval.ts
import { map } from "ramda";
import { isCExp, isLetExp } from "./L32-ast";
import { BoolExp, CExp, Exp, IfExp, LitExp, NumExp,
         PrimOp, ProcExp, Program, StrExp, VarDecl, DictExp, DictLitExp, DictEntry} from "./L32-ast";
import { isAppExp, isBoolExp, isDefineExp, isIfExp, isLitExp, isNumExp,
             isPrimOp, isProcExp, isStrExp, isVarRef ,isDictExp, Binding, isDictLitExp } from "./L32-ast";
import { makeBoolExp, makeLitExp, makeNumExp, makeProcExp, makeStrExp ,makeDictLitExp} from "./L32-ast";
import { parseL32Exp } from "./L32-ast";
import { applyEnv, makeEmptyEnv, makeEnv, Env } from "./L32-env";
import { isClosure, makeClosure, Closure, Value,DictValue , makeDictValue,isDictValue,isSymbolSExp,DictEntryValue,isCompoundSExp,makeSymbolSExp} from "./L32-value";
import { first, rest, isEmpty, List, isNonEmptyList } from '../shared/list';
import { isBoolean, isNumber, isString } from "../shared/type-predicates";
import { Result, makeOk, makeFailure, bind, mapResult, mapv } from "../shared/result";
import { renameExps, substitute } from "./substitute";
import { applyPrimitive } from "./evalPrimitive";
import { parse as p } from "../shared/parser";
import { Sexp } from "s-expression";
import { format } from "../shared/format";

// ========================================================
// Eval functions

const L32applicativeEval = (exp: CExp, env: Env): Result<Value> =>
    isNumExp(exp) ? makeOk(exp.val) : 
    isBoolExp(exp) ? makeOk(exp.val) :
    isStrExp(exp) ? makeOk(exp.val) :
    isPrimOp(exp) ? makeOk(exp) :
    isVarRef(exp) ? applyEnv(env, exp.var) :
    isLitExp(exp) ? makeOk(exp.val) :
    isIfExp(exp) ? evalIf(exp, env) :
    isProcExp(exp) ? evalProc(exp, env) :
    isAppExp(exp) ? bind(L32applicativeEval(exp.rator, env), (rator: Value) =>
                        bind(mapResult(param => L32applicativeEval(param, env), exp.rands), (rands: Value[]) =>
                            L32applyProcedure(rator, rands, env))) :
    isLetExp(exp) ? makeFailure('"let" not supported (yet)') :
    isDictExp(exp) ? evalDict(exp, env) :
    isDictLitExp(exp) ? evalDictLit(exp, env) :
    exp;

    /**
     * Evaluates a dictionary literal expression(DictLitExp) in the given environment.
     * 
     * @param exp - The dictionary literal expression to evaluate.
     * @param env - The environment in which to evaluate the expression.
     * @returns A `Result` containing the evaluated dictionary value if successful, 
     *          or an error if the evaluation fails.
     * 
     * The function processes each dictionary entry by:
     * 1. Evaluating the key as a literal expression.
     * 2. Evaluating the value expression.
     * 3. Combining the evaluated key and value into a `DictEntryValue`.
     * 
     * Finally, it aggregates all evaluated entries into a dictionary value.
     */
    const evalDictLit = (exp: DictLitExp, env: Env): Result<Value> => {
        const evalEntry = (entry: DictEntry): Result<DictEntryValue> =>
            bind(L32applicativeEval(makeLitExp(entry.key), env), (key: Value) =>
            bind(L32applicativeEval(entry.value, env), (value: Value) =>
            makeOk({key, value})));
    
        return bind(mapResult(evalEntry, exp.entries), (entries: DictEntryValue[]) =>
            makeOk(makeDictValue(entries)));
    }

   
    /**
     * Evaluates a dictionary expression (`DictExp`) in the given environment (`Env`).
     * 
     * @param exp - The dictionary expression to evaluate, containing a list of bindings.
     * @param env - The environment in which to evaluate the dictionary expression.
     * @returns A `Result` containing either the evaluated dictionary as a `DictValue` 
     *          or an error if evaluation fails.
     * 
     * The function processes each binding in the dictionary expression by:
     * 1. Evaluating the value of the binding in the given environment.
     * 2. Converting the variable name of the binding into a `SymbolSExp`.
     * 3. Constructing a `DictEntryValue` object with the key and evaluated value.
     * 
     * Finally, it combines all evaluated bindings into a `DictValue` object.
     */
    const evalDict = (exp: DictExp, env: Env): Result<Value> => {
        const evalBinding = (binding: Binding): Result<DictEntryValue> =>
            bind(L32applicativeEval(binding.val, env), (value: Value) =>
                makeOk({
                    key: makeSymbolSExp(binding.var.var), // Convert var name to symbol
                    value
                }));
    
        return bind(mapResult(evalBinding, exp.entries), (entries: DictEntryValue[]) =>
            makeOk(makeDictValue(entries)));
    }

export const isTrueValue = (x: Value): boolean =>
    ! (x === false);

const evalIf = (exp: IfExp, env: Env): Result<Value> =>
    bind(L32applicativeEval(exp.test, env), (test: Value) => 
        isTrueValue(test) ? L32applicativeEval(exp.then, env) : 
        L32applicativeEval(exp.alt, env));

const evalProc = (exp: ProcExp, env: Env): Result<Closure> =>
    makeOk(makeClosure(exp.args, exp.body));

const L32applyProcedure = (proc: Value, args: Value[], env: Env): Result<Value> =>
    isPrimOp(proc) ? applyPrimitive(proc, args) :
    isClosure(proc) ? applyClosure(proc, args, env) :
    isDictValue(proc) ? findInDict(proc, args) :
    makeFailure(`Bad procedure ${format(proc)}`);

/**
 * Find the value associated with a key in a dictionary.
 * 
 * @param dict - The dictionary value to perform the lookup on. It contains entries with keys and values.
 * @param args - An array of values to use as arguments for the lookup. 
 *               Only a single argument is expected, representing the key to search for.
 * @returns A `Result` containing:
 *          - `Ok` with the value associated with the key if the key is found in the dictionary.
 *          - `Failure` with an error message if the key is not found or if the number of arguments is not exactly 1.
 */
const findInDict = (dict: DictValue, args: Value[]): Result<Value> => 
    args.length === 1 
        ? bind(makeOk(dict.entries.find(e => deepEquals(e.key, args[0]))), (entry) =>
            entry ? makeOk(entry.value) : makeFailure(`Key not found in dictionary: ${format(args[0])}. Dictionary contents: ${printDict(dict)}`))
        : makeFailure(`Expected exactly 1 argument for dict lookup, got ${args.length}. Dictionary contents: ${printDict(dict)}`);
const printDict = (dict: DictValue): string => {
    const entries = dict.entries.map(entry => `${format(entry.key)}: ${format(entry.value)}`);
    return `{ ${entries.join(", ")} }`;
}

/**
 * Compares two `Value` objects for deep equality.
 * 
 * This function checks if two values are deeply equal by comparing their types
 * and recursively comparing their properties if they are compound or symbolic expressions.
 * 
 * @param a - The first `Value` to compare.
 * @param b - The second `Value` to compare.
 * @returns `true` if the two values are deeply equal, otherwise `false`.
 */
const deepEquals = (a: Value, b: Value): boolean => 
    (typeof a === typeof b) &&
    (isSymbolSExp(a) && isSymbolSExp(b) ? a.val === b.val :
    isCompoundSExp(a) && isCompoundSExp(b) ? deepEquals(a.val1, b.val1) && deepEquals(a.val2, b.val2) :
    a === b);

// Applications are computed by substituting computed
// values into the body of the closure.
// To make the types fit - computed values of params must be
// turned back in Literal Expressions that eval to the computed value.
const valueToLitExp = (v: Value): NumExp | BoolExp | StrExp | LitExp | PrimOp | ProcExp | DictLitExp =>
    isNumber(v) ? makeNumExp(v) :
    isBoolean(v) ? makeBoolExp(v) :
    isString(v) ? makeStrExp(v) :
    isPrimOp(v) ? v :
    isClosure(v) ? makeProcExp(v.params, v.body) :
    // check if isDictValue and convert to DictLitExp 
    isDictValue(v) ? makeDictLitExp(v.entries.map(entry => ({ key: makeSymbolSExp(format(entry.key)), value: valueToLitExp(entry.value) }))) :
    makeLitExp(v);

const applyClosure = (proc: Closure, args: Value[], env: Env): Result<Value> => {
    const vars = map((v: VarDecl) => v.var, proc.params);
    const body = renameExps(proc.body);
    const litArgs = map(valueToLitExp, args);
    return evalSequence(substitute(body, vars, litArgs), env);
}

// Evaluate a sequence of expressions (in a program)
export const evalSequence = (seq: List<Exp>, env: Env): Result<Value> =>
    isNonEmptyList<Exp>(seq) ? 
        isDefineExp(first(seq)) ? evalDefineExps(first(seq), rest(seq), env) :
        evalCExps(first(seq), rest(seq), env) :
    makeFailure("Empty sequence");

const evalCExps = (first: Exp, rest: Exp[], env: Env): Result<Value> =>
    isCExp(first) && isEmpty(rest) ? L32applicativeEval(first, env) :
    isCExp(first) ? bind(L32applicativeEval(first, env), _ => 
                            evalSequence(rest, env)) :
    makeFailure("Never");

// Eval a sequence of expressions when the first exp is a Define.
// Compute the rhs of the define, extend the env with the new binding
// then compute the rest of the exps in the new env.
const evalDefineExps = (def: Exp, exps: Exp[], env: Env): Result<Value> =>
    isDefineExp(def) ? bind(L32applicativeEval(def.val, env), (rhs: Value) => 
                                evalSequence(exps, makeEnv(def.var.var, rhs, env))) :
    makeFailure(`Unexpected in evalDefine: ${format(def)}`);

// Main program
export const evalL32program = (program: Program): Result<Value> =>
    evalSequence(program.exps, makeEmptyEnv());

export const evalParse = (s: string): Result<Value> =>
    bind(p(s), (sexp: Sexp) => 
        bind(parseL32Exp(sexp), (exp: Exp) =>
            evalSequence([exp], makeEmptyEnv())));

