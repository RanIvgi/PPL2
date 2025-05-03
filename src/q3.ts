import {
    Exp, Program, DefineExp, CExp, AppExp, PrimOp, IfExp, ProcExp,
    BoolExp, NumExp, StrExp, VarRef, isExp, isProgram, isDefineExp, isAppExp,
    isPrimOp, isIfExp, isProcExp, isBoolExp, isNumExp, isStrExp, isVarRef
} from './L3/L3-ast';

import { Result, makeFailure, makeOk, bind, mapResult } from './shared/result';

/*
Purpose: Transform L3 AST to JavaScript program string
Signature: l2ToJS(l2AST)
Type: [Exp | Program] => Result<string>
*/

export const l2ToJS = (exp: Exp | Program): Result<string> =>
    isProgram(exp) ? programToJS(exp) :
        isDefineExp(exp) ? defineToJS(exp) :
            isExp(exp) ? cexpToJS(exp) :
                makeFailure("Unknown expression");

const programToJS = (prog: Program): Result<string> =>
    bind(mapResult(l2ToJS, prog.exps), (lines: string[]) =>
        makeOk(lines.join(";\n"))
    );

const defineToJS = (exp: DefineExp): Result<string> =>
    bind(cexpToJS(exp.val), (val: string) =>
        makeOk(`const ${exp.var.var} = ${val}`)
    );

const cexpToJS = (exp: CExp): Result<string> =>
    isAppExp(exp) ? appToJS(exp) :
        isPrimOp(exp) ? makeOk(primOpToJS(exp)) :
            isIfExp(exp) ? ifToJS(exp) :
                isProcExp(exp) ? procToJS(exp) :
                    isBoolExp(exp) ? makeOk(exp.val ? "true" : "false") :
                        isNumExp(exp) ? makeOk(exp.val.toString()) :
                            isStrExp(exp) ? makeOk(`"${exp.val}"`) :
                                isVarRef(exp) ? makeOk(exp.var) :
                                    makeFailure("Unknown CExp");

const appToJS = (exp: AppExp): Result<string> =>
    bind(mapResult(cexpToJS, exp.rands), (args: string[]) =>
        isPrimOp(exp.rator) ?
            exp.rator.op === "not" ? makeOk(`(!${args[0]})`) : makeOk(`(${args.join(` ${primOpToJS(exp.rator)} `)})`)
            : bind(cexpToJS(exp.rator), (rator: string) => makeOk(`${rator}(${args.join(",")})`)
            )
    );




const primOpToJS = (op: PrimOp): string =>
    op.op === "=" ? "===" :
        op.op === "eq?" ? "===" :
            op.op === "not" ? "!" :
                op.op; // fallback: '+', '-', etc.




const ifToJS = (exp: IfExp): Result<string> =>
    bind(cexpToJS(exp.test), (test: string) =>
        bind(cexpToJS(exp.then), (then: string) =>
            bind(cexpToJS(exp.alt), (alt: string) =>
                makeOk(`(${test} ? ${then} : ${alt})`)
            )
        )
    );

    const procToJS = (exp: ProcExp): Result<string> =>
        bind(mapResult(v => makeOk(v.var), exp.args), (args: string[]) =>
            bind(mapResult(cexpToJS, exp.body), (body: string[]) =>
                makeOk(`((${args.join(",")}) => ${body.length === 1 ? body[0] : `{\n${body.join(";\n")}\n}`})`)
            )
        );

