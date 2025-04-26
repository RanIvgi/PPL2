import { Sexp } from 's-expression';
import { makePrimOp, makeBinding, isLetExp , makeLetExp, makeProcExp, isIfExp , isProcExp, isAppExp, makeIfExp, CExp, AppExp,
    Exp, makeProgram, Binding, Program, makeAppExp, makeVarRef, isProgram, isDefineExp, makeDefineExp, isCExp } from './L32/L32-ast';
import { DictEntry,makeLitExp,DictExp, isDictExp } from './L32/L32-ast';
import { makeCompoundSExp, makeEmptySExp, SExpValue } from './L32/L32-value';

/*
Purpose: Transform L32 program to L3
Signature: L32ToL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog: Program): Program =>
    isProgram(prog) ? Dict2App(prog) : makeProgram([]);

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

/*
Purpose: Transform a DictExp into an AppExp that constructs the dictionary.
Signature: rewriteDictExp(exp)
Type: DictExp -> AppExp
*/
const rewriteDictExp = (exp: DictExp): AppExp =>
    makeAppExp(makeVarRef("dict"), exp.entries.map(entry => 
        makeLitExp(makeCompoundSExp(entry.key, entry.value as SExpValue))));

/*
Purpose: Transform dictionary application into an AppExp.
Signature: rewriteDictAppExp(exp)
Type: AppExp -> AppExp
*/
const rewriteDictAppExp = (exp: AppExp): AppExp => 
    makeAppExp(
        rewriteCExp(exp.rator),
        exp.rands.map(rewriteCExp).map((rand, index, rands) =>
            isDictExp(rewriteCExp(exp.rator)) && rands.length === 1 && index === 0
                ? makeAppExp(makeVarRef("get"), [rewriteCExp(exp.rator), rand])
                : rand
        )
    );