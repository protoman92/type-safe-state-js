import {
  Collections,
  BuildableType,
  BuilderType,
  JSObject,
  Nullable,
  Objects,
  Try,
} from 'javascriptutilities';

export function builder<T>(): Builder<T> {
  return new Builder();
}

export function empty<T>(): Self<T> {
  return builder<T>().build();
}

export type UpdateFn<T> = (v: T) => T;
export type Values<T> = JSObject<Nullable<T>>;
export type Substate<T> = JSObject<Self<T>>;

export interface Type<T> {
  values: Values<T>;
  substate: Substate<T>;
}

export class Self<T> implements BuildableType<Builder<T>>, Type<T> {
  private _values: Values<T>;
  private _substate: Substate<T>;
  private _substateSeparator: string;

  public get values(): Values<T> {
    return Object.assign({}, this._values);
  }

  public get substate(): Substate<T> {
    return Object.assign({}, this._substate);
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
   * Check whether a setter can mutate the current state's values.
   * @param {*} setter Any object.
   * @returns {boolean} A boolean value.
   */
  private canMutateValues = (setter: any): boolean => {
    return setter instanceof Builder;
  }

  /**
   * Set the current state values.
   * @param {Values<T>} values A Values instance.
   * @param {*} setter Any object.
   * @returns {this} The current State instance.
   */
  public setValues = (values: Values<T>, setter: any): this => {
    if (this.canMutateValues(setter)) {
      this._values = values;
      return this;
    } else {
      throw Error('Cannot set values');
    }
  }

  /**
   * Set the current substates.
   * @param {Substate<T>} substate A Substate instance.
   * @param {*} setter Any object.
   * @returns {this} The current State instance.
   */
  public setSubstates = (substate: Substate<T>, setter: any): this => {
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
   * Update the current state values.
   * @param {string} key A string value.
   * @param {T} value T object.
   * @param {*} setter Any object.
   * @returns {this} The current State instance.   
   */
  public setValue = (key: string, value: T, setter: any): this => {
    if (this.canMutateValues(setter)) {
      this._values[key] = value;
      return this;
    } else {
      throw Error('Cannot update values');
    }
  }

  /**
   * Remove some value from the current state.
   * @param {string} key A string value.
   * @param {*} setter Any object.
   * @returns {this} The current State instance.   
   */
  public removeValue = (key: string, setter: any): this => {
    if (this.canMutateValues(setter)) {
      let oldValues = this._values;
      let entries = Objects.entries(oldValues).filter(v => v[0] !== key);

      this._values = entries.map(v => ({[v[0]]: v[1]}))
        .reduce((v1, v2) => Object.assign({}, v1, v2), {});

      return this;
    } else {
      throw Error('Cannot remove values');
    }
  }

  /**
   * Update the current substates. 
   * @param {string} key A string value.
   * @param {Self<T>} ss A Self instance.
   * @param {*} setter Any object.
   * @returns {this} The current State instance.
   */
  public setSubstate = (key: string, ss: Self<T>, setter: any): this => {
    if (this.canMutateValues(setter)) {
      this._substate[key] = ss;
      return this;
    } else {
      throw Error('Cannot update substate');
    }
  }

  /**
   * Remove some substate from the current substates.
   * @param {string} key A string value.
   * @param {*} setter Any object.
   * @returns {this} The current State instance.
   */
  public removeSubState = (key: string, setter: any): this => {
    if (this.canMutateValues(setter)) {
      let oldSS = this._substate;
      let entries = Objects.entries(oldSS).filter(v => v[0] !== key);

      this._substate = entries.map(v => ({[v[0]]: v[1]}))
        .reduce((v1, v2) => Object.assign({}, v1, v2), {});

      return this;
    } else {
      throw Error('Cannot remove substate');
    }
  }

  /**
   * Get the substate at a particular node.
   * @param {string} id A string value.
   * @param {string} original The original id.
   * @returns {Try<Self<T>>} A Try Self instance.
   */
  private _substateAtNode = (id: string, original: string): Try<Self<T>> => {
    let separator = this.substateSeparator;
    let separated = id.split(separator);
    let length = separated.length;
    let first = Collections.first(separated);

    if (length === 1) {
      return first.map(v => Try.unwrap(this.substate[v]))
        .flatMap(v => v.mapError(() => `No substate at ${original}`));
    } else {
      return Try.unwrap(() => separated.slice(1, length).join(separator))
        .zipWith(first, (v1, v2): [string, string] => [v1, v2])
        .map(v => this._substateAtNode(v[1], original)
          .map(v1 => v1._substateAtNode(v[0], original)))
        .flatMap(v => v.flatMap(v1 => v1));
    }
  }

  /**
   * Get the substate at a particular node.
   * @param {string} id A string value.   
   * @returns {Try<Self<T>>} A Try Self instance.
   */
  public substateAtNode = (id: string): Try<Self<T>> => {
    return this._substateAtNode(id, id);
  }

  /**
   * Get the state value at a particular node.
   * @param {string} id A string value.
   * @param {string} original The original id.
   * @returns {Try<T>} Try T object.
   */
  private _valueAtNode = (id: string, original: string): Try<T> => {
    let separator = this.substateSeparator;
    let separated = id.split(separator);
    let length = separated.length;
    let first = Collections.first(separated);

    if (length === 1) {
      return first.map(v => Try.unwrap(this.values[v]))
        .flatMap(v => v.mapError(() => `No value found at ${original}`));
    } else {
      return Try.unwrap(() => separated.slice(1, length).join(separator))
        .zipWith(first, (v1, v2): [string, string] => [v1, v2])
        .map(v => this._substateAtNode(v[1], original)
          .map(v1 => v1._valueAtNode(v[0], original)))
        .flatMap(v => v.flatMap(v1 => v1));
    }
  }

  /**
   * Get the state value at a particular node.
   * @param {string} id A string value.
   * @returns {Try<T>} Try T object.
   */
  public valueAtNode = (id: string): Try<T> => {
    return this._valueAtNode(id, id);
  }

  /**
   * Map the value at some node to another value using a mapper function, and
   * create whatever substate that is not present.
   * @param {string} id A string value.
   * @param {UpdateFn<Nullable<T>>} fn Selector function.
   * @returns {Self<T>} A State instance.
   */
  public mappingValue = (id: string, fn: UpdateFn<Nullable<T>>): Self<T> => {
    let separator = this.substateSeparator;
    let separated = id.split(separator);
    let length = separated.length;
    let first = Collections.first(separated);

    if (length === 1) {
      return first.map(v => this.cloneBuilder()
        .updateValueWithFunction(v, fn).build())
        .getOrElse(this);
    } else {
      let subId = Try.unwrap(() => separated.slice(1, length).join(separator));
      let substate = first.flatMap(v => this.substateAtNode(v)).getOrElse(empty());

      return first
        .zipWith(subId.map(v => substate.mappingValue(v, fn)), (v1, v2) => {
          return this.cloneBuilder().updateSubstate(v1, v2).build();
        })
        .getOrElse(this);
    }
  }

  /**
   * Update the value at some node, ignoring the old value.
   * @param {string} id A string value.
   * @param {Nullable<T>} value T object.
   * @returns {Self} A State instance.
   */
  public updatingValue = (id: string, value: Nullable<T>): Self<T> => {
    let updateFn: UpdateFn<Nullable<T>> = () => value;
    return this.mappingValue(id, updateFn);
  }

  /**
   * Update all values from some key-value object. 
   * @param {JSObject<T>} values A JSObject instance.
   * @returns {Self<T>} A State instance.
   */
  public updatingKV = (values: JSObject<T>): Self<T> => {
    let entries = Objects.entries(values);

    let updateKV = (state: Self<T>, values: [string, Nullable<T>][]): Self<T> => {
      let length = values.length;

      if (length === 0) {
        return state;
      } else {
        let first = Collections.first(values);
        let firstUpdated = first.map(v => state.updatingValue(v[0], v[1]));

        if (length === 1) {
          return firstUpdated.getOrElse(state);
        } else {
          let subValues = Try.unwrap(() => values.slice(1, length));

          return firstUpdated
            .zipWith(subValues, (v1, v2) => updateKV(v1, v2))
            .getOrElse(state);
        }
      }
    };

    return updateKV(this, entries);
  }

  /**
   * Remove the value at some node.
   * @param {string} id A string value.
   * @returns {Self<T>} A State instance.
   */
  public removingValue = (id: string): Self<T> => {
    return this.updatingValue(id, undefined);
  }

  /**
   * Update the substate at some node with another substate, ignoring the old
   * substate.
   * @param {string} id A string value.
   * @param {Nullable<Self<T>>} ss A Self instance.
   * @returns {Self<T>} A State instance.
   */
  public updatingSubstate = (id: string, ss: Nullable<Self<T>>): Self<T> => {
    let separator = this.substateSeparator;
    let separated = id.split(separator);
    let length = separated.length;
    let first = Collections.first(separated);

    if (length === 1) {
      return first.map(v => this.cloneBuilder()
        .updateSubstate(v, ss).build()).getOrElse(this);
    } else {
      let subId = Try.unwrap(() => separated.slice(1, length).join(separator));

      return first
        .flatMap(v => Try.unwrap(this._substate[v]))
        .zipWith(subId, (v1, v2) => v1.updatingSubstate(v2, ss))
        .zipWith(first, (v1, v2) => this.updatingSubstate(v2, v1))
        .getOrElse(this);
    }
  }

  /**
   * Remove the substate at some node.
   * @param {string} id A string value.
   * @returns {Self<T>} A Self instance.
   */
  public removingSubstate = (id: string): Self<T> => {
    return this.updatingSubstate(id, undefined);
  }
}

export class Builder<T> implements BuilderType<Self<T>> {
  private state: Self<T>;

  public constructor() {
    this.state = new Self();
  }

  /**
   * Replace the current state values.
   * @param {Values<T>} values A Values instance.
   * @returns {this} The current Builder instance.
   */
  public withValues = (values: Values<T>): this => {
    this.state.setValues(values, this);
    return this;
  }

  /**
   * Replace the current substate.
   * @param {Substate<T>} substate A Substate instance.
   * @returns {this} The current Builder instance.
   */
  public withSubstate = (substate: Substate<T>): this => {
    this.state.setSubstates(substate, this);
    return this;
  }

  /**
   * Replace the current substate separator.
   * @param {string} separator A string value.
   * @returns {this} The current Builder instance.
   */
  public withSubstateSeparator = (separator: string): this => {
    this.state.setSubstateSeparator(separator, this);
    return this;
  }

  /**
   * Update the current state values with a mapping function.
   * @param {string} id A string value.
   * @param {UpdateFn<Nullable<T>>} fn Selector function.
   * @returns {this} The current Builder instance.   
   */
  public updateValueWithFunction = (id: string, fn: UpdateFn<Nullable<T>>): this => {
    let value = fn(this.state.valueAtNode(id).value);
    
    if (value !== undefined && value !== null) {
      this.state.setValue(id, value, this);
    } else {
      this.state.removeValue(id, this);
    }

    return this;
  }

  /**
   * Update the current state with some value, ignoring the old value.
   * @param {string} id A string value.
   * @param {Nullable<T>} value T object.
   * @returns {this} The current Builder instance.
   */
  public updateValue = (id: string, value: Nullable<T>): this => {
    let updateFn: UpdateFn<Nullable<T>> = () => value;
    return this.updateValueWithFunction(id, updateFn);
  }

  /**
   * Update the current substates with some substate, ignoring the old substate.
   * @param {string} id A string value.
   * @param {Nullable<Self<T>>} ss A Self instance.
   * @returns {this} The current Builder instance.
   */
  public updateSubstate = (id: string, ss: Nullable<Self<T>>): this => {
    if (ss !== undefined && ss !== null) {
      this.state.setSubstate(id, ss, this);
    } else {
      this.state.removeSubState(id, this);
    }

    return this;
  }

  /**
   * Copy the properties from a state to the current state.
   * @param {Nullable<Self<T>>} buildable A Self instance.
   * @returns {this} The current Builder instance.
   */
  public withBuildable = (buildable: Nullable<Self<T>>): this => {
    if (buildable !== undefined && buildable !== null) {
      return this
        .withValues(buildable.values)
        .withSubstate(buildable.substate)
        .withSubstateSeparator(buildable.substateSeparator);
    } else {
      return this;
    }
  }

  public build = (): Self<T> => this.state;
}