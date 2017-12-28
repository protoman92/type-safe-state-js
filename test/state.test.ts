import { JSObject, Numbers, Objects, Booleans, Types } from 'javascriptutilities';
import { State } from './../src';

describe('State should be implemented correctly', () => {
  let separator = '.';
  let alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let levelCount = 8;
  let levels = alphabets.split('').slice(0, levelCount);
  let countPerLevel = 2;
  var allCombinations: JSObject<any>;
  var allEntries: [string, any][];
  var initialState: State.Self<number>;

  let createNested = (levels: string[]): string[] => {
    let subLength = levels.length;
    let last = levels[subLength - 1];
    
    if (subLength === 1) {
      return Numbers.range(0, countPerLevel).map(v => '' + last + v);
    } else {
      let subNested = createNested(levels.slice(0, subLength - 1));
      let lastNested = createNested([last]);

      return subNested
        .map(v => lastNested.map(v1 => v + separator + v1))
        .reduce((a, b) => a.concat(b), []);
    }
  };

  // var initialState: State.Type = { values: {}, substate: {} };
  let createCombinations = (levels: string[]): JSObject<any> => {
    var allCombinations: JSObject<any> = {};
    let nestedKeys = createNested(levels);
    
    for (let key of nestedKeys) {
      let keyParts = key.split(separator);
      let keyLength = keyParts.length;

      let subKeys = Numbers
        .range(0, keyLength)
        .map(v => keyParts.slice(0, v + 1))
        .map(v => v.join(separator));
      
      subKeys.forEach(v => allCombinations[v] = Numbers.randomBetween(0, 1000));
    }

    return allCombinations;
  };

  beforeEach(() => {
    allCombinations = createCombinations(levels);
    allEntries = Objects.entries(allCombinations);
    initialState = State.empty<number>().updatingKeyValues(allCombinations);
  });

  it('Create default state - should create correct number of values', () => {
    /// Setup
    let nestedState = createNested(levels);

    /// When & Then
    expect(nestedState.length).toBe(countPerLevel ** levels.length);
  });

  it('Accessing value at node - should work correctly', () => {
    for (let entry of allEntries) {
      let key = entry[0];
      let value = entry[1];
      let valueAtNode = initialState.valueAtNode(key).value;
      expect(valueAtNode).toBe(value);
    }
  });

  it('Updating value at node - should work correctly', () => {
    for (let entry of allEntries) {
      let key = entry[0];
      let value = Booleans.random() ? Numbers.randomBetween(0, 1000) : undefined;
      let newState = initialState.updatingValue(key, value);
      let valueAtNode = newState.valueAtNode(key).value;
      expect(valueAtNode).toBe(value);
    }
  });

  it('Updating substate - should work correctly', () => {
    for (let entry of allEntries) {
      let key = entry[0];
      let state = Booleans.random ? State.empty<number>() : undefined;
      let newState = initialState.updatingSubstate(key, state);
      let stateAtNode = newState.substateAtNode(key).value;

      if (stateAtNode === undefined || stateAtNode === null) {
        expect(state).toBeFalsy();
      } else if (state !== undefined && state !== null) {
        expect(stateAtNode.values).toEqual(state.values);
      }
    }
  });

  it('Updating values at undefined substate - should create substate', () => {
    /// Setup
    let path = '1.2.3';
    let value = 12345678;

    /// When
    let newState = initialState.updatingValue(path, value);

    /// Then
    expect(newState.valueAtNode(path).value).toBe(value);
  });

  it('Substate equals - should work correctly', () => {
    /// Setup
    let flattened1 = <State.Type<number>>(initialState.flatten());
    let flattened2 = JSON.parse(JSON.stringify(initialState));
    let compareFn: (v1: number, v2: number) => boolean = (v1, v2) => v1 === v2;
    
    /// When & Then
    expect(initialState.equals(flattened1, compareFn)).toBeTruthy();
    expect(initialState.equals(flattened2, compareFn)).toBeTruthy();
  });

  it('Flatten state - should work', () => {
    /// Setup
    let flattened = initialState.flatten();
    let keys = [State.valuesKey, State.substateKey];

    /// When & Then
    if (!Types.isInstance<State.Type<number>>(flattened, keys)) {
      fail('Should have been of the same type');
    }
  });
});

describe('State should be immutable', () => {
  let state = State.empty<any>()
    .updatingValue('a', 1)
    .updatingValue('a.b.c', 2)
    .updatingValue('a.b.d', 3);

  it('Non-owning builder mutating state - should fail', () => {
    /// Setup
    let altBuilder = State.builder();
    let altState = altBuilder.build();
    let anyBuilder = State.builder<number>();

    /// When & Then
    expect(() => state.setValue('a', 1, anyBuilder)).toThrow();
    expect(() => altState.setValue('a', 1, altBuilder)).toThrow();
  });

  it('Setting values directly - should not mutate state', () => {
    /// Setup & When
    state.values['a'] = '2';

    /// Then
    expect(state.valueAtNode('a').value).not.toBe(2);
  });
});