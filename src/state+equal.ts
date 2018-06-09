import { Nullable } from 'javascriptutilities';
import { Impl, StateType, Type } from './state+main';
import { fromKeyValue } from './state+utility';

declare module './state+main' {
  export interface Type<T> {
    /**
     * Check if the current state equals another state.
     * @param {StateType<JSObject<any>>} object A JSObject instance.
     * @returns {boolean} A boolean value.
     */
    equals(state: Nullable<StateType<T>>): boolean;

    /**
     * Check if two State are equal in values for the specified keys.
     * @param {Nullable<StateType<T>>} state A StateType instance.
     * @param {string[]} keys An Array of keys.
     * @param {(v1: T, v2: T) => boolean} [equalFn] Optional compare function.
     * @returns {boolean} A boolean value.
     */
    equalsForValues(
      state: Nullable<StateType<T>>,
      keys: string[],
      equalFn?: (v1: T, v2: T) => boolean,
    ): boolean;

    /**
     * Check if two State are equal in substates for the specified keys.
     * @param {Nullable<StateType<T>>} state A StateType instance.
     * @param {string[]} keys An Array of keys.
     * @param {(v1: Type<T>, v2: Type<T>) => boolean} [equalFn] Optional compare
     * function.
     * @returns {boolean} A boolean value.
     */
    equalsForSubstates(
      state: Nullable<StateType<T>>,
      keys: string[],
      equalFn?: (v1: Type<T>, v2: Type<T>) => boolean,
    ): boolean;
  }

  export interface Impl<T> extends Type<T> { }
}

Impl.prototype.equals = function (object: Nullable<StateType<any>>): boolean {
  if (object !== undefined && object !== null) {
    let state = fromKeyValue(object);
    let thisValues = this._values;
    let otherValues = state.values;
    let thisSubstates = this._substate;
    let otherSubstates = state.substate;
    let thisKeys = Object.keys(thisValues);
    let thisSubstateKeys = Object.keys(thisSubstates);

    for (let key of thisKeys) {
      let v1 = thisValues[key];
      let v2 = otherValues[key];

      try {
        if (
          v1 !== undefined && v1 !== null &&
          v2 !== undefined && v2 !== null &&
          v1 === v2
        ) {
          continue;
        } else if (v1 === undefined && v2 === undefined) {
          continue;
        } else if (v1 === null && v2 === null) {
          continue;
        } else {
          return false;
        }
      } catch {
        return false;
      }
    }

    for (let key of thisSubstateKeys) {
      let v1 = thisSubstates[key];
      let v2 = otherSubstates[key];

      if (
        v1 !== undefined && v1 !== null &&
        v2 !== undefined && v2 !== null &&
        v1.equals(v2)
      ) {
        continue;
      } else if (v1 === undefined && v2 === undefined) {
        continue;
      } else if (v1 === null && v2 === null) {
        continue;
      } else {
        return false;
      }
    }

    return true;
  } else {
    return false;
  }
};

Impl.prototype.equalsForValues = function <T>(
  state: Nullable<StateType<T>>,
  keys: string[],
  equalFn?: (v1: T, v2: T) => boolean,
): boolean {
  let compareFn = equalFn !== undefined && equalFn !== null ? equalFn
    : (v1: T, v2: T): boolean => v1 === v2;

  let parsedState = fromKeyValue(state);

  for (let key of keys) {
    let lhsValue = this.valueAtNode(key);
    let rhsValue = parsedState.valueAtNode(key);

    if (lhsValue.isFailure() && rhsValue.isFailure()) {
      continue;
    } else if (!lhsValue
      .zipWith(rhsValue, (v1, v2) => compareFn(v1, v2))
      .getOrElse(false)
    ) {
      return false;
    }
  }

  return true;
};

Impl.prototype.equalsForSubstates = function <T>(
  state: Nullable<StateType<T>>,
  keys: string[],
  equalFn?: (v1: Type<T>, v2: Type<T>) => boolean,
): boolean {
  let compareFn = equalFn !== undefined && equalFn !== null ? equalFn
    : (v1: Type<T>, v2: Type<T>): boolean => v1.equals(v2);

  let parsedState = fromKeyValue(state);

  for (let key of keys) {
    let lhsValue = this.substateAtNode(key);
    let rhsValue = parsedState.substateAtNode(key);

    if (lhsValue.isFailure() && rhsValue.isFailure()) {
      continue;
    } else if (!lhsValue
      .zipWith(rhsValue, (v1, v2) => compareFn(v1, v2))
      .getOrElse(false)
    ) {
      return false;
    }
  }

  return true;
};
