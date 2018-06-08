import {
  Collections,
  BuildableType,
  BuilderType,
  JSObject,
  Nullable,
  Objects,
  Try,
  TryResult,
  Types,
} from 'javascriptutilities';

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
 * @param {Nullable<Type<T>>} state A Type instance.
 * @returns {Type<T>} A Type instance.
 */
export function fromState<T>(state: Nullable<Type<T>>): Type<T> {
  if (state === undefined || state === null) {
    return empty<T>();
  } if (state instanceof Self) {
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
 * @param {Nullable<StateType<any>>} state A StateType instance.
 * @returns {Type<T>} A Type instance.
 */
export function fromKeyValue(state: Nullable<StateType<any>>): Type<any> {
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

/**
 * Represents a state object.
 * @extends {BuildableType<Builder<T>>} Buildable extension.
 * @template T Generics parameter.
 */
export interface Type<T> extends BuildableType<Builder<T>> {
  readonly values: Values<T>;
  readonly substate: Substate<T>;
  readonly substateSeparator: string;
  hasValues(): boolean;
  isEmpty(): boolean;
  firstValue(): Try<T>;
  firstSubstate(): Try<Type<T>>;
  substateAtNode(id: string): Try<Type<T>>;
  valueAtNode(id: string): Try<T>;
  stringAtNode(id: string): Try<string>;
  booleanAtNode(id: string): Try<boolean>;
  numberAtNode(id: string): Try<number>;
  instanceAtNode<R>(ctor: new () => R, id: string): Try<R>;
  mappingValue(id: string, fn: UpdateFn<T>): Type<T>;
  mappingEach<R>(selector: MapFn<T, R>): Type<R>;
  updatingValue(id: string, value: Nullable<T>): Type<T>;
  copyingValue(src: string, dest: string): Type<T>;
  movingValue(src: string, dest: string): Type<T>;
  updatingKeyValues(values: JSObject<T>): Type<T>;
  removingValue(id: string): Type<T>;
  updatingSubstate(id: string, ss: Nullable<Type<T>>): Type<T>;
  removingSubstate(id: string): Type<T>;
  copyingSubstate(src: string, dest: string): Type<T>;
  movingSubstate(src: string, dest: string): Type<T>;
  cloningWithSubstatesAtNodes(...ids: string[]): Type<T>;
  cloningWithValuesAtNodes(...ids: string[]): Type<T>;
  emptying(): Type<T>;
  flatten(): JSObject<any>;
  levelCount(): number;
  totalValueCount(): number;
  forEach(selector: ForEach<T>): void;
  valuesForMatchingPaths(keyMatcher: (key: string) => boolean): JSObject<T>;
  createSingleBranches(): Type<T>[];
  valuesWithFullPaths(): JSObject<T>;
  equals(state: Nullable<StateType<T>>): boolean;

  equalsForValues(
    state: Nullable<StateType<T>>,
    keys: string[],
    equalFn?: (v1: T, v2: T) => boolean,
  ): boolean;

  equalsForSubstates(
    state: Nullable<StateType<T>>,
    keys: string[],
    equalFn?: (v1: Type<T>, v2: Type<T>) => boolean,
  ): boolean;
}

/**
 * Represents a state object.
 * @implements {Type<T>} Type implementation.
 * @template T Generics parameter.
 */
class Self<T> implements Type<T> {
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
  public setValues(values: Nullable<Values<T>>): this {
    this._values = values || {};
    return this;
  }

  /**
   * Set the current substates.
   * @param {Nullable<Substate<T>>} substate A Substate instance.
   * @returns {this} The current State instance.
   */
  public setSubstates(substate: Nullable<Substate<T>>): this {
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

  /**
   * Check if the current state has values.
   * @returns {boolean} A boolean value.
   */
  public hasValues(): boolean {
    return Object.keys(this._values).length > 0;
  }

  /**
   * Check if the current state has substates.
   * @returns {boolean} A boolean value.
   */
  public hasSubstate(): boolean {
    return Object.keys(this._substate).length > 0;
  }

  /**
   * Check if the current state is empty.
   * @returns {boolean} A boolean value.
   */
  public isEmpty(): boolean {
    return !(this.hasValues() && this.hasSubstate());
  }

  /**
   * Get the first value in the values object.
   * @returns {Try<T>} A Try T instance.
   */
  public firstValue(): Try<T> {
    return Collections
      .first(Objects.entries(this._values))
      .map(v => v[0])
      .flatMap(v => this.valueAtNode(v));
  }

  /**
   * Get the first substate in the substate object.
   * @returns {Try<Type<T>>} A Try Type instance.
   */
  public firstSubstate(): Try<Type<T>> {
    return Collections
      .first(Objects.entries(this._substate))
      .map(v => v[0])
      .flatMap(v => this.substateAtNode(v));
  }

  /**
   * Get the substate at a particular node.
   * @param {string} id A string value.
   * @param {string} original The original id.
   * @returns {Try<Type<T>>} A Try Type instance.
   */
  private _substateAtNode(id: string, original: string): Try<Type<T>> {
    let separator = this.substateSeparator;
    let separated = id.split(separator);
    let length = separated.length;
    let first = Collections.first(separated);

    if (length === 1) {
      /// If the id is an empty string, return the current state.
      return first
        .map(v => Try.unwrap(this.substate[v]))
        .map(v => Try.unwrap(v))
        .flatMap(v => v.mapError(() => `No substate at ${original}`));
    } else {
      return Try.evaluate(() => separated.slice(1, length).join(separator))
        .zipWith(first, (v1, v2): [string, string] => [v1, v2])
        .map(v => this._substateAtNode(v[1], original)
          .map(v1 => fromState(v1) as Self<T>)
          .map(v1 => v1._substateAtNode(v[0], original)))
        .flatMap(v => v.flatMap(v1 => v1));
    }
  }

  /**
   * Get the substate at a particular node.
   * @param {string} id A string value.
   * @returns {Try<Type<T>>} A Try Type instance.
   */
  public substateAtNode(id: string) {
    return this._substateAtNode(id, id);
  }

  /**
   * Get the state value at a particular node.
   * @param {string} id A string value.
   * @param {string} original The original id.
   * @returns {Try<T>} Try T object.
   */
  private _valueAtNode(id: string, original: string): Try<T> {
    let separator = this.substateSeparator;
    let separated = id.split(separator);
    let length = separated.length;
    let first = Collections.first(separated);

    if (length === 1) {
      return first.map(v => Try.unwrap(this.values[v]))
        .flatMap(v => v.mapError(() => `No value found at ${original}`));
    } else {
      return Try.evaluate(() => separated.slice(1, length).join(separator))
        .zipWith(first, (v1, v2): [string, string] => [v1, v2])
        .map(v => this._substateAtNode(v[1], original)
          .map(v1 => fromState(v1) as Self<T>)
          .map(v1 => v1._valueAtNode(v[0], original)))
        .flatMap(v => v.flatMap(v1 => v1));
    }
  }

  /**
   * Get the state value at a particular node.
   * @param {string} id A string value.
   * @returns {Try<T>} Try T object.
   */
  public valueAtNode(id: string) {
    return this._valueAtNode(id, id);
  }

  /**
   * Convenience method to get a string from a node.
   * @param {string} id A string value.
   * @returns {Try<string>} A Try string instance.
   */
  public stringAtNode(id: string): Try<string> {
    return this.valueAtNode(id).map(v => {
      if (typeof (v) === 'string') {
        return v;
      } else {
        throw Error(`No string at ${id}`);
      }
    });
  }

  /**
   * Convenience method to get a number from a node.
   * @param {string} id A string value.
   * @returns {Try<number>} A Try number instance.
   */
  public numberAtNode(id: string): Try<number> {
    return this.valueAtNode(id).map(v => {
      if (typeof (v) === 'number') {
        return v;
      } else {
        throw Error(`No number at ${id}`);
      }
    });
  }

  /**
   * Convenience method to get a boolean from a node.
   * @param {string} id A string value.
   * @returns {Try<boolean>} A Try boolean instance.
   */
  public booleanAtNode(id: string): Try<boolean> {
    return this.valueAtNode(id).map(v => {
      if (typeof (v) === 'boolean') {
        return v;
      } else {
        throw Error(`No boolean at ${id}`);
      }
    });
  }

  /**
   * Convenience method to get R from a node.
   * @template R Generics parameter.
   * @param {new () => R} ctor R constructor.
   * @param {string} id A string value.
   * @returns {Try<R>} A Try R instance.
   */
  public instanceAtNode<R>(ctor: new () => R, id: string): Try<R> {
    return this.valueAtNode(id).map(v => {
      if (v instanceof ctor) {
        return v;
      } else {
        throw Error(`No ${ctor.name} at ${id}`);
      }
    });
  }

  /**
   * Map the value at some node to another value using a mapper function, and
   * create whatever substate that is not present.
   * @param {string} id A string value.
   * @param {UpdateFn<T>} fn Selector function.
   * @returns {Type<T>} A Type instance.
   */
  public mappingValue(id: string, fn: UpdateFn<T>): Type<T> {
    let separator = this.substateSeparator;
    let separated = id.split(separator);
    let length = separated.length;
    let first = Collections.first(separated);

    if (length === 1) {
      return first.map(v => this.cloneBuilder()
        .updateValueWithFunction(v, fn).build())
        .getOrElse(this);
    } else {
      let subId = Try.evaluate(() => separated.slice(1, length).join(separator));
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
   * @returns {Type} A Type instance.
   */
  public updatingValue(id: string, value: Nullable<T>): Type<T> {
    let updateFn: UpdateFn<T> = () => {
      return Try.unwrap(value, `No value found at ${id}`);
    };

    return this.mappingValue(id, updateFn);
  }

  /**
   * Update all values from some key-value object.
   * @param {JSObject<T>} values A JSObject instance.
   * @returns {Type<T>} A Type instance.
   */
  public updatingKeyValues(values: JSObject<T>): Type<T> {
    let state = this.cloneBuilder().build();

    Objects.entries(values || {}).forEach((v) => {
      state = state.updatingValue(v[0], v[1]);
    });

    return state;
  }

  /**
   * Remove the value at some node.
   * @param {string} id A string value.
   * @returns {Type<T>} A Type instance.
   */
  public removingValue(id: string): Type<T> {
    return this.updatingValue(id, undefined);
  }

  /**
   * Copy value from one node to another.
   * @param {string} src A string value.
   * @param {string} dest A string value.
   * @returns {Type<T>} A Type instance.
   */
  public copyingValue(src: string, dest: string): Type<T> {
    let sourceValue = this.valueAtNode(src);
    return this.updatingValue(dest, sourceValue.value);
  }

  /**
   * Move value from one node to another.
   * @param {string} src A string value.
   * @param {string} dest A string value.
   * @returns {Type<T>} A Type instance.
   */
  public movingValue(src: string, dest: string): Type<T> {
    return this.copyingValue(src, dest).removingValue(src);
  }

  /**
   * Update the substate at some node with another substate, ignoring the old
   * substate.
   * @param {string} id A string value.
   * @param {Nullable<Type<T>>} ss A Type instance.
   * @returns {Type<T>} A Type instance.
   */
  public updatingSubstate(id: string, ss: Nullable<Type<T>>): Type<T> {
    let separator = this.substateSeparator;
    let separated = id.split(separator);
    let length = separated.length;
    let first = Collections.first(separated);

    if (length === 1) {
      return first
        .map(v => this.cloneBuilder().updateSubstate(v, ss).build())
        .getOrElse(this);
    } else {
      let subId = Try.evaluate(() => separated.slice(1, length).join(separator));

      return first
        .flatMap(v => Try.unwrap(this._substate[v]))
        .catchError(() => empty<T>())
        .zipWith(subId, (v1, v2) => v1.updatingSubstate(v2, ss))
        .zipWith(first, (v1, v2) => this.updatingSubstate(v2, v1))
        .getOrElse(this);
    }
  }

  /**
   * Remove the substate at some node.
   * @param {string} id A string value.
   * @returns {Type<T>} A Type instance.
   */
  public removingSubstate(id: string) {
    return this.updatingSubstate(id, undefined);
  }

  /**
   * Copy substate from one node to another.
   * @param {string} src A string value.
   * @param {string} dest A string value.
   * @returns {Type<T>} A Type instance.
   */
  public copyingSubstate(src: string, dest: string): Type<T> {
    let sourceSubstate = this.substateAtNode(src);
    return this.updatingSubstate(dest, sourceSubstate.value);
  }

  /**
   * Move substate from one node to another.
   * @param {string} src A string value.
   * @param {string} dest A string value.
   * @returns {Type<T>} A Type instance.
   */
  public movingSubstate(src: string, dest: string): Type<T> {
    return this.copyingSubstate(src, dest).removingSubstate(src);
  }

  /**
   * Clone the current State, but only include the substates found at the
   * specified nodes.
   * @param {...string[]} ids A varargs of id.
   * @returns {Type<T>} A Type instance.
   */
  public cloningWithSubstatesAtNodes(...ids: string[]): Type<T> {
    let state = empty<T>();

    for (let id of ids) {
      this.substateAtNode(id).doOnNext(v => {
        state = state.updatingSubstate(id, v);
      });
    }

    return state;
  }

  /**
   * Clone the current State, but only include the values found at the specified
   * nodes.
   * @param {...string[]} ids A varargs of id.
   * @returns {Type<T>} A Type instance.
   */
  public cloningWithValuesAtNodes(...ids: string[]): Type<T> {
    let state = empty<T>();

    for (let id of ids) {
      this.valueAtNode(id).doOnNext(v => {
        state = state.updatingValue(id, v);
      });
    }

    return state;
  }

  /**
   * Empty the current state.
   * @returns {Type<T>} A Type instance.
   */
  public emptying(): Type<T> {
    return empty();
  }

  /**
   * Flatten the current state to a key-value object. If we want a JSON of the
   * current state, we should use this method instead of JSON.parse(JSON.stringify)
   * because the key names will be different. (e.g. _values instead of values).
   *
   * It is unfortunate that the resulting KV object has generic 'any', so if we
   * want to convert back to whatever generics we were using before, use
   * 'fromKeyValue' then 'mappingEach' to cast values back to original form.
   * @returns {JSObject<any>} A JSObject instance.
   */
  public flatten(): JSObject<any> {
    let substates = Objects.entries(this._substate)
      .map(v => ({ [v[0]]: Try.unwrap(v[1]).map(v1 => v1.flatten()).value }))
      .reduce((v1, v2) => Object.assign({}, v1, v2), {});

    return { [valuesKey]: this._values, [substateKey]: substates };
  }

  /**
   * Get the level count, i.e. how nested the deepest substate is.
   * @returns {number} A number value.
   */
  public levelCount(): number {
    return Try.success(Objects.entries(this._substate))
      .map(v => v.map(v1 => v1[1]))
      .map(v => Collections.flatMap(v))
      .filter(v => v.length > 0, 'Empty substates')
      .map(v => v.map(v1 => v1.levelCount()))
      .flatMap(v => Try.unwrap(Math.max(...v)))
      .getOrElse(0) + 1;
  }

  /**
   * Get the total value count.
   * @returns {number} A number value.
   */
  public totalValueCount(): number {
    let valueCount = Objects.entries(this._values).length;

    let ssValueCount = Try.success(Objects.entries(this._substate))
      .map(v => v.map(v1 => v1[1]))
      .map(v => Collections.flatMap(v))
      .map(v => v.map(v1 => v1.totalValueCount()))
      .map(v => v.reduce((v1, v2) => v1 + v2))
      .getOrElse(0);

    return valueCount + ssValueCount;
  }

  /**
   * Convenience method to traverse the current state and perform some side
   * effects.
   * @param {ForEach<T>} selector Selector instance.
   * @param {Maybe<string>} ssPath Maybe substate path string.
   * @param {Nullable<number>} current Nullable current level.
   */
  private _forEach(selector: ForEach<T>, ssPath: Try<string>, current: Nullable<number>): void {
    let separator = this.substateSeparator;
    let valueEntries = Objects.entries(this.values);
    let substateEntries = Objects.entries(this.substate);
    let level = current || 0;

    valueEntries.forEach(v => {
      let value = Try.unwrap(v[1], `No value for key ${v[0]}`);
      selector(v[0], value, ssPath, level);
    });

    Try.success(substateEntries)
      .map(v => v.map(v1 => {
        return Try.unwrap(v1[1]).map((v2): [string, Type<T>] => [v1[0], v2]);
      }))
      .map(v => Collections.flatMap(v))
      .map(v => v.forEach(v1 => {
        let path = ssPath.map(v2 => v2 + separator).getOrElse('') + v1[0];
        let newLevel = level + 1;
        let newPath = Try.success(path);
        (fromState(v1[1]) as Self<T>)._forEach(selector, newPath, newLevel);
      }));
  }

  /**
   * Traverse through the state tree and perform some side-effects.
   * @param {ForEach<T>} selector Selector function.
   */
  public forEach(selector: ForEach<T>): void {
    this._forEach(selector, Try.failure('No substate path for top state'), undefined);
  }

  /**
   * Find all values whose full paths matches some conditions.
   * @param {(key: string) => boolean} pathMatcher The selector function.
   * @returns {JSObject<T>} A JSObject instance.
   */
  public valuesForMatchingPaths(pathMatcher: (key: string) => boolean): JSObject<T> {
    let keyValues = this.valuesWithFullPaths();

    return Object.keys(keyValues)
      .filter(v => pathMatcher(v))
      .map(v => ({ [v]: keyValues[v] }))
      .reduce((acc, v) => Object.assign(acc, v), {});
  }

  /**
   * Map all values in the current state to a different type.
   * @param {MapFn<T, R>} selector Selector function.
   * @returns {Type<R>} A Type instance.
   */
  public mappingEach<R>(selector: MapFn<T, R>): Type<R> {
    let separator = this.substateSeparator;
    let state = empty<R>();

    this.forEach((k, v, ss, _l) => {
      try {
        let newValue = v.map(v1 => selector(v1));
        let fullPath = ss.map(v1 => v1 + separator).getOrElse('') + k;
        state = state.updatingValue(fullPath, newValue.value);
      } catch { }
    });

    return state;
  }

  /**
   * Produce branches of the current state - each branch should contain at most
   * one substate. In essence, the branch's substate object will be a single
   * key-value object. A branch may look as follows:
   *  |
   *  | values: { a1, b1, c1 }
   *  |
   *  | values: { a2, b2, c2 }
   *  |
   *  | values: { a3, b3, c3 }
   *  |
   * @param {string} ssKey The current substate key. This is the key that
   * identifies a substate in this._substates.
   * @returns {[string, Type<T>][]} An Array of state.
   */
  private _createSingleBranches(ssKey: Nullable<string>): [string, Type<T>][] {
    let substateBranches = Try.success(Objects.entries(this._substate))
      .map(v => v.map(v1 => {
        return Try.unwrap(v1[1])
          .map(v2 => fromState(v2) as Self<T>)
          .map((v2): [string, Self<T>] => [v1[0], v2]);
      }))
      .map(v => Collections.flatMap(v))
      .filter(v => v.length > 0, 'No substate found')
      .map(v => v.map((v1): [string, Self<T>][] => {
        let branches = v1[1]._createSingleBranches(v1[0]);

        if (branches.length > 0) {
          return branches.map((v2): [string, Self<T>] => {
            return [v1[0], <Self<T>>empty<T>().updatingSubstate(v2[0], v2[1])];
          });
        } else {
          return [v1];
        }
      }))
      .map(v => v.reduce((v1, v2) => v1.concat(v2)));

    /// If substateKey is defined and not null, and the Try is a failure Try
    /// (indicating that the current substate has no substate), we must have
    /// reached the deep end of the tree.
    ///
    /// On the other hand, if the current state has no substate, we still need
    /// to return something even if no recursion is performed.
    ///
    /// For these cases, simply return the current state along with its substate
    /// key.
    if ((ssKey !== undefined && ssKey !== null) || !this.hasSubstate()) {
      return substateBranches.getOrElse([[ssKey || '', this]]);
    } else {
      /// If the substateKey is undefined or null, we are on the uppermost level.
      return substateBranches.getOrElse([])
        .map(v => empty<T>().updatingSubstate(v[0], v[1]))
        .map((v): [string, Type<T>] => ['', v]);
    }
  }

  /**
   * Produce branches of the current state - each branch should contain at most
   * one substate.
   * @returns {Type<T>[]} An Array of state.
   */
  public createSingleBranches = (): Type<T>[] => {
    return this._createSingleBranches(undefined).map(v => v[1]);
  }

  /**
   * Get all values with their respective paths that are joined in full.
   * @returns {JSObject<T>} A JSObject instance.
   */
  public valuesWithFullPaths(): JSObject<T> {
    let separator = this.substateSeparator;

    let substateValues = Objects.entries(this.substate)
      .map(v => {
        let mainKey = v[0];
        let values = v[1].valuesWithFullPaths();
        let valueKeys = Object.keys(values);

        return valueKeys
          .map(v1 => ({ [`${mainKey}${separator}${v1}`]: values[v1] }))
          .reduce((acc, v1) => Object.assign(acc, v1), {});
      })
      .reduce((acc, v) => Object.assign(acc, v), {});

    return Object.assign(substateValues, this.values);
  }

  /**
   * Check if the current state equals another state.
   * @param {StateType<JSObject<any>>} object A JSObject instance.
   * @returns {boolean} A boolean value.
   */
  public equals(object: Nullable<StateType<any>>): boolean {
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
  }

  /**
   * Check if two State are equal in values for the specified keys.
   * @param {Nullable<StateType<T>>} state A StateType instance.
   * @param {string[]} keys An Array of keys.
   * @param {(v1: T, v2: T) => boolean} [equalFn] Optional compare function.
   * @returns {boolean} A boolean value.
   */
  public equalsForValues(
    state: Nullable<StateType<T>>,
    keys: string[],
    equalFn?: (v1: T, v2: T) => boolean,
  ): boolean {
    let compareFn = equalFn !== undefined && equalFn !== null ? equalFn
      : (v1: T, v2: T): boolean => v1 === v2;

    let parsedState = fromKeyValue(state);

    for (let key of keys) {
      if (!parsedState.valueAtNode(key)
        .zipWith(this.valueAtNode(key), (v1, v2) => compareFn(v1, v2))
        .getOrElse(false)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if two State are equal in substates for the specified keys.
   * @param {Nullable<StateType<T>>} state A StateType instance.
   * @param {string[]} keys An Array of keys.
   * @param {(v1: Type<T>, v2: Type<T>) => boolean} [equalFn] Optional compare
   * function.
   * @returns {boolean} A boolean value.
   */
  public equalsForSubstates(
    state: Nullable<StateType<T>>,
    keys: string[],
    equalFn?: (v1: Type<T>, v2: Type<T>) => boolean,
  ): boolean {
    let compareFn = equalFn !== undefined && equalFn !== null ? equalFn
      : (v1: Type<T>, v2: Type<T>): boolean => v1.equals(v2);

    let parsedState = fromKeyValue(state);

    for (let key of keys) {
      if (!parsedState.substateAtNode(key)
        .zipWith(this.substateAtNode(key), (v1, v2) => compareFn(v1, v2))
        .getOrElse(false)
      ) {
        return false;
      }
    }

    return true;
  }
}

export class Builder<T> implements BuilderType<Type<T>> {
  private state: Self<T>;

  public constructor() {
    this.state = new Self();
  }

  /**
   * Replace the current state values.
   * @param {Nullable<Values<T>>} values A Values instance.
   * @returns {this} The current Builder instance.
   */
  public withValues(values: Nullable<Values<T>>): this {
    this.state.setValues(values);
    return this;
  }

  /**
   * Replace the current substate.
   * @param {Nullable<Substate<T>>} substate A Substate instance.
   * @returns {this} The current Builder instance.
   */
  public withSubstate(substate: Nullable<Substate<T>>): this {
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
   * @param {Nullable<T>} value T object.
   * @returns {this} The current Builder instance.
   */
  public updateValue(id: string, value: Nullable<T>): this {
    let updateFn: UpdateFn<T> = () => {
      return Try.unwrap(value, `No value found at ${id}`);
    };

    return this.updateValueWithFunction(id, updateFn);
  }

  /**
   * Update the current substates with some substate, ignoring the old substate.
   * @param {string} id A string value.
   * @param {Nullable<Type<T>>} ss A Type instance.
   * @returns {this} The current Builder instance.
   */
  public updateSubstate(id: string, ss: Nullable<Type<T>>): this {
    if (ss !== undefined && ss !== null) {
      this.state.setSubstate(id, ss);
    } else {
      this.state.removeSubState(id);
    }

    return this;
  }

  /**
   * Copy the properties from a state to the current state.
   * @param {Nullable<Type<T>>} buildable A Type instance.
   * @returns {this} The current Builder instance.
   */
  public withBuildable(buildable: Nullable<Type<T>>): this {
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
