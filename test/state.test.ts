import { Observable } from 'rxjs';
import { JSObject, Numbers } from 'javascriptutilities';
// import { State } from './../src';

let timeout = 1000;

describe('State should be implemented correctly', () => {
  let separator = '.';
  let levels = ['a', 'b', 'c', 'd'];
  let countPerLevel = 2;

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

  let allCombinations = createCombinations(levels);

  it('Create default state - should create correct number of values', done => {
    /// Setup
    let nestedState = createNested(levels);

    /// When
    Observable.from(nestedState)
      .distinctUntilChanged((v1, v2) => v1 === v2)      
      .toArray()
      .doOnNext(v => expect(v.length).toBe(levels.length ** countPerLevel))
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

  it('Accessing value at node - should work correctly', () => {
    
  }); 
});