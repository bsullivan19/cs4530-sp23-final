import { mockDeep, MockProxy } from 'jest-mock-extended';
import WaitingQueue from '../../town/office_hours_queue/WaitingQueue';
import Ticket from '../../town/office_hours_queue/ticket/Ticket';
import TicketComparator from '../../town/office_hours_queue/comparator/TicketComparator';

describe('WaitingQueue Test', () => {
  let q: WaitingQueue<Ticket>;
  let t1: MockProxy<Ticket>;
  let t2: MockProxy<Ticket>;
  let t3: MockProxy<Ticket>;
  let comp: TicketComparator;
  beforeEach(() => {
    q = new WaitingQueue<Ticket>();
    t1 = mockDeep<Ticket>();
    t2 = mockDeep<Ticket>();
    t3 = mockDeep<Ticket>();
    t1.getTime.mockImplementation(() => 1);
    t1.getQuestionType.mockImplementation(() => 'q1');
    t2.getTime.mockImplementation(() => 2);
    t2.getQuestionType.mockImplementation(() => 'q1');
    t3.getTime.mockImplementation(() => 1);
    t3.getQuestionType.mockImplementation(() => 'q3');
  });
  it('starts with empty queue', () => {
    expect(q.getQueue(comp)).toEqual([]);
  });
  it('adding tickets', () => {
    q.add(t1);
    expect(q.length()).toEqual(1);
  });
  it('adding duplicate students throws error', () => {
    q.add(t1);
    expect(() => q.add(t1)).toThrowError('Trying to add a ticket that already exists');
  });
  describe('removing tickets', () => {
    beforeEach(() => {
      q.add(t2);
      q.add(t1);
      q.add(t3);
    });
    it('removing tickets', () => {
      q.remove(t1);
      expect(q.length()).toEqual(2);
    });
    it('removing non existent ticket will throw error', () => {
      q.remove(t1);
      expect(() => q.remove(t1)).toThrowError('Trying to remove a ticket that does not exist');
      q.remove(t2);
      q.remove(t3);
      expect(() => q.remove(t3)).toThrowError('Trying to remove a ticket that does not exist');
    });
  });
  describe('After Adding tickets', () => {
    beforeEach(() => {
      q.add(t1);
      q.add(t2);
      q.add(t3);
      comp = new TicketComparator();
    });
    it('poll tickets test 1', () => {
      comp.setPriorities(
        new Map([
          ['q1', 1],
          ['q2', 2],
          ['q3', 3],
        ]),
      );
      const x = q.poll(comp);
      expect(x).toEqual(t1);
      comp = new TicketComparator();
      const y = q.poll(comp);
      expect(y).toEqual(t3);
      const z = q.poll(comp);
      expect(z).toEqual(t2);
    });
    it('poll tickets test 2', () => {
      comp.setPriorities(
        new Map([
          ['q3', 1],
          ['q2', 2],
          ['q1', 3],
        ]),
      );
      const x = q.poll(comp);
      expect(x).toEqual(t3);
    });
    it('cannot poll empty queue', () => {
      q.poll(comp);
      q.poll(comp);
      q.poll(comp);
      expect(() => q.poll(comp)).toThrowError('Cannot remove from empty queue');
    });
    it('get queue', () => {
      expect(q.getQueue(comp)).toEqual([t1, t3, t2]);
      comp.setPriorities(
        new Map([
          ['q1', 1],
          ['q3', 3],
        ]),
      );
      expect(q.getQueue(comp)).toEqual([t1, t2, t3]);
      comp.setPriorities(
        new Map([
          ['q1', 3],
          ['q3', 1],
        ]),
      );
      expect(q.getQueue(comp)).toEqual([t3, t1, t2]);
    });
  });
});
