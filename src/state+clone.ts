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

    /**
     * Clone the current State with the specified value and substate paths.
     * @param {string[]} valuePaths An array of value paths.
     * @param {string[]} substatePaths An array of substate paths.
     * @returns {Type<T>} A Type instance.
     */
    cloneWithPaths(valuePaths: string[], substatePaths: string[]): Type<T>;
  }

  export interface Impl<T> extends Type<T> { }
}

Impl.prototype.cloningWithSubstatesAtNodes = function <T>(...paths: string[]): Type<T> {
  return this.cloneWithPaths([], paths);
};

Impl.prototype.cloningWithValuesAtNodes = function <T>(...paths: string[]): Type<T> {
  return this.cloneWithPaths(paths, []);
};

Impl.prototype.cloneWithPaths = function <T>(valuePaths: string[], substatePaths: string[]): Type<T> {
  let state = empty<T>();

  for (let id of valuePaths) {
    this.valueAtNode(id).doOnNext(v => {
      state = state.updatingValue(id, v);
    });
  }

  for (let id of substatePaths) {
    this.substateAtNode(id).doOnNext(v => {
      state = state.updatingSubstate(id, v);
    });
  }

  return state;
};
