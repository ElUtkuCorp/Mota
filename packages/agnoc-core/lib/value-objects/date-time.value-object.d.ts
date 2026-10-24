import { DomainPrimitive, ValueObject } from '../base-classes/value-object.base';
export declare class DateTime extends ValueObject<Date> {
    constructor(value: Date | string | number);
    get value(): Date;
    toString(): string;
    static now(): DateTime;
    protected validate({ value }: DomainPrimitive<Date>): void;
}
