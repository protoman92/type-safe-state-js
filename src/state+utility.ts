import { Collections, Never, Objects, Types } from 'javascriptutilities';
import { Builder, Impl, StateType, Type, valuesKey, substateKey } from './state+main';

/**
 * Separate a full path into substate and value components.
 * @param {string} path A string value.
 * @param {string} sp A string value.
 * @returns {[string, string]} A string/string tuple.
 */
export function separateSubstateAndValuePaths(path: string, sp: string): [string, string] {
  let separated = path.split(sp);
  let last = Collections.last(separated);
  let rest = separated.slice(0, separated.length - 1).join(sp);
  return last.map((v): [string, string] => [rest, v]).getOrElse(['', '']);
}

/**
 * Get a new Builder.
 * @template T Generics parameter.
 * @returns {Builder<T>} A Builder instance.
 */
export function builder<T>(): Builder<T> {
  return new Builder();
}

/**
 * Get an empty state.
 * @template T Generics parameter.
 * @returns {Type<T>} A Type instance.
 */
export function empty<T>(): Type<T> {
  return builder<T>().build();
}

/**
 * Build a state from another state.
 * @template T Generics parameter.
 * @param {Never<Type<T>>} state A Type instance.
 * @returns {Type<T>} A Type instance.
 */
export function fromState<T>(state: Never<Type<T>>): Type<T> {
  if (state === undefined || state === null) {
    return empty<T>();
  } if (state instanceof Impl) {
    return state;
  } else {
    let values = state.values || {};
    let substate = state.substate || {};

    let substates = Objects.entries(substate)
      .map(v => ({ [v[0]]: fromState(v[1]) }))
      .reduce((v1, v2) => Object.assign({}, v1, v2), {});

    return builder<T>().withValues(values).withSubstate(substates).build();
  }
}

/**
 * Build a state from a possible state.
 * @param {Never<StateType<any>>} state A StateType instance.
 * @returns {Type<T>} A Type instance.
 */
export function fromKeyValue(state: Never<StateType<any>>): Type<any> {
  if (state === undefined || state === null) {
    return empty<any>();
  } if (Types.isInstance<Type<any>>(state, 'values', 'substate')) {
    return fromState(state);
  } else {
    let _values = state['_' + valuesKey] || {};
    let _substates = state['_' + substateKey] || {};

    let _substate = Objects.entries<any>(_substates)
      .map(v => ({ [v[0]]: fromKeyValue(v[1]) }))
      .reduce((v1, v2) => Object.assign({}, v1, v2), {});

    return builder<any>().withValues(_values).withSubstate(_substate).build();
  }
}
