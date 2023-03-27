import GroupTicket from '../../../town/office_hours_queue/ticket/GroupTicket';

describe('GroupTicket Test', () => {
  let x: GroupTicket;
  beforeEach(() => {
    x = new GroupTicket('q1', 'descrip');
  });
  it('starts with empty student ids', () => {
    expect(x.getStudentIDS()).toEqual([]);
  });
  it('adding students', () => {
    x.addStudent('123');
    x.addStudent('234');
    expect(x.getStudentIDS()).toEqual(['123', '234']);
  });
  it('adding duplicate students throws error', () => {
    x.addStudent('123');
    expect(() => x.addStudent('123')).toThrowError(
      'Trying to add a student that is already in group',
    );
  });
  describe('removing students', () => {
    beforeEach(() => {
      x.addStudent('123');
      x.addStudent('234');
      x.addStudent('345');
    });
    it('removing students', () => {
      x.removeStudent('123');
      expect(x.getStudentIDS()).toEqual(['234', '345']);
    });
    it('removing non existent students will throw error', () => {
      x.removeStudent('123');
      x.removeStudent('345');
      expect(() => x.removeStudent('3105')).toThrowError(
        'Trying to remove a student that is not in group',
      );
      expect(x.getStudentIDS()).toEqual(['234']);
      x.removeStudent('234');
      expect(() => x.removeStudent('234')).toThrowError(
        'Trying to remove a student that is not in group',
      );
      expect(x.getStudentIDS()).toEqual([]);
    });
  });
});
