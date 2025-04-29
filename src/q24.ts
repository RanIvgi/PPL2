import { Sexp } from 's-expression';
import * as fs from 'fs';
import {
    makePrimOp, makeBinding, isLetExp, makeLetExp, makeProcExp, isIfExp, isProcExp, isAppExp, makeIfExp, CExp, AppExp,
    Exp, makeProgram, Binding, Program, makeAppExp, makeVarRef, isProgram, isDefineExp, makeDefineExp, isCExp,
    CompoundExp,
    isVarRef, isLitExp, isAtomicExp,
    isNumExp
} from './L32/L32-ast';
import { DictEntry, makeLitExp, DictExp, isDictExp } from './L32/L32-ast';
import { makeCompoundSExp, makeEmptySExp, SExpValue, CompoundSExp, makeSymbolSExp } from './L32/L32-value';
import { parseL3 } from "../src/L3/L3-ast";
import { isOk, Result } from './shared/result';
import { bind, is } from 'ramda';

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
const rewriteDictEntry = (entries: DictEntry[]): CompoundSExp =>
    // TODO: handle all the options for the value of the entry]
    entries.length === 1
        ? isVarRef(entries[0].value) ? makeCompoundSExp(makeCompoundSExp(entries[0].key, makeSymbolSExp(entries[0].value.var)), makeEmptySExp()) :
        isNumExp(entries[0].value) ? makeCompoundSExp(makeCompoundSExp(entries[0].key, entries[0].value.val), makeEmptySExp()) :
            makeCompoundSExp(makeCompoundSExp(entries[0].key, entries[0].value as SExpValue), makeEmptySExp()) :
        isVarRef(entries[0].value) ? makeCompoundSExp(makeCompoundSExp(entries[0].key, makeSymbolSExp(entries[0].value.var)), rewriteDictEntry(entries.slice(1))) :
        isNumExp(entries[0].value) ? makeCompoundSExp(makeCompoundSExp(entries[0].key, entries[0].value.val), rewriteDictEntry(entries.slice(1))) :
            makeCompoundSExp(makeCompoundSExp(entries[0].key, entries[0].value as SExpValue), rewriteDictEntry(entries.slice(1)));

        

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
        makeAppExp(rewriteCExp(exp.rator), exp.rands.map(rewriteCExp));
