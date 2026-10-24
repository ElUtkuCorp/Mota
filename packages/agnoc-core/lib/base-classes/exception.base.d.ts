import { Exceptions } from '../constants/exception.constant';
import { ObjectLiteral } from '../types/object-literal.type';
export interface SerializedException {
    name: string;
    message: string;
    stack?: string;
    metadata?: ObjectLiteral;
}
export declare abstract class Exception extends Error {
    readonly message: string;
    readonly metadata?: ObjectLiteral;
    constructor(message: string, metadata?: ObjectLiteral);
    abstract name: Exceptions;
    toJSON(): SerializedException;
}
