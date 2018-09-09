import {
  BuildableType,
  BuilderType,
  JSObject,
  Never,
  Objects,
  Try,
  TryResult,
} from 'javascriptutilities';

import { builder } from './state+utility';

export type UpdateFn<T> = (v: Try<T>) => TryResult<T>;
export type Values<T> = JSObject<T>;
export type Substate<T> = JSObject<Type<T>>;
export type MapFn<T, R> = (value: T) => R;
export type StateType<T> = Type<T> | JSObject<T>;

export type ForEach<T> = (
  k: string,
  value: Try<T>,
  substatePath: Try<string>,
  level: number,
) => void;

export let valuesKey = 'values';
export let substateKey = 'substate';

/**
 * Represents a state object.
 * @extends {BuildableType<Builder<T>>} Buildable extension.
 * @template T Generics parameter.
 */
export interface Type<T> extends BuildableType<Builder<T>> {
  readonly values: Values<T>;
  readonly substate: Substate<T>;
  readonly substateSeparator: string;
}

/**
 * Represents a state object.
 * @implements {Type<T>} Type implementation.
 * @template T Generics parameter.
 */
export class Impl<T> implements Type<T> {
  public _values: Values<T>;
  public _substate: Substate<T>;
  public _substateSeparator: string;

  public get values(): Values<T> {
    return Object.assign({}, this._values);
  }

  public get valueKeys(): string[] {
    return Object.keys(this._values);
  }

  public get substate(): Substate<T> {
    return Object.assign({}, this._substate);
  }

  public get substateKeys(): string[] {
    return Object.keys(this._substate);
  }

  public get substateSeparator(): string {
    return this._substateSeparator;
  }

  public constructor() {
    this._values = {};
    this._substate = {};
    this._substateSeparator = '.';
  }

  public builder = (): Builder<T> => builder();
  public cloneBuilder = (): Builder<T> => this.builder().withBuildable(this);

  /**
   * Set the current state values.
   * @param {Values<T>} values A Values instance.
   * @returns {this} The current State instance.
   */
  public setValues(values: Never<Values<T>>): this {
    this._values = values || {};
    return this;
  }

  /**
   * Set the current substates.
   * @param {Never<Substate<T>>} substate A Substate instance.
   * @returns {this} The current State instance.
   */
  public setSubstates(substate: Never<Substate<T>>): this {
    this._substate = substate || {};
    return this;
  }

  /**
   * Set the substate separator.
   * @param {string} separator A string value.
   * @returns {this} The current State instance.
   */
  public setSubstateSeparator(separator: string): this {
    this._substateSeparator = separator;
    return this;
  }

  /**
   * Update the current state values.
   * @param {string} key A string value.
   * @param {T} value T object.
   * @returns {this} The current State instance.
   */
  public setValue(key: string, value: T): this {
    this._values[key] = value;
    return this;
  }

  /**
   * Remove some value from the current state.
   * @param {string} key A string value.
   * @returns {this} The current State instance.
   */
  public removeValue(key: string): this {
    let oldValues = this._values;
    let entries = Objects.entries(oldValues).filter(v => v[0] !== key);

    this._values = entries
      .map(v => ({ [v[0]]: v[1] }))
      .reduce((v1, v2) => Object.assign({}, v1, v2), {});

    return this;
  }

  /**
   * Update the current substates.
   * @param {string} key A string value.
   * @param {Type<T>} ss A Type instance.
   * @returns {this} The current State instance.
   */
  public setSubstate(key: string, ss: Type<T>): this {
    this._substate[key] = ss;
    return this;
  }

  /**
   * Remove some substate from the current substates.
   * @param {string} key A string value.
   * @returns {this} The current State instance.
   */
  public removeSubState(key: string): this {
    let oldSS = this._substate;
    let entries = Objects.entries(oldSS).filter(v => v[0] !== key);

    this._substate = entries.map(v => ({ [v[0]]: v[1] }))
      .reduce((v1, v2) => Object.assign({}, v1, v2), {});

    return this;
  }
}

export class Builder<T> implements BuilderType<Type<T>> {
  private state: Impl<T>;

  public constructor() {
    this.state = new Impl();
  }

  /**
   * Replace the current state values.
   * @param {Never<Values<T>>} values A Values instance.
   * @returns {this} The current Builder instance.
   */
  public withValues(values: Never<Values<T>>): this {
    this.state.setValues(values);
    return this;
  }

  /**
   * Replace the current substate.
   * @param {Never<Substate<T>>} substate A Substate instance.
   * @returns {this} The current Builder instance.
   */
  public withSubstate(substate: Never<Substate<T>>): this {
    this.state.setSubstates(substate);
    return this;
  }

  /**
   * Replace the current substate separator.
   * @param {string} separator A string value.
   * @returns {this} The current Builder instance.
   */
  public withSubstateSeparator(separator: string): this {
    this.state.setSubstateSeparator(separator);
    return this;
  }

  /**
   * Update the current state values with a mapping function.
   * @param {string} id A string value.
   * @param {UpdateFn<T>} fn Selector function.
   * @returns {this} The current Builder instance.
   */
  public updateValueWithFunction(id: string, fn: UpdateFn<T>): this {
    let value = Try.evaluate(() => fn(this.state.valueAtNode(id))).value;

    if (value !== undefined && value !== null) {
      this.state.setValue(id, value);
    } else {
      this.state.removeValue(id);
    }

    return this;
  }

  /**
   * Update the current state with some value, ignoring the old value.
   * @param {string} id A string value.
   * @param {Never<T>} value T object.
   * @returns {this} The current Builder instance.
   */
  public updateValue(id: string, value: Never<T>): this {
    let updateFn: UpdateFn<T> = () => {
      return Try.unwrap(value, `No value found at ${id}`);
    };

    return this.updateValueWithFunction(id, updateFn);
  }

  /**
   * Update the current substates with some substate, ignoring the old substate.
   * @param {string} id A string value.
   * @param {Never<Type<T>>} ss A Type instance.
   * @returns {this} The current Builder instance.
   */
  public updateSubstate(id: string, ss: Never<Type<T>>): this {
    if (ss !== undefined && ss !== null) {
      this.state.setSubstate(id, ss);
    } else {
      this.state.removeSubState(id);
    }

    return this;
  }

  /**
   * Copy the properties from a state to the current state.
   * @param {Never<Type<T>>} buildable A Type instance.
   * @returns {this} The current Builder instance.
   */
  public withBuildable(buildable: Never<Type<T>>): this {
    if (buildable !== undefined && buildable !== null) {
      return this
        .withValues(buildable.values)
        .withSubstate(buildable.substate)
        .withSubstateSeparator(buildable.substateSeparator);
    } else {
      return this;
    }
  }

  public build(): Type<T> {
    return this.state;
  }
}
