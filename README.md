# TypeSafeState-JS

[![npm version](https://badge.fury.io/js/type-safe-state-js.svg)](https://badge.fury.io/js/type-safe-state-js)
[![Build Status](https://travis-ci.org/protoman92/TypeSafeState-JS.svg?branch=master)](https://travis-ci.org/protoman92/TypeSafeState-JS)
[![Coverage Status](https://coveralls.io/repos/github/protoman92/TypeSafeState-JS/badge.svg?branch=master)](https://coveralls.io/github/protoman92/TypeSafeState-JS?branch=master)

Functional, type-safe nested state object that can be used for (but not limited to) Redux architectures.

To use this State:

```typescript
import { State } from 'type-safe-state-js';
```

This State object contains the a key-value object of the current state values, as well as a key-value object of nested substates. To access the value at any node, use:

```typescript
state.valueAtNode(string);
```

The parameter of this function should be a String whose components are joined with the specified substateSeparator (which is by default '.'). For example:

```typescript
state.valueAtNode('a.b.c.d.e');
```

The above call will access the value at key **'e'** of substate **'a.b.c.d'**.

In order to update the value at some node, call:

```typescript
state.updatingValue(string, Nullable<any>);
```

The State object will update the value at that node, and if necessary create new substates along the way.

This State is useful for Redux reducers because you will not need to check for existence of property keys before updating value at a node. A reducer can be as such:

```typescript
function reduce(state: State.Self<any>, action: Action): State.Self<any> {
  return state
    .updatingValue('auth.login.username', action.username)
    .updatingValue('auth.login.password', action.password)
    .updatingValue('auth.login.email', action.email);
}
```

As a result, we have a robust, functional set of reducers.
