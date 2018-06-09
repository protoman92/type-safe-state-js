import { Collections, Objects, Try } from 'javascriptutilities';
import { Impl, Type } from './state+main';
import { fromState } from './state+utility';

declare module './state+main' {
  export interface Type<T> {
    /**
     * Get the first value in the values object.
     * @returns {Try<T>} A Try T instance.
     */
    firstValue(): Try<T>;

    /**
     * Get the first substate in the substate object.
     * @returns {Try<Type<T>>} A Try Type instance.
     */
    firstSubstate(): Try<Type<T>>;

    /**
     * Get the substate at a particular node.
     * @param {string} path A string value.
     * @returns {Try<Type<T>>} A Try Type instance.
     */
    substateAtNode(path: string): Try<Type<T>>;

    /**
     * Get the state value at a particular node.
     * @param {string} path A string value.
     * @returns {Try<T>} Try T object.
     */
    valueAtNode(path: string): Try<T>;

    /**
     * Convenience method to get a string from a node.
     * @param {string} path A string value.
     * @returns {Try<string>} A Try string instance.
     */
    stringAtNode(path: string): Try<string>;

    /**
     * Convenience method to get a boolean from a node.
     * @param {string} path A string value.
     * @returns {Try<boolean>} A Try boolean instance.
     */
    booleanAtNode(path: string): Try<boolean>;

    /**
     * Convenience method to get a number from a node.
     * @param {string} path A string value.
     * @returns {Try<number>} A Try number instance.
     */
    numberAtNode(path: string): Try<number>;

    /**
     * Convenience method to get R from a node.
     * @template R Generics parameter.
     * @param {new () => R} ctor R constructor.
     * @param {string} path A string value.
     * @returns {Try<R>} A Try R instance.
     */
    instanceAtNode<R>(ctor: new () => R, path: string): Try<R>;
  }

  export interface Impl<T> extends Type<T> {
    _substateAtNode(path: string, originalPath: string): Try<Type<T>>;
    _valueAtNode(path: string, originalPath: string): Try<T>;
  }
}

Impl.prototype.firstValue = function <T>(): Try<T> {
  return Collections
    .first(Objects.entries(this._values))
    .map(v => v[0])
    .flatMap(v => this.valueAtNode(v));
};

Impl.prototype.firstSubstate = function <T>(): Try<Type<T>> {
  return Collections
    .first(Objects.entries(this._substate))
    .map(v => v[0])
    .flatMap(v => this.substateAtNode(v));
};

Impl.prototype._substateAtNode = function <T>(path: string, original: string): Try<Type<T>> {
  let separator = this.substateSeparator;
  let separated = path.split(separator);
  let length = separated.length;
  let first = Collections.first(separated);

  if (length === 1) {
    /// If the path is an empty string, return the current state.
    return first
      .map(v => Try.unwrap(this.substate[v]))
      .map(v => Try.unwrap(v))
      .flatMap(v => v.mapError(() => `No substate at ${original}`));
  } else {
    return Try.evaluate(() => separated.slice(1, length).join(separator))
      .zipWith(first, (v1, v2): [string, string] => [v1, v2])
      .map(v => this._substateAtNode(v[1], original)
        .map(v1 => fromState(v1) as Impl<T>)
        .map(v1 => v1._substateAtNode(v[0], original)))
      .flatMap(v => v.flatMap(v1 => v1));
  }
};

Impl.prototype.substateAtNode = function <T>(path: string): Try<Type<T>> {
  return this._substateAtNode(path, path);
};

Impl.prototype._valueAtNode = function <T>(path: string, original: string): Try<T> {
  let separator = this.substateSeparator;
  let separated = path.split(separator);
  let length = separated.length;
  let first = Collections.first(separated);

  if (length === 1) {
    return first.map(v => Try.unwrap(this.values[v]))
      .flatMap(v => v.mapError(() => `No value found at ${original}`));
  } else {
    return Try.evaluate(() => separated.slice(1, length).join(separator))
      .zipWith(first, (v1, v2): [string, string] => [v1, v2])
      .map(v => this._substateAtNode(v[1], original)
        .map(v1 => fromState(v1) as Impl<T>)
        .map(v1 => v1._valueAtNode(v[0], original)))
      .flatMap(v => v.flatMap(v1 => v1));
  }
};

Impl.prototype.valueAtNode = function <T>(path: string): Try<T> {
  return this._valueAtNode(path, path);
};

Impl.prototype.stringAtNode = function (path: string): Try<string> {
  return this.valueAtNode(path).map(v => {
    if (typeof (v) === 'string') {
      return v;
    } else {
      throw Error(`No string at ${path}`);
    }
  });
};

Impl.prototype.booleanAtNode = function (path: string): Try<boolean> {
  return this.valueAtNode(path).map(v => {
    if (typeof (v) === 'boolean') {
      return v;
    } else {
      throw Error(`No boolean at ${path}`);
    }
  });
};

Impl.prototype.numberAtNode = function (path: string): Try<number> {
  return this.valueAtNode(path).map(v => {
    if (typeof (v) === 'number') {
      return v;
    } else {
      throw Error(`No number at ${path}`);
    }
  });
};

Impl.prototype.instanceAtNode = function <R>(ctor: new () => R, path: string): Try<R> {
  return this.valueAtNode(path).map(v => {
    if (v instanceof ctor) {
      return v;
    } else {
      throw Error(`No ${ctor.name} at ${path}`);
    }
  });
};
