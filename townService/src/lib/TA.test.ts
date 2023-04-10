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
    let questionSample: Question;
    let taModelNoQ: TAModel;
    beforeEach(() => {
      questionSample = new Question(
        nanoid(),
        nanoid(),
        [newPlayer.id],
        nanoid(),
        false,
        false,
        nanoid(),
        0,
      );
      taModel = {
        id: newTA.id,
        location: newTA.location,
        userName: taUsername,
        questions: [questionSample.toModel()],
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
      newTA.currentQuestions = [questionSample];
      expect(newTA.toModel()).toEqual(taModel);
    });
  });
});
