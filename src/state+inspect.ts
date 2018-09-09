import {
  Collections,
  JSObject,
  Never,
  Objects,
  Try
} from 'javascriptutilities';
import { ForEach, Impl, Type, valuesKey, substateKey } from './state+main';
import { empty, fromState } from './state+utility';

declare module './state+main' {
  export interface Type<T> {
    /**
     * Check if the current state has values.
     * @returns {boolean} A boolean value.
     */
    hasValues(): boolean;

    /**
     * Check if the current state has substates.
     * @returns {boolean} A boolean value.
     */
    hasSubstate(): boolean;

    /**
     * Check if the current state is empty.
     * @returns {boolean} A boolean value.
     */
    isEmpty(): boolean;

    /**
     * Get the level count, i.e. how nested the deepest substate is.
     * @returns {number} A number value.
     */
    levelCount(): number;

    /**
     * Get the total value count.
     * @returns {number} A number value.
     */
    totalValueCount(): number;

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
    flatten(): JSObject<any>;

    /**
     * Traverse through the state tree and perform some side-effects.
     * @param {ForEach<T>} selector Selector function.
     */
    forEach(selector: ForEach<T>): void;

    /**
     * Find all values whose full paths matches some conditions.
     * @param {(key: string) => boolean} pathMatcher The selector function.
     * @returns {JSObject<T>} A JSObject instance.
     */
    valuesForMatchingPaths(keyMatcher: (key: string) => boolean): JSObject<T>;

    /**
     * Produce branches of the current state - each branch should contain at most
     * one substate.
     * @returns {Type<T>[]} An Array of state.
     */
    createSingleBranches(): Type<T>[];

    /**
     * Get all values with their respective paths that are joined in full.
     * @returns {JSObject<T>} A JSObject instance.
     */
    valuesWithFullPaths(): JSObject<T>;
  }

  export interface Impl<T> extends Type<T> {
    _forEach(
      selector: ForEach<T>,
      ssPath: Try<string>,
      current: Never<number>
    ): void;

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
    _createSingleBranches(ssKey: Never<string>): [string, Type<T>][];
  }
}

Impl.prototype.hasValues = function(): boolean {
  return Object.keys(this._values).length > 0;
};

Impl.prototype.hasSubstate = function(): boolean {
  return Object.keys(this._substate).length > 0;
};

Impl.prototype.isEmpty = function(): boolean {
  return !(this.hasValues() && this.hasSubstate());
};

Impl.prototype.levelCount = function(): number {
  return (
    Try.success(Objects.entries(this._substate))
      .map(v => v.map(v1 => v1[1]))
      .map(v => Collections.flatMap(v))
      .filter(v => v.length > 0, 'Empty substates')
      .map(v => v.map(v1 => v1.levelCount()))
      .flatMap(v => Try.unwrap(Math.max(...v)))
      .getOrElse(0) + 1
  );
};

Impl.prototype.totalValueCount = function(): number {
  let valueCount = Objects.entries(this._values).length;

  let ssValueCount = Try.success(Objects.entries(this._substate))
    .map(v => v.map(v1 => v1[1]))
    .map(v => Collections.flatMap(v))
    .map(v => v.map(v1 => v1.totalValueCount()))
    .map(v => v.reduce((v1, v2) => v1 + v2))
    .getOrElse(0);

  return valueCount + ssValueCount;
};

Impl.prototype.flatten = function(): JSObject<any> {
  let substates = Objects.entries(this._substate)
    .map(v => ({ [v[0]]: Try.unwrap(v[1]).map(v1 => v1.flatten()).value }))
    .reduce((v1, v2) => Object.assign({}, v1, v2), {});

  return { [valuesKey]: this._values, [substateKey]: substates };
};

Impl.prototype._forEach = function<T>(
  selector: ForEach<T>,
  ssPath: Try<string>,
  current: Never<number>
): void {
  let separator = this.substateSeparator;
  let valueEntries = Objects.entries(this.values);
  let substateEntries = Objects.entries(this.substate);
  let level = current || 0;

  valueEntries.forEach(v => {
    let value = Try.unwrap(v[1], `No value for key ${v[0]}`);
    selector(v[0], value, ssPath, level);
  });

  Try.success(substateEntries)
    .map(v =>
      v.map(v1 => {
        return Try.unwrap(v1[1]).map((v2): [string, Type<T>] => [v1[0], v2]);
      })
    )
    .map(v => Collections.flatMap(v))
    .map(v =>
      v.forEach(v1 => {
        let path = ssPath.map(v2 => v2 + separator).getOrElse('') + v1[0];
        let newLevel = level + 1;
        let newPath = Try.success(path);
        (fromState(v1[1]) as Impl<T>)._forEach(selector, newPath, newLevel);
      })
    );
};

Impl.prototype.forEach = function<T>(selector: ForEach<T>): void {
  this._forEach(
    selector,
    Try.failure('No substate path for top state'),
    undefined
  );
};

Impl.prototype.valuesForMatchingPaths = function<T>(
  pathMatcher: (key: string) => boolean
): JSObject<T> {
  let keyValues = this.valuesWithFullPaths();

  return Object.keys(keyValues)
    .filter(v => pathMatcher(v))
    .map(v => ({ [v]: keyValues[v] }))
    .reduce((acc, v) => Object.assign(acc, v), {});
};

Impl.prototype._createSingleBranches = function<T>(
  ssKey: Never<string>
): [string, Type<T>][] {
  let substateBranches = Try.success(Objects.entries(this._substate))
    .map(v =>
      v.map(v1 => {
        return Try.unwrap(v1[1])
          .map(v2 => fromState(v2) as Impl<T>)
          .map((v2): [string, Impl<T>] => [v1[0], v2]);
      })
    )
    .map(v => Collections.flatMap(v))
    .filter(v => v.length > 0, 'No substate found')
    .map(v =>
      v.map(
        (v1): [string, Impl<T>][] => {
          let branches = v1[1]._createSingleBranches(v1[0]);

          if (branches.length > 0) {
            return branches.map(
              (v2): [string, Impl<T>] => {
                return [
                  v1[0],
                  <Impl<T>>empty<T>().updatingSubstate(v2[0], v2[1])
                ];
              }
            );
          } else {
            return [v1];
          }
        }
      )
    )
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
    return substateBranches
      .getOrElse([])
      .map(v => empty<T>().updatingSubstate(v[0], v[1]))
      .map((v): [string, Type<T>] => ['', v]);
  }
};

Impl.prototype.createSingleBranches = function<T>(): Type<T>[] {
  return this._createSingleBranches(undefined).map(v => v[1]);
};

Impl.prototype.valuesWithFullPaths = function<T>(): JSObject<T> {
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
};
