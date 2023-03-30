import { mockDeep, MockProxy } from 'jest-mock-extended';
import Ticket from '../../../town/office_hours_queue/ticket/Ticket';
import TicketComparator from '../../../town/office_hours_queue/comparator/TicketComparator';

describe('TicketComparator Test', () => {
  let t1: MockProxy<Ticket>;
  let t2: MockProxy<Ticket>;
  let comp: TicketComparator;
  beforeEach(() => {
    t1 = mockDeep<Ticket>();
    t2 = mockDeep<Ticket>();
    comp = new TicketComparator();
  });
  it('Default Map that sorts by time', () => {
    t1.getTime.mockImplementation(() => 1);
    t2.getTime.mockImplementation(() => 2);
    expect(comp.compare(t1, t2)).toBeLessThan(0);

    t1.getTime.mockImplementation(() => 5);
    t2.getTime.mockImplementation(() => 2);
    expect(comp.compare(t1, t2)).toBeGreaterThan(0);

    t1.getTime.mockImplementation(() => 400);
    t2.getTime.mockImplementation(() => 400);
    expect(comp.compare(t1, t2)).toEqual(0);
  });
  it('Big Numbers', () => {
    t1.getTime.mockImplementation(() => 1e200);
    t2.getTime.mockImplementation(() => 1e201);
    expect(comp.compare(t1, t2)).toBeLessThan(0);

    t1.getTime.mockImplementation(() => 1e20);
    t2.getTime.mockImplementation(() => 1e19);
    expect(comp.compare(t1, t2)).toBeGreaterThan(0);

    t1.getTime.mockImplementation(() => 1e100);
    t2.getTime.mockImplementation(() => 1e100);
    expect(comp.compare(t1, t2)).toEqual(0);
  });
  describe('Using map', () => {
    let mp;
    beforeEach(() => {
      mp = new Map([
        ['q1', 1],
        ['q2', 2],
        ['q3', 1],
      ]);
      comp.setPriorities(mp);
    });
    it('t1 and t2 not in map', () => {
      t1.getTime.mockImplementation(() => 1);
      t1.getQuestionType.mockImplementation(() => 'none');
      t2.getTime.mockImplementation(() => 2);
      t2.getQuestionType.mockImplementation(() => 'none');
      expect(comp.compare(t1, t2)).toBeLessThan(0);
    });
    it('only t1 in map', () => {
      t1.getTime.mockImplementation(() => 2);
      t1.getQuestionType.mockImplementation(() => 'q1');
      t2.getTime.mockImplementation(() => 1);
      t2.getQuestionType.mockImplementation(() => 'none');
      expect(comp.compare(t1, t2)).toBeLessThan(0);
    });
    it('only t2 in map', () => {
      t1.getTime.mockImplementation(() => 1);
      t1.getQuestionType.mockImplementation(() => 'none');
      t2.getTime.mockImplementation(() => 2);
      t2.getQuestionType.mockImplementation(() => 'q2');
      expect(comp.compare(t1, t2)).toBeGreaterThan(0);
    });
    it('t1 and t2 in map', () => {
      t1.getTime.mockImplementation(() => 2);
      t1.getQuestionType.mockImplementation(() => 'q1');
      t2.getTime.mockImplementation(() => 1);
      t2.getQuestionType.mockImplementation(() => 'q2');
      expect(comp.compare(t1, t2)).toBeLessThan(0);

      t1.getTime.mockImplementation(() => 2);
      t1.getQuestionType.mockImplementation(() => 'q1');
      t2.getTime.mockImplementation(() => 1);
      t2.getQuestionType.mockImplementation(() => 'q2');
      expect(comp.compare(t1, t2)).toBeLessThan(0);

      t1.getTime.mockImplementation(() => 2);
      t1.getQuestionType.mockImplementation(() => 'q2');
      t2.getTime.mockImplementation(() => 1);
      t2.getQuestionType.mockImplementation(() => 'q3');
      expect(comp.compare(t1, t2)).toBeGreaterThan(0);
    });
    it('p1 and p2 have same values', () => {
      t1.getTime.mockImplementation(() => 1);
      t1.getQuestionType.mockImplementation(() => 'q2');
      t2.getTime.mockImplementation(() => 2);
      t2.getQuestionType.mockImplementation(() => 'q2');
      expect(comp.compare(t1, t2)).toBeLessThan(0);
    });
  });
});
