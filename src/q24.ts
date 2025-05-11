import { Sexp } from 's-expression';
import * as fs from 'fs';
import {
    makePrimOp, makeBinding, isLetExp, makeLetExp, makeProcExp, isIfExp, isProcExp, isAppExp, makeIfExp, CExp, AppExp,
    Exp, makeProgram, Binding, Program, makeAppExp, makeVarRef, isProgram, isDefineExp, makeDefineExp, isCExp,
    CompoundExp,
    isVarRef, isLitExp, isAtomicExp,
    isNumExp,
    isBoolExp,
    unparseL32,
    parseL32,
    parseL32Exp,
    parseSExp
} from './L32/L32-ast';
import { DictEntry, makeLitExp, DictExp, isDictExp } from './L32/L32-ast';
import { makeCompoundSExp, makeEmptySExp, SExpValue, CompoundSExp, makeSymbolSExp } from './L32/L32-value';
import { parseL3 } from "../src/L3/L3-ast";
import { isOk, Result } from './shared/result';
import { bind, is } from 'ramda';
import { isString } from './shared/type-predicates';

// import the function we build in question 2.3
const q23: string = fs.readFileSync(__dirname + '/../src/q23.l3', { encoding: 'utf-8' });
const q23L3: Result<Program> = parseL3(`(L3 ${q23})`);

// Function to merge two programs into one in a functional way
export const mergePrograms = (prog1: Program, prog2: Program): Program =>
    makeProgram([...prog1.exps, ...prog2.exps]);

// Purpose: Parse the L3 program and transform it to program before merge
export const q23L3Program = (st: Result<Program>): Program =>
    isOk(st) ? st.value : makeProgram([]);
/*
Purpose: Transform L32 program to L3
Signature: L32ToL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog: Program): Program =>
    isProgram(prog) ? mergePrograms(q23L3Program(q23L3), Dict2App(prog)) : makeProgram([]);

/*
Purpose: Rewrite all occurrences of DictExp and dictionary applications in a program to AppExp.
Signature: Dict2App(exp)
Type: Program -> Program
*/
export const Dict2App = (exp: Program): Program =>
    isProgram(exp) ? makeProgram(exp.exps.map(rewriteExp)) : exp;

/*
Purpose: Rewrite an expression, transforming DictExp and dictionary applications to AppExp.
Signature: rewriteExp(exp)
Type: Exp -> Exp
*/
const rewriteExp = (exp: Exp): Exp =>
    isDefineExp(exp) ? makeDefineExp(exp.var, rewriteCExp(exp.val)) :
        isCExp(exp) ? rewriteCExp(exp) :
            exp;

/*
Purpose: Rewrite a compound expression, transforming DictExp and dictionary applications to AppExp.
Signature: rewriteCExp(cexp)
Type: CExp -> CExp
*/
const rewriteCExp = (cexp: CExp): CExp =>
    isDictExp(cexp) ? rewriteDictExp(cexp) :
        isAppExp(cexp) ? rewriteDictAppExp(cexp) :
            isIfExp(cexp) ? makeIfExp(rewriteCExp(cexp.test), rewriteCExp(cexp.then), rewriteCExp(cexp.alt)) :
                isProcExp(cexp) ? makeProcExp(cexp.args, cexp.body.map(rewriteCExp)) :
                    isLetExp(cexp) ? makeLetExp(cexp.bindings.map(b => makeBinding(b.var.var, rewriteCExp(b.val))), cexp.body.map(rewriteCExp)) :
                        cexp;


/**
 * * Purpose: Transform a dictionary entry into a compound S-expression.
 * @param entries - A dictionary entrys, which is an array of key-value pairs.
 * @returns A compound S-expression (list) representing the dictionary entry.
 */
const rewriteDictEntry = (entries: DictEntry[]): CompoundSExp => {
    const key = entries[0].key;
    const value = entries[0].value;

    const handleValue = (val: CExp): SExpValue => {
        if (isVarRef(val)) return makeSymbolSExp(val.var);
        else if (isNumExp(val)) return val.val;
        else if (isBoolExp(val)) return val.val;
        else if (isString(val)) return val;
        else if (isLitExp(val)) return val.val;
        else {
            const parsedResult = parseL3('(L3 \'' + unparseL32(val) + ")");
            if (isOk(parsedResult)) {
                const firstExp = parsedResult.value.exps[0];
                if (isLitExp(firstExp)) {
                    return firstExp.val;
                } else {
                    throw new Error(`Parsed expression is not a LitExp: ${JSON.stringify(firstExp)}`);
                }
            }
            throw new Error(`Failed to parse SExp: ${parsedResult.message}`);
        }
    };

    if (entries.length === 1) {
        return makeCompoundSExp(
            makeCompoundSExp(key, handleValue(value)),
            makeEmptySExp()
        );
    }

    return makeCompoundSExp(
        makeCompoundSExp(key, handleValue(value)),
        rewriteDictEntry(entries.slice(1))
    );
};

/*
Purpose: Transform a DictExp into an AppExp that constructs the dictionary.
Signature: rewriteDictExp(exp)
Type: DictExp -> AppExp
*/
const rewriteDictExp = (exp: DictExp): AppExp =>
    makeAppExp(makeVarRef("dict"), [makeLitExp(rewriteDictEntry(exp.entries))]);

/*
Purpose: Transform dictionary application into an AppExp.
Signature: rewriteDictAppExp(exp)
Type: AppExp -> AppExp
*/
const rewriteDictAppExp = (exp: AppExp): AppExp =>
    isDictExp(exp.rator) ? makeAppExp(makeVarRef("get"), [rewriteDictExp(exp.rator), ...exp.rands.map(exp => rewriteCExp(exp))]) :
    isIfExp(exp.rator) ? makeAppExp(makeVarRef("get"), [rewriteCExp(exp.rator), ...exp.rands.map(exp => rewriteCExp(exp))]) :
        makeAppExp(rewriteCExp(exp.rator), exp.rands.map(rewriteCExp));
