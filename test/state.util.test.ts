import { State } from './../src';

describe('Utilities tests', () => {
  it('Separate path into substate and value paths - should work correctly', () => {
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
});
