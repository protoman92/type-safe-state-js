# TypeSafeReduxState-JS
Functional, type-safe Redux state.

To use this State:

```typescript
import { State } from 'typesafereduxstate-js';
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
function reduce(state: State, action: Action): State {
  return state
    .updatingValue('auth.login.username', action.username)
    .updatingValue('auth.login.password', action.password)
    .updatingValue('auth.login.email', action.email);
}
```

As a result, we have a robust, functional set of reducers.