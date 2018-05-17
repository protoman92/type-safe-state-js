import {
  Collections,
  JSObject,
  Numbers,
  Objects,
  Booleans,
  Try,
  Types,
} from 'javascriptutilities';

import { State } from './../src';

let alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let separator = '.';

function createLevels(levelCount: number): string[] {
  return alphabets.split('').slice(0, levelCount);
}

function createAllKeys(levels: string[], countPerLevel: number): string[] {
  let subLength = levels.length;
  let last = levels[subLength - 1];

  if (subLength === 1) {
    return Numbers.range(0, countPerLevel).map(v => '' + last + v);
  } else {
    let subKeys = createAllKeys(levels.slice(0, subLength - 1), countPerLevel);
    let lastKeys = createAllKeys([last], countPerLevel);

    return subKeys
      .map(v => lastKeys.map(v1 => v + separator + v1))
      .reduce((a, b) => a.concat(b), []);
  }
}

function createCombinations(levels: string[], countPerLevel: number): JSObject<number> {
  let allCombinations: JSObject<number> = {};
  let allKeys = createAllKeys(levels, countPerLevel);

  for (let key of allKeys) {
    let keyParts = key.split(separator);
    let keyLength = keyParts.length;

    let subKeys = Numbers
      .range(0, keyLength)
      .map(v => keyParts.slice(0, v + 1))
      .map(v => v.join(separator));

    subKeys.forEach(v => allCombinations[v] = Numbers.randomBetween(0, 100000));
  }

  return allCombinations;
}

function createState(levels: string[], countPerLevel: number): State.Type<number> {
  let combinations = createCombinations(levels, countPerLevel);
  return State.empty<number>().updatingKeyValues(combinations);
}

describe('State should be implemented correctly - fixed tests', () => {
  let levelCount: number;
  let levelLetters: string[];
  let countPerLevel = 2;
  let allCombinations: JSObject<any>;
  let allEntries: [string, any][];
  let initialState: State.Type<number>;

  beforeEach(() => {
    levelCount = 8;
    levelLetters = createLevels(levelCount);
    allCombinations = createCombinations(levelLetters, countPerLevel);
    allEntries = Objects.entries(allCombinations);
    initialState = State.empty<number>().updatingKeyValues(allCombinations);
  });

  it('Create default state - should create correct number of values', () => {
    /// Setup
    let allKeys = createAllKeys(levelLetters, countPerLevel);

    /// When & Then
    expect(allKeys.length).toBe(countPerLevel ** levelLetters.length);
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

      expect(stateAtNode).toBeTruthy();
      expect(stateAtNode!.values).toEqual(state!.values);
    }
  });

  it('Updating values at undefined substate - should create substate', () => {
    /// Setup
    let times = 10;

    /// When
    for (let i of Numbers.range(1, times)) {
      let levels = alphabets.split('').slice(0, i);
      let combinations = createCombinations(levels, countPerLevel);
      let state = State.empty<number>().updatingKeyValues(combinations);
      let lvCount = state.levelCount();

      /// Then
      expect(lvCount).toBe(levels.length);
    }
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

  it('Flatten state - should work correctly', () => {
    /// Setup
    let flattened = initialState.flatten();

    /// When & Then
    if (!Types.isInstance<State.Type<number>>(flattened, 'values', 'substate')) {
      fail('Should have been of the same type');
    }
  });

  it('Mapping values - should work correctly', () => {
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

describe('State should be implemented correctly - variable tests', () => {
  let countPerLevel = 3;
  let maxLevel = 8;

  it('State total value count should be implemented correctly', () => {
    for (let i of Numbers.range(1, maxLevel)) {
      /// Setup
      let levels = createLevels(i);
      let allCombinations = createCombinations(levels, countPerLevel);
      let state = createState(levels, countPerLevel);

      /// When
      let valueCount = state.totalValueCount();

      /// Then
      expect(Objects.entries(allCombinations).length).toBe(valueCount);
    }
  });

  it('State level count should be implemented correctly', () => {
    for (let i of Numbers.range(1, maxLevel)) {
      /// Setup
      let levels = createLevels(i);
      let state = createState(levels, countPerLevel);

      /// When
      let levelCount = state.levelCount();

      /// Then
      expect(levelCount).toBe(levels.length);
    }
  });

  it('State for each/map for each - should work correctly', () => {
    /// Setup
    let mappingFns: ((v: number) => number)[] = [
      v => v * 10 + 15,
      v => v * 7 - 4,
      v => v + 15,
      v => v - 30,
    ];

    for (let i of Numbers.range(1, maxLevel)) {
      let levels = createLevels(i);
      let combinations = createCombinations(levels, countPerLevel);
      let allEntries = Objects.entries(combinations);
      let state = createState(levels, countPerLevel);
      let levelNumbers: number[] = [];
      let paths: Try<string>[] = [];
      let values: number[] = [];
      let newValues: number[] = [];
      let mapFn = Collections.randomElement(mappingFns).getOrThrow();
      let newState = state.mappingEach(mapFn);

      /// When
      state.forEach((_k, v, ss, l) => {
        paths.push(ss);
        levelNumbers.push(l);
        values.push(v.getOrThrow());
      });

      newState.forEach((_k, v) => newValues.push(v.getOrThrow()));

      /// Then
      let levelCount = Collections.unique(levelNumbers).length;
      expect(levelCount).toBe(levels.length);
      expect(paths.length).toBe(allEntries.length);
      expect(values.map(mapFn)).toEqual(newValues);
    }
  });

  it('Clone with substates at nodes - should work correctly', () => {
    /**
     * Start from 2 to skip case whereby key length is 1.
     */
    for (let i of Numbers.range(2, maxLevel)) {
      /// Setup
      let levels = createLevels(i);
      let allKeys = createAllKeys(levels, countPerLevel);

      let substateKeys = allKeys.map(v => {
        return v.split('.').reverse().slice(1).reverse().join('.');
      });

      let state = createState(levels, countPerLevel);

      /// When
      let clonedState = state.cloneWithSubstatesAtNodes(...substateKeys);

      /// Then
      for (let substateKey of substateKeys) {
        let originalSubstate = state.substateAtNode(substateKey);
        let clonedSubstate = clonedState.substateAtNode(substateKey);
        expect(originalSubstate.isSuccess()).toBeTruthy();
        expect(clonedSubstate.isSuccess()).toBeTruthy();
        expect(clonedSubstate.value).toEqual(originalSubstate.value);
      }
    }
  });

  it('Clone with values at nodes - should work correctly', () => {
    for (let i of Numbers.range(1, maxLevel)) {
      /// Setup
      let levels = createLevels(i);
      let allKeys = createAllKeys(levels, countPerLevel);
      let state = createState(levels, countPerLevel);

      /// When
      let clonedState = state.cloneWithValuesAtNodes(...allKeys);

      /// Then
      for (let valueKey of allKeys) {
        let originalValue = state.valueAtNode(valueKey);
        let clonedValue = clonedState.valueAtNode(valueKey);
        expect(originalValue.isSuccess()).toBeTruthy();
        expect(clonedValue.isSuccess()).toBeTruthy();
        expect(clonedValue.value).toEqual(originalValue.value);
      }
    }
  });

  it('Create single branches - should work correctly', () => {
    for (let i of Numbers.range(1, maxLevel)) {
      /// Setup
      let levels = createLevels(i);
      let state = createState(levels, countPerLevel);
      let sep = state.substateSeparator;

      /// When
      let branches = state.createSingleBranches();

      /// Then
      branches.forEach(v => {
        let branchLevels: number[] = [];

        v.forEach((k, v1, ss, l) => {
          branchLevels.push(l);
          let fullPath = ss.map(v2 => v2 + sep).getOrElse('') + k;
          let valueAtPath = state.valueAtNode(fullPath);
          expect(valueAtPath.value).toBe(v1.value);
        });

        expect(Math.max(...branchLevels) + 1).toBe(v.levelCount());
      });

      expect(branches.length).toBe(countPerLevel ** (i - 1));
    }
  });

  it('State.fromKeyValue using flattened object should work correctly', () => {
    for (let i of Numbers.range(1, maxLevel)) {
      /// Setup
      let levels = createLevels(i);
      let state = createState(levels, countPerLevel);

      /// When
      let flattened = state.flatten();
      let reconstructed = State.fromKeyValue(flattened);

      /// Then
      expect(reconstructed.equals(state, (v1, v2) => v1 === v2)).toBeTruthy();
    }
  });
});
