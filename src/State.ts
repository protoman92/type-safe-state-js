import {
  Collections,
  BuildableType,
  BuilderType,
  JSObject,
  Maybe,
  Nullable,
  Try,
} from 'javascriptutilities';

export let builder = (): Builder => new Builder();
export type UpdateFn<T> = (v: T) => T;
export type Values = JSObject<Nullable<any>>;
export type SubState = JSObject<Self>;

export interface Type {
  values: Values;
  substate: SubState;
}

export class Self implements BuildableType<Builder>, Type {
  public static empty = (): Self => builder().build();
  private _values: Values;
  private _substate: SubState;
  private _substateSeparator: string;

  public get values(): Values {
    return this._values;
  }

  public get substate(): SubState {
    return this._substate;
  }

  public get substateSeparator(): string {
    return this._substateSeparator;
  }

  public constructor() {
    this._values = {};
    this._substate = {};
    this._substateSeparator = '.';
  }

  public builder = (): Builder => builder();
  public cloneBuilder = (): Builder => this.builder().withBuildable(this);

  /**
   * Check whether a setter can mutate the current state's values.
   * @param {*} setter Any object.
   * @returns {boolean} A boolean value.
   */
  private canMutateValues = (setter: any): boolean => {
    return setter instanceof Builder;
  }

  /**
   * Set the current state values.
   * @param {Values} values A Values instance.
   * @param {*} setter Any object.
   * @returns {this} The current State instance.
   */
  public setValues = (values: Values, setter: any): this => {
    if (this.canMutateValues(setter)) {
      this._values = values;
      return this;
    } else {
      throw Error('Cannot set values');
    }
  }

  /**
   * Set the current substates.
   * @param {SubState} substate A SubState instance.
   * @param {*} setter Any object.
   * @returns {this} The current State instance.
   */
  public setSubstate = (substate: SubState, setter: any): this => {
    if (this.canMutateValues(setter)) {
      this._substate = substate;
      return this;
    } else {
      throw Error('Cannot set values');
    }
  }

  /**
   * Set the substate separator.   
   * @param {string} separator A string value.
   * @param {*} setter Any object.
   * @returns {this} The current State instance.
   */
  public setSubstateSeparator = (separator: string, setter: any): this => {
    if (this.canMutateValues(setter)) {
      this._substateSeparator = separator;
      return this;
    } else {
      throw Error('Cannot set values');
    }
  }

  /**
   * Get the substate at a particular node.
   * @param {string} identifier A string value.
   * @returns {Maybe<Self>} A Maybe Self instance.
   */
  public substateAtNode = (identifier: string): Maybe<Self> => {
    let separator = this.substateSeparator;
    let separated = identifier.split(separator);
    let length = separated.length;
    let first = Collections.first(separated).asMaybe();

    if (length === 1) {
      return first.flatMap(v => this.substateAtNode(v));
    } else {
      return Try.unwrap(() => separated.slice(1, length).join(separator))
        .zipWith(first, (v1, v2): [string, string] => [v1, v2])
        .map(v => this.substateAtNode(v[1]).map(v1 => v1.substateAtNode(v[0])))
        .flatMap(v => v.flatMap(v1 => v1)).asMaybe();
    }
  }

  /**
   * Get the state value at a particular node.
   * @param {string} identifier A string value.
   * @returns {Maybe<any>} Maybe any object.
   */
  public valueAtNode = (identifier: string): Maybe<any> => {
    let separator = this.substateSeparator;
    let separated = identifier.split(separator);
    let length = separated.length;
    let first = Collections.first(separated).asMaybe();

    if (length === 1) {
      return first.flatMap(v => Maybe.unwrap(this.values[v]));
    } else {
      return Try.unwrap(() => separated.slice(1, length).join(separator))
        .zipWith(first, (v1, v2): [string, string] => [v1, v2])
        .map(v => this.substateAtNode(v[1]).map(v1 => v1.valueAtNode(v[0])))
        .flatMap(v => v.flatMap(v1 => v1)).asMaybe();
    }
  }
}

export class Builder implements BuilderType<Self> {
  private state: Self;

  public constructor() {
    this.state = new Self();
  }

  /**
   * Replace the current state values.
   * @param {Values} values A Values instance.
   * @returns {this} The current Builder instance.
   */
  public withValues = (values: Values): this => {
    this.state.setValues(values, this);
    return this;
  }

  /**
   * Replace the current substate.
   * @param {SubState} substate A SubState instance.
   * @returns {this} The current Builder instance.
   */
  public withSubState = (substate: SubState): this => {
    this.state.setSubstate(substate, this);
    return this;
  }

  /**
   * Replace the current substate separator.
   * @param {string} separator A string value.
   * @returns {this} The current Builder instance.
   */
  public withSubStateSeparator = (separator: string): this => {
    this.state.setSubstateSeparator(separator, this);
    return this;
  }

  /**
   * Copy the properties from a state to the current state.
   * @param {Nullable<Self>} buildable A Self instance.
   * @returns {this} The current Builder instance.
   */
  public withBuildable = (buildable: Nullable<Self>): this => {
    if (buildable !== undefined && buildable !== null) {
      return this
        .withValues(buildable.values)
        .withSubState(buildable.substate)
        .withSubStateSeparator(buildable.substateSeparator);
    } else {
      return this;
    }
  }

  public build = (): Self => this.state;
}