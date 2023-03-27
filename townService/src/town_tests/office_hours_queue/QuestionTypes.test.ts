import QuestionTypes from '../../town/office_hours_queue/QuestionTypes';

describe('QuestionTypes Test', () => {
  let x: QuestionTypes;
  beforeEach(() => {
    x = new QuestionTypes();
  });
  it('starts with empty student ids', () => {
    expect(x.getTypes()).toEqual([]);
  });
  it('adding students', () => {
    x.addType('q1');
    x.addType('q2');
    expect(x.getTypes()).toEqual(['q1', 'q2']);
  });
  it('adding duplicate students throws error', () => {
    x.addType('q1');
    expect(() => x.addType('q1')).toThrowError('Trying to add type that exists');
  });
  describe('removing students', () => {
    beforeEach(() => {
      x.addType('q1');
      x.addType('q2');
      x.addType('q3');
    });
    it('removing students', () => {
      x.removeType('q1');
      expect(x.getTypes()).toEqual(['q2', 'q3']);
    });
    it('removing non existent students will throw error', () => {
      x.removeType('q1');
      x.removeType('q3');
      expect(() => x.removeType('3105')).toThrowError('Trying to add type that does not exists');
      expect(x.getTypes()).toEqual(['q2']);
      x.removeType('q2');
      expect(() => x.removeType('q2')).toThrowError('Trying to add type that does not exists');
      expect(x.getTypes()).toEqual([]);
    });
  });
});
