import IndividualTicket from '../../../town/office_hours_queue/ticket/IndividualTicket';

describe('IndividualTicket Test', () => {
  it('getStudentID', () => {
    const x = new IndividualTicket('q1', 'descrip', '123');
    expect(x.getStudentID()).toEqual('123');
  });
});
