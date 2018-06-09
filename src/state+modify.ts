import { Collections, JSObject, Nullable, Objects, Try } from 'javascriptutilities';
import { Impl, Type, UpdateFn } from './state+main';
import { empty } from './state+utility';

declare module './state+main' {
  export interface Type<T> {
    /**
     * Update the value at some node, ignoring the old value.
     * @param {string} id A string value.
     * @param {Nullable<T>} value T object.
     * @returns {Type} A Type instance.
     */
    updatingValue(id: string, value: Nullable<T>): Type<T>;

    /**
     * Copy value from one node to another.
     * @param {string} src A string value.
     * @param {string} dest A string value.
     * @returns {Type<T>} A Type instance.
     */
    copyingValue(src: string, dest: string): Type<T>;

    /**
     * Move value from one node to another.
     * @param {string} src A string value.
     * @param {string} dest A string value.
     * @returns {Type<T>} A Type instance.
     */
    movingValue(src: string, dest: string): Type<T>;

    /**
     * Update all values from some key-value object.
     * @param {JSObject<T>} values A JSObject instance.
     * @returns {Type<T>} A Type instance.
     */
    updatingKeyValues(values: JSObject<T>): Type<T>;

    /**
     * Remove the value at some node.
     * @param {string} id A string value.
     * @returns {Type<T>} A Type instance.
     */
    removingValue(id: string): Type<T>;

    /**
     * Update the substate at some node with another substate, ignoring the old
     * substate.
     * @param {string} id A string value.
     * @param {Nullable<Type<T>>} ss A Type instance.
     * @returns {Type<T>} A Type instance.
     */
    updatingSubstate(id: string, ss: Nullable<Type<T>>): Type<T>;

    /**
     * Remove the substate at some node.
     * @param {string} id A string value.
     * @returns {Type<T>} A Type instance.
     */
    removingSubstate(id: string): Type<T>;

    /**
     * Copy substate from one node to another.
     * @param {string} src A string value.
     * @param {string} dest A string value.
     * @returns {Type<T>} A Type instance.
     */
    copyingSubstate(src: string, dest: string): Type<T>;

    /**
     * Move substate from one node to another.
     * @param {string} src A string value.
     * @param {string} dest A string value.
     * @returns {Type<T>} A Type instance.
     */
    movingSubstate(src: string, dest: string): Type<T>;

    /**
     * Empty the current state.
     * @returns {Type<T>} A Type instance.
     */
    emptying(): Type<T>;
  }

  export interface Impl<T> extends Type<T> { }
}

Impl.prototype.updatingValue = function <T>(id: string, value: Nullable<T>): Type<T> {
  let updateFn: UpdateFn<T> = () => {
    return Try.unwrap(value, `No value found at ${id}`);
  };

  return this.mappingValue(id, updateFn);
}

Impl.prototype.updatingKeyValues = function <T>(values: JSObject<T>): Type<T> {
  let state = this.cloneBuilder().build();

  Objects.entries(values || {}).forEach((v) => {
    state = state.updatingValue(v[0], v[1]);
  });

  return state;
}

Impl.prototype.removingValue = function <T>(id: string): Type<T> {
  return this.updatingValue(id, undefined);
}

Impl.prototype.copyingValue = function <T>(src: string, dest: string): Type<T> {
  let sourceValue = this.valueAtNode(src);
  return this.updatingValue(dest, sourceValue.value);
}

Impl.prototype.movingValue = function <T>(src: string, dest: string): Type<T> {
  return this.copyingValue(src, dest).removingValue(src);
}

Impl.prototype.updatingSubstate = function <T>(id: string, ss: Nullable<Type<T>>): Type<T> {
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

Impl.prototype.removingSubstate = function <T>(id: string): Type<T> {
  return this.updatingSubstate(id, undefined);
}

Impl.prototype.copyingSubstate = function <T>(src: string, dest: string): Type<T> {
  let sourceSubstate = this.substateAtNode(src);
  return this.updatingSubstate(dest, sourceSubstate.value);
}

Impl.prototype.movingSubstate = function <T>(src: string, dest: string): Type<T> {
  return this.copyingSubstate(src, dest).removingSubstate(src);
}

Impl.prototype.emptying = function <T>(): Type<T> {
  return empty();
}
