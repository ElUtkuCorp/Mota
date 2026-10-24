type AllValues<T extends Record<PropertyKey, PropertyKey>> = {
    [P in keyof T]: {
        key: P;
        value: T[P];
    };
}[keyof T];
type FlipObject<T extends Record<PropertyKey, PropertyKey>> = {
    [P in AllValues<T>['value']]: Extract<AllValues<T>, {
        value: P;
    }>['key'];
};
export declare function flipObject<T extends Record<PropertyKey, PropertyKey>>(obj: T): FlipObject<T>;
export {};
