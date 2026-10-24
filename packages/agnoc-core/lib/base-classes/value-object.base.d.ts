export type Primitives = string | number | boolean | bigint;
export interface DomainPrimitive<T extends Primitives | Date> {
    value: T;
}
type ValueObjectProps<T> = T extends Primitives | Date ? DomainPrimitive<T> : T;
type PartialValueObjectProps<T> = T extends Primitives | Date ? DomainPrimitive<T> : Partial<T>;
export declare abstract class ValueObject<T> {
    protected readonly props: ValueObjectProps<T>;
    constructor(props: ValueObjectProps<T>);
    equals(vo?: unknown): boolean;
    toString(): string;
    toJSON(): unknown;
    clone<C extends ValueObject<T>>(this: C, props: PartialValueObjectProps<T>): C;
    protected abstract validate(props: ValueObjectProps<T>): void;
    private checkIfEmpty;
    private isDomainPrimitive;
    static isValueObject(obj: unknown): obj is ValueObject<unknown>;
}
export {};
