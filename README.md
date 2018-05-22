# type-safe-state-js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/type-safe-state-js.svg?dummy=false)](https://badge.fury.io/js/type-safe-state-js?dummy=false)
[![Build Status](https://travis-ci.org/protoman92/type-safe-state-js.svg?branch=master&dummy=false)](https://travis-ci.org/protoman92/type-safe-state-js?dummy=false)
[![Coverage Status](https://coveralls.io/repos/github/protoman92/type-safe-state-js/badge.svg?branch=master&dummy=false)](https://coveralls.io/github/protoman92/type-safe-state-js?branch=master&dummy=false)

### REACT NATIVE USERS, PLEASE READ THIS FIRST: ###

Since React Native only allows the state to be a normal key-value object, using this State will lead to errors when we call **setState** on a Component:

> One of the sources for assign has an enumerable key on the prototype chain. Are you trying to assign a prototype property? We don't allow it, as this is an edge case that we do not support. This error is a performance optimization and not spec compliant.

The workaround for this issue is to convert the State to a normal KV object with **flatten** before setting state, and re-convert **this.state** back with **State.fromKeyValue** when we want to read data. When I define a Component, I usually do it as such:

```typescript
import { Component } from 'react';
import { State, StateType } from 'type-safe-state-js';

class App extends Component<Props.Type, StateType<any>> {
  public constructor(props: Props.Type) {
    super(props);
  }
  
  private operationThatAccessesState(): void {
    let a = State.fromKeyValue(this.state).valueAtNode('a.b.c.d');
    ...
  }
  
  private operationThatSetsState(state: State.Self<any>): void {
    this.setState(this.convertStateForPlatform(state));
  }
  
  private convertStateForPlatform(state: State.Self<any>): StateType<any> {
    return this.platform === REACT_NATIVE ? state.flatten() : state;
  }
}
```

Since **StateType** is defined as:

```typescript
type StateType<T> = State.Type<T> | { [key: string] : T };
```

Or as written in the source code:

```typescript
type StateType<T> = State.Type<T> | JSObject<T>;
```

Using **StateType** as the state type for a component effectively takes care of both normal React.js and React Native. **State.fromKeyValue** checks whether the object is of class **State.Self** first before doing anything (and does nothing if it is), so we do not have to worry about unnecessary work.

### WHAT IS IT?

Functional, type-safe nested state object that can be used for (but not limited to) Redux architectures. Since it is immutable by default (all update operations must be done via a limited selection of functions), we do not need to worry about shared state management.

To use this State:

```typescript
import { State } from 'type-safe-state-js';

/// Note that we only expose the state interface for better encapsulation.
let state: State.Type<any> = State.empty<any>();
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
function reduce(state: State.Type<any>, action: Action): State.Type<any> {
  return state
    .updatingValue('auth.login.username', action.username)
    .updatingValue('auth.login.password', action.password)
    .updatingValue('auth.login.email', action.email);
}
```

As a result, we have a robust, functional set of reducers.

Note that althought the source code defines a class called **State.Self** (which holds all implementations for **State.Type**), it is not exported in order to prevent unwanted state modifications. As a result, we would use **State.Type** for all state operations, and even **cloneBuilder()** (since it extends **BuildableType**). One limitation of this approach is that it becomes harder to provide a different implementation for **State.Type** due to the large number of required methods/properties, but I see little use in doing so.
