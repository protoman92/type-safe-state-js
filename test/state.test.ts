import { Observable } from 'rxjs';
import { JSObject, Numbers, Objects, Booleans } from 'javascriptutilities';
import { State } from './../src';

let timeout = 1000;

describe('State should be implemented correctly', () => {
  let separator = '.';
  let alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let levelCount = 7;
  let levels = alphabets.split('').slice(0, levelCount);
  let countPerLevel = 2;
  var allCombinations: JSObject<any>;
  var allEntries: [string, any][];
  var initialState: State.Self;

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
    initialState = State.empty().updatingKV(allCombinations);
  });

  it('Create default state - should create correct number of values', done => {
    /// Setup
    let nestedState = createNested(levels);

    /// When
    Observable.from(nestedState)
      .distinctUntilChanged((v1, v2) => v1 === v2)      
      .toArray()
      .doOnNext(v => expect(v.length).toBe(countPerLevel ** levels.length))
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

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
      let state = Booleans.random ? State.empty() : undefined;
      let newState = initialState.updatingSubstate(key, state);
      let stateAtNode = newState.substateAtNode(key).value;

      if (stateAtNode === undefined || stateAtNode === null) {
        expect(state).toBeFalsy();
      } else if (state !== undefined && state !== null) {
        expect(stateAtNode.values).toEqual(state.values);
      }
    }
  });
});