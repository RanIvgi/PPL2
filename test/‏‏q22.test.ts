import fs from "fs";
import { expect } from 'chai';
import { evalL32program } from '../src/L32/L32-eval';
import { Value } from "../src/L32/L32-value";
import { Result, bind, isFailure, makeFailure, makeOk } from "../src/shared/result";
import { parseL32, parseL32Exp } from "../src/L32/L32-ast";
import { makeEmptySExp, makeSymbolSExp } from "../src/L3/L3-value";

const evalP = (x: string): Result<Value> =>
    bind(parseL32(x), evalL32program);

describe('Q22 Tests', () => {

    it("Q22 basic tests 1", () => {
        expect(evalP(`(L32 ((dict (a 1) (b 2)) 'a))`)).to.deep.equal(makeOk(1));
    });

    it("Q22 tests 2", () => {
        expect(evalP(`(L32
                      (define x "a")
                      (define y "b")
                      ((dict (a x) (b y)) 'b))`)).to.deep.equal(makeOk("b"))
    });

    it("Q22 test 3", () => {
        expect(evalP(`(L32 
            (define x 1)
            (
              (if (< x 0)
                (dict (a 1) (b 2))
                (dict (a 2) (b 1)))
            'a))`)).to.deep.equal(makeOk(2));
    });

    // Additional tests for nested dictionaries and other edge cases
    it("Q22 Extra test 4: Nested dictionaries", () => {
        expect(evalP(`(L32 
            (define d (dict (a (dict (x 10) (y 20))) (b 2)))
            ((d 'a) 'x))`)).to.deep.equal(makeOk(10));
    });

    it("Q22 Extra test 5: Dictionary with expressions as values", () => {
        expect(evalP(`(L32 
            (define d (dict (a (+ 1 2)) (b (* 3 4))))
            (d 'a))`)).to.deep.equal(makeOk(3));
    });

    it("Q22 Extra test 6: Invalid dictionary entry (non-string key)", () => {
        expect(evalP(`(L32 
            (dict (1 2) (b 3)))`)).to.satisfy(isFailure);
    });

    it("Q22 Extra test 7: Dictionary application with invalid key type", () => {
        expect(evalP(`(L32 
            (define d (dict (a 1) (b 2)))
            (d 123))`)).to.satisfy(isFailure);
    });

    it("Q22 Extra test 8: Empty dictionary", () => {
        expect(evalP(`(L32 
            (define d (dict))
            (d 'a))`)).to.satisfy(isFailure);
    });

    it("Q22 Extra test 9: Dictionary with duplicate keys", () => {
        expect(evalP(`(L32 
            (dict (a 1) (a 2)))`)).to.satisfy(isFailure);
    });

    it("Q22 Extra test 10: Dictionary with conditional keys", () => {
        expect(evalP(`(L32 
            (define x #t)
            (
            (if x
                (dict (a 42))
                (dict (b 42))
            )
            'a))`)).to.deep.equal(makeOk(42));
    });

    it("Q22 Extra test 11: Literal dictionary values", () => {
        expect(evalP(`(L32 
            (define d (dict (a "hello") (b #t)))
            (d 'a))`)).to.deep.equal(makeOk("hello"));
        expect(evalP(`(L32 
            (define d (dict (a "hello") (b #t)))
            (d 'b))`)).to.deep.equal(makeOk(true));
    });

    // // Test 15 NOY : Lambda returning a dict
    // it("Q22 test 15 - dict returned from lambda", () => {
    //     expect(evalP(`(L32
    //         ((lambda () (dict (m 7))) 'm))`)).to.deep.equal(makeOk(7));
    // });

    // Test 16: Dict returned from if expression
    it("Q22 test 16 NOY - dict returned from if expression", () => {
        expect(evalP(`(L32 
            (define flag #t)
            (
            (if flag
                (dict (z 9))
                (dict (z 0))
            )
            'z))`)).to.deep.equal(makeOk(9));
    });

});