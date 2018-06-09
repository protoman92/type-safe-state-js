import { Impl, Type } from './state+main';
import { empty } from './state+utility';

declare module './state+main' {
  export interface Type<T> {
    /**
     * Clone the current State, but only include the substates found at the
     * specified nodes.
     * @param {...string[]} paths A varargs of id.
     * @returns {Type<T>} A Type instance.
     */
    cloningWithSubstatesAtNodes(...paths: string[]): Type<T>;

    /**
     * Clone the current State, but only include the values found at the specified
     * nodes.
     * @param {...string[]} paths A varargs of id.
     * @returns {Type<T>} A Type instance.
     */
    cloningWithValuesAtNodes(...paths: string[]): Type<T>;
  }

  export interface Impl<T> extends Type<T> { }
}

Impl.prototype.cloningWithSubstatesAtNodes = function <T>(...paths: string[]): Type<T> {
  let state = empty<T>();

  for (let id of paths) {
    this.substateAtNode(id).doOnNext(v => {
      state = state.updatingSubstate(id, v);
    });
  }

  return state;
}

Impl.prototype.cloningWithValuesAtNodes = function <T>(...paths: string[]): Type<T> {
  let state = empty<T>();

  for (let id of paths) {
    this.valueAtNode(id).doOnNext(v => {
      state = state.updatingValue(id, v);
    });
  }

  return state;
}
