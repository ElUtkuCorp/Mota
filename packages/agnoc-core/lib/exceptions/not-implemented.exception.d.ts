import { Exception } from '../base-classes/exception.base';
import { Exceptions } from '../constants/exception.constant';
export declare class NotImplementedException extends Exception {
    readonly name = Exceptions.notImplemented;
}
