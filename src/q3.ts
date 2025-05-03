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
    // Check if the input is a Program or an individual expression and process accordingly
    isProgram(exp) ? programToJS(exp) :
        isDefineExp(exp) ? defineToJS(exp) :
            isExp(exp) ? cexpToJS(exp) :
                makeFailure("Unknown expression");

/*
Purpose: Convert a Program AST to a JavaScript string
Signature: programToJS(prog)
Type: Program => Result<string>
*/
const programToJS = (prog: Program): Result<string> =>
    // Map each expression in the program to its JavaScript equivalent and join them with semicolons
    bind(mapResult(l2ToJS, prog.exps), (lines: string[]) =>
        makeOk(lines.join(";\n"))
    );

/*
Purpose: Convert a DefineExp AST to a JavaScript string
Signature: defineToJS(exp)
Type: DefineExp => Result<string>
*/
const defineToJS = (exp: DefineExp): Result<string> =>
    // Convert the value of the definition and format it as a JavaScript constant declaration
    bind(cexpToJS(exp.val), (val: string) =>
        makeOk(`const ${exp.var.var} = ${val}`)
    );

/*
Purpose: Convert a CExp AST to a JavaScript string
Signature: cexpToJS(exp)
Type: CExp => Result<string>
*/
const cexpToJS = (exp: CExp): Result<string> =>
    // Handle each type of CExp (application, primitive operation, if, procedure, etc.)
    isAppExp(exp) ? appToJS(exp) :
        isPrimOp(exp) ? makeOk(primOpToJS(exp)) :
            isIfExp(exp) ? ifToJS(exp) :
                isProcExp(exp) ? procToJS(exp) :
                    isBoolExp(exp) ? makeOk(exp.val ? "true" : "false") :
                        isNumExp(exp) ? makeOk(exp.val.toString()) :
                            isStrExp(exp) ? makeOk(`"${exp.val}"`) :
                                isVarRef(exp) ? makeOk(exp.var) :
                                    makeFailure("Unknown CExp");

/*
Purpose: Convert an AppExp AST to a JavaScript string
Signature: appToJS(exp)
Type: AppExp => Result<string>
*/
const appToJS = (exp: AppExp): Result<string> =>
    // Convert the operands and handle primitive operations or function applications
    bind(mapResult(cexpToJS, exp.rands), (args: string[]) =>
        isPrimOp(exp.rator) ?
            exp.rator.op === "not" ? makeOk(`(!${args[0]})`) : makeOk(`(${args.join(` ${primOpToJS(exp.rator)} `)})`)
            : bind(cexpToJS(exp.rator), (rator: string) => makeOk(`${rator}(${args.join(",")})`)
            )
    );

/*
Purpose: Convert a PrimOp AST to its JavaScript equivalent
Signature: primOpToJS(op)
Type: PrimOp => string
*/
const primOpToJS = (op: PrimOp): string =>
    // Map L3 primitive operators to their JavaScript equivalents
    op.op === "=" ? "===" :
        op.op === "eq?" ? "===" :
            op.op === "not" ? "!" :
                op.op; // fallback: '+', '-', etc.

/*
Purpose: Convert an IfExp AST to a JavaScript string
Signature: ifToJS(exp)
Type: IfExp => Result<string>
*/
const ifToJS = (exp: IfExp): Result<string> =>
    // Convert the test, then, and alternative expressions and format as a JavaScript ternary expression
    bind(cexpToJS(exp.test), (test: string) =>
        bind(cexpToJS(exp.then), (then: string) =>
            bind(cexpToJS(exp.alt), (alt: string) =>
                makeOk(`(${test} ? ${then} : ${alt})`)
            )
        )
    );

/*
Purpose: Convert a ProcExp AST to a JavaScript string
Signature: procToJS(exp)
Type: ProcExp => Result<string>
*/
const procToJS = (exp: ProcExp): Result<string> =>
    // Convert the procedure arguments and body to a JavaScript arrow function
    bind(mapResult(v => makeOk(v.var), exp.args), (args: string[]) =>
        bind(mapResult(cexpToJS, exp.body), (body: string[]) =>
            makeOk(`((${args.join(",")}) => ${body.length === 1 ? body[0] : `{\n${body.join(";\n")}\n}`})`)
        )
    );

