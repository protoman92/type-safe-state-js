import { Collections, Try } from 'javascriptutilities';
import { Impl, MapFn, Type, UpdateFn } from './state+main';
import { empty } from './state+utility';

declare module './state+main' {
  export interface Type<T> {
    /**
     * Map the value at some node to another value using a mapper function, and
     * create whatever substate that is not present.
     * @param {string} id A string value.
     * @param {UpdateFn<T>} fn Selector function.
     * @returns {Type<T>} A Type instance.
     */
    mappingValue(id: string, fn: UpdateFn<T>): Type<T>;

    /**
     * Map all values in the current state to a different type.
     * @param {MapFn<T, R>} selector Selector function.
     * @returns {Type<R>} A Type instance.
     */
    mappingEach<R>(selector: MapFn<T, R>): Type<R>;
  }

  export interface Impl<T> extends Type<T> { }
}

Impl.prototype.mappingValue = function <T>(id: string, fn: UpdateFn<T>): Type<T> {
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

Impl.prototype.mappingEach = function <T, R>(selector: MapFn<T, R>): Type<R> {
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
