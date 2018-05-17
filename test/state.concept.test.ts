import { State } from './../src';

describe('Nominal state tests', () => {
  it('Accessing substate/value with empty id - should work correctly', () => {
    /// Setup
    let state = State.empty();

    /// When & Then
    expect(state.substateAtNode('').isFailure()).toBeTruthy();
    expect(state.valueAtNode('').isFailure()).toBeTruthy();
  });

  it('Update substate with possibly invalid keys - should work', () => {
    /// Setup
    let state = State.fromKeyValue({
      [State.substateKey]: {},
      [State.valuesKey]: { a: 1, b: 2, c: 3 },
    });

    /// When && Then
    let substate1 = State.fromKeyValue({
      [State.substateKey]: {},
      [State.valuesKey]: { d: 4, e: 5, f: 6 },
    });

    state = state.updatingSubstate('', substate1);
    expect(state.substateAtNode('').value!.flatten()).toEqual(substate1.flatten());

    let substate2 = substate1.cloneBuilder().build();
    state = state.updatingSubstate('non.existent.key', substate2);
    expect(state.substateAtNode('non.existent.key').isSuccess()).toBeTruthy();
  });

  it('Clone substates at nodes - should work', () => {
    /// Setup
    let state = State.fromKeyValue({
      [State.substateKey]: {
        a: {
          [State.substateKey]: {
            b: {
              [State.substateKey]: {},
              [State.valuesKey]: { b1: 1, b2: 2, b3: 3 },
            },
          },
          [State.valuesKey]: { a1: 1, a2: 2, a3: 3 },
        },
        b: {
          [State.substateKey]: {},
          [State.valuesKey]: { b1: 1, b2: 2, b3: 3 },
        },
      },
      [State.valuesKey]: {},
    });

    /// When
    let clonedState = state.cloneWithSubstatesAtNodes('a', 'b');

    /// Then
    expect(clonedState.flatten()).toEqual(state.flatten());
  });
});

describe('State\'s instanceAtNode should be implemented correctly', () => {
  class A { constructor() { } }

  let state = State.empty<A>()
    .updatingValue('1.2.3', new A())
    .updatingValue('1.2.3.4', new A());

  it('instanceAtNode should be implemented correctly', () => {
    /// Setup
    let instance = state.instanceAtNode(A, '1.2.3');

    /// When & Then
    expect(instance.isSuccess()).toBeTruthy();
  });
});

describe('State construction should be implemented correctly', () => {
  it('State.fromState with undefined state - should work correctly', () => {
    /// Setup
    let state1: State.Type<any> = (({
      values: undefined,
      substate: undefined,
    }) as any) as State.Type<any>;

    /// When
    let result = State.fromState(state1);

    /// Then
    expect(result.isEmpty()).toBeTruthy();
  });

  it('State.fromKeyValue with undefined object - should work correctly', () => {
    /// Setup
    let state1 = undefined;

    let state2: State.Type<any> = (({
      values: undefined,
      substate: undefined,
    }) as any) as State.Type<any>;

    /// When
    let result1 = State.fromKeyValue(state1);
    let result2 = State.fromKeyValue(state2);

    /// Then
    [result1, result2].forEach(v => expect(v.isEmpty()).toBeTruthy());
  });
});

describe('State should be immutable', () => {
  let state = State.empty<any>()
    .updatingValue('a', 1)
    .updatingValue('a.b.c', 2)
    .updatingValue('a.b.d', 3);

  it('Setting values directly - should not mutate state', () => {
    /// Setup & When
    state.values.a = '2';

    /// Then
    expect(state.valueAtNode('a').value).not.toBe(2);
  });
});
