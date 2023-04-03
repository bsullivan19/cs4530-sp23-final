import Ticket from '../../../town/office_hours_queue/ticket/Ticket';

describe('Ticket Test', () => {
  it('Creating one ticket before another', () => {
    const firstTicket = new Ticket('questionType', 'description');
    setTimeout(() => {
      const secondTicket = new Ticket('questionType', 'description');
      expect(firstTicket.getTime()).toBeLessThan(secondTicket.getTime());
    }, 1000);
  });
});
