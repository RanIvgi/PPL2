import { Exp, Program, unparseL3 } from './L3/L3-ast';
import { Result, makeFailure} from './shared/result';

/*
Purpose: Transform L2 AST to JavaScript program string
Signature: l2ToJS(l2AST)
Type: [EXP | Program] => Result<string>
*/

export const l2ToJS = (exp: Exp | Program): Result<string>  =>{
    const unParse = unparseL3(exp);
    console.log("unParse", unParse);
    return makeFailure("Not implemented yet");
} 
   
   