import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { TAModel, TownEmitter } from '../types/CoveyTownSocket';
import Player from './Player';
import Question from './Question';
import TA, { isTA } from './TA';

describe('TA', () => {
  const townEmitter = mock<TownEmitter>();
  let newPlayer: Player;
  const taUsername: string = nanoid();
  let newTA: TA;

  beforeEach(() => {
    mockClear(townEmitter);

    newPlayer = new Player(nanoid(), mock<TownEmitter>());
    newTA = new TA(taUsername, mock<TownEmitter>());
  });
  describe('isTA', () => {
    it('isTA returns false for a Player', () => {
      expect(isTA(newPlayer)).toBeFalsy();
    });
    it('isTA returns false for a Player', () => {
      expect(isTA(newTA)).toBeTruthy();
    });
  });
  describe('toModel', () => {
    let taModel: TAModel;
    const questionSample: Question = new Question(nanoid(), nanoid(), nanoid(), nanoid());
    let taModelNoQ: TAModel;
    beforeEach(() => {
      taModel = {
        id: newTA.id,
        userName: taUsername,
        location: newTA.location,
        question: questionSample.toModel(),
      };
      taModelNoQ = {
        id: newTA.id,
        userName: taUsername,
        location: newTA.location,
      };
    });
    it('toModel for a ta with no question', () => {
      expect(newTA.toModel()).toEqual(taModelNoQ);
    });
    it('toModel for a ta with a question', () => {
      newTA.currentQuestion = questionSample;
      expect(newTA.toModel()).toEqual(taModel);
    });
  });
});
