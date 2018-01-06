import {
  Collections,
  JSObject,
  Numbers,
  Objects,
  Booleans,
  Types,
} from 'javascriptutilities';

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

  it('Separate path into substate and value paths - should work', () => {
    /// Setup
    let sp = '.';
    let path1 = 'should.be.correct';
    let path2 = 'should';
    let path3 = '';

    /// When
    let separated1 = State.separateSubstateAndValuePaths(path1, sp);
    let separated2 = State.separateSubstateAndValuePaths(path2, sp);
    let separated3 = State.separateSubstateAndValuePaths(path3, sp);

    /// Then
    expect(separated1[0]).not.toHaveLength(0);
    expect(separated1[1]).not.toHaveLength(0);
    expect(separated2[0]).toHaveLength(0);
    expect(separated2[1]).not.toHaveLength(0);
    expect(separated3[0]).toHaveLength(0);
    expect(separated3[1]).toHaveLength(0);
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
      let valueAtNode = initialState.valueAtNode(key);
      expect(valueAtNode.value).toBe(value);
    }
  });

  it('Accessing undefined value at node - should work correctly', () => {
    for (let entry of allEntries) {
      let key = entry[0] + '.shouldNotExist';
      let valueAtNode = initialState.valueAtNode(key);
      let booleanAtNode = initialState.booleanAtNode(entry[0]);
      let stringAtNode = initialState.stringAtNode(entry[0]);
      expect(valueAtNode.isSuccess()).toBeFalsy();
      expect(booleanAtNode.isSuccess()).toBeFalsy();
      expect(stringAtNode.isSuccess()).toBeFalsy();
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

  it('Mapping values - should work', () => {
    /// Setup
    let keys = Object.keys(allCombinations);
    let key = Collections.randomElement(keys).getOrThrow();
    let oldValue = initialState.valueAtNode(key).getOrElse(100);

    /// When
    let newState = initialState
      .mappingValue(key, v => v.map(v1 => v1 * 2))
      .mappingValue(key, v => v.map(v1 => v1 * 3))
      .mappingValue(key, v => v.map(v1 => v1 * 4));

    /// Then
    expect(newState.valueAtNode(key).value).toBe(oldValue * 2 * 3 * 4);
  });
});

describe('State\'s instanceAtNode should be implemented correctly', () => {
  let state = State.empty<State.Self<string>>()
    .updatingValue('1.2.3', State.empty<string>())
    .updatingValue('1.2.3.4', State.empty());

  it('instanceAtNode should be implemented correctly', () => {
    /// Setup
    let instance = state.instanceAtNode(State.Self, '1.2.3');

    /// When & Then
    expect(instance.isSuccess()).toBeTruthy();
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