import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { readFileSync } from 'fs';
import Player from '../lib/Player';
import { getLastEmittedEvent } from '../TestUtils';
import {
  OfficeHoursQuestion,
  OfficeHoursQueue,
  TownEmitter,
  OfficeHoursArea as OfficeHoursModel,
} from '../types/CoveyTownSocket';
import OfficeHoursArea from './OfficeHoursArea';
import TA from '../lib/TA';
import Question from '../lib/Question';

describe('OfficeHoursArea', () => {
  const testAreaBox = { x: 100, y: 100, width: 100, height: 100 };
  let testArea: OfficeHoursArea;
  const townEmitter = mock<TownEmitter>();
  let newPlayer: TA;
  let newStudent: Player;
  const id = nanoid();

  beforeEach(() => {
    mockClear(townEmitter);
    testArea = new OfficeHoursArea(
      {
        id,
        officeHoursActive: false,
        teachingAssistantsByID: [],
        questionTypes: [],
        taInfos: [],
      },
      testAreaBox,
      townEmitter,
    );
    newPlayer = new TA(nanoid(), mock<TownEmitter>());
    newStudent = new Player(nanoid(), mock<TownEmitter>());
    testArea.add(newPlayer);
  });

  describe('addBreakoutRoom', () => {}); // TODO
  describe('toQueueModel', () => {}); // TODO
  test('[OMG2 toModel] toModel sets the ID, officeHoursActive, and TAs by ID', () => {
    const model = testArea.toModel();
    expect(model).toEqual({
      id,
      officeHoursActive: true,
      teachingAssistantsByID: [newPlayer.id],
      questionTypes: ['Other'],
      taInfos: [{ isSorted: false, priorities: [], taID: newPlayer.id }],
    } as OfficeHoursModel);
  });
  // test('[OMG2 updateModel] updateModel sets stars, title, and imageContents', () => {
  //   const newId = nanoid();
  //   const newTasByID = ['ta1', 'ta2'];
  //   testArea.updateModel({
  //     id: newId,
  //     officeHoursActive: false,
  //     teachingAssistantsByID: newTasByID,
  //   } as OfficeHoursModel);
  //   expect(testArea.id).toBe(id);
  //   expect(testArea.officeHoursActive).toBe(true);
  //   expect(testArea.teachingAssistantsByID).toBe(newTasByID);
  // });
  describe('add', () => {
    it('Adds the player to the occupants list', () => {
      expect(testArea.occupantsByID).toEqual([newPlayer.id]);
    });
    it("Sets the player's interactableID and emits an update for their location", () => {
      expect(newPlayer.location.interactableID).toEqual(id);

      const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
      expect(lastEmittedMovement.location.interactableID).toEqual(id);
    });
    it('Adds the player to the TA list if a TA', () => {
      expect(testArea.teachingAssistantsByID).toEqual([newPlayer.id]);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        id,
        officeHoursActive: true,
        teachingAssistantsByID: [newPlayer.id],
        questionTypes: ['Other'],
        taInfos: [{ isSorted: false, priorities: [], taID: newPlayer.id }],
      } as OfficeHoursModel);
    });
    it('Does not add the player to the TA list if not a TA', () => {
      const extraPlayer = new Player(nanoid(), mock<TownEmitter>());
      testArea.add(extraPlayer);
      expect(testArea.teachingAssistantsByID).toEqual([newPlayer.id]);
    });
  });
  describe('[OMG2 remove]', () => {
    it('Removes the player from the list of occupants and emits an interactableUpdate event', () => {
      // Add another player so that we are not also testing what happens when the last player leaves
      const extraPlayer = new TA(nanoid(), mock<TownEmitter>());
      testArea.add(extraPlayer);
      testArea.remove(newPlayer);

      expect(testArea.occupantsByID).toEqual([extraPlayer.id]);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        id,
        officeHoursActive: true,
        teachingAssistantsByID: [extraPlayer.id],
        questionTypes: ['Other'],
        taInfos: [
          { isSorted: false, priorities: [], taID: newPlayer.id },
          { isSorted: false, priorities: [], taID: extraPlayer.id },
        ],
      } as OfficeHoursModel);
    });
    it("Clears the player's interactableID and emits an update for their location", () => {
      testArea.remove(newPlayer);
      expect(newPlayer.location.interactableID).toBeUndefined();
      const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
      expect(lastEmittedMovement.location.interactableID).toBeUndefined();
    });
    // Room emitter issue?
    it('Does not clear the question queue if all players leave', () => {
      const q1: OfficeHoursQuestion = {
        id: nanoid(),
        officeHoursID: testArea.id,
        questionContent: nanoid(),
        students: [newPlayer.id],
        partOfGroupQuestion: false,
        groupQuestion: true,
        timeAsked: 42,
        questionType: nanoid(),
      };

      testArea.addUpdateQuestion(q1);
      testArea.remove(newPlayer);
      expect(testArea.questionQueue.length).toEqual(1);
      expect(testArea.questionQueue[0].toModel()).toEqual(q1);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'officeHoursQueueUpdate');
      expect(lastEmittedUpdate).toEqual({
        officeHoursID: testArea.id,
        questionQueue: [q1],
      } as OfficeHoursQueue);
      expect(testArea.questionQueue.length).toEqual(1);
      expect(testArea.questionQueue[0].toModel()).toEqual(q1);
    });
  });
  describe('getQuestion', () => {
    it('Gets the correct question', () => {
      const q1: OfficeHoursQuestion = {
        id: nanoid(),
        officeHoursID: testArea.id,
        questionContent: nanoid(),
        students: [newPlayer.id],
        partOfGroupQuestion: false,
        groupQuestion: true,
        timeAsked: 32,
        questionType: nanoid(),
      };
      const q2: OfficeHoursQuestion = {
        id: nanoid(),
        officeHoursID: testArea.id,
        questionContent: nanoid(),
        students: [newPlayer.id],
        partOfGroupQuestion: false,
        groupQuestion: true,
        timeAsked: 5,
        questionType: nanoid(),
      };
      const q3: OfficeHoursQuestion = {
        id: nanoid(),
        officeHoursID: testArea.id,
        questionContent: nanoid(),
        students: [newPlayer.id],
        partOfGroupQuestion: false,
        groupQuestion: true,
        timeAsked: 23,
        questionType: nanoid(),
      };
      testArea.addUpdateQuestion(q1);
      testArea.addUpdateQuestion(q2);
      testArea.addUpdateQuestion(q3);
      const qReturned = testArea.getQuestion(q2.id);
      expect(qReturned?.toModel()).toEqual(q2);
    });
  });
  describe('addUpdateQuestion', () => {
    it('Throws an error if the question has the wrong office hours id', () => {
      const question: Question = new Question(
        nanoid(),
        nanoid(),
        [newStudent.id],
        nanoid(),
        false,
        false,
        nanoid(),
        10,
      );
      expect(() => testArea.addUpdateQuestion(question.toModel())).toThrowError();
    });
    it('Adds the question if it does not exist in the queue', () => {
      const question: Question = new Question(
        nanoid(),
        testArea.id,
        [newStudent.id],
        nanoid(),
        false,
        false,
        nanoid(),
        10,
      );
      expect(testArea.getQuestion(question.id)).toBeUndefined();
      testArea.addUpdateQuestion(question.toModel());
      expect(testArea.getQuestion(question.id)).toEqual(question);
    });
    describe('Contains starting question', () => {
      let questionID: string;
      let content: string;
      let question: Question;
      let p2: Player;
      beforeEach(() => {
        questionID = nanoid();
        content = nanoid();
        question = new Question(
          questionID,
          testArea.id,
          [newStudent.id],
          content,
          false,
          false,
          nanoid(),
          10,
        );
        p2 = new Player(nanoid(), townEmitter);
        testArea.addUpdateQuestion(question.toModel());
      });
      it('Updates the question if it exists in the queue', () => {
        expect(testArea.getQuestion(question.id)).toEqual(question);
        const updatedQuestion: Question = new Question(
          questionID,
          testArea.id,
          [p2.id],
          content,
          false,
          false,
          nanoid(),
          question.timeAsked,
        );
        testArea.addUpdateQuestion(updatedQuestion.toModel());
        expect(testArea.getQuestion(question.id)).toEqual(updatedQuestion);
      });
      it('Removes the question if no students', () => {
        expect(testArea.getQuestion(question.id)).toEqual(question);
        const updatedQuestion: Question = new Question(
          questionID,
          testArea.id,
          [],
          content,
          false,
          false,
          nanoid(),
          10,
        );
        testArea.addUpdateQuestion(updatedQuestion.toModel());
        expect(testArea.getQuestion(question.id)).toBeUndefined();
      });
    });
  });
  // TODO test takeQuestions instead
  // describe('takeQuestion', () => {
  //   let q1: Question;
  //   let br1: string;
  //   let ta1: TA;
  //   beforeEach(() => {
  //     q1 = new Question(nanoid(), testArea.id, [newStudent.id], nanoid(), false);
  //     br1 = nanoid();
  //     ta1 = new TA(nanoid(), townEmitter);
  //   });
  //   it('Throws there are no open breakout rooms', () => {
  //     testArea.addUpdateQuestion(q1.toModel());
  //     expect(() => testArea.takeQuestion(ta1)).toThrowError('No open breakout rooms');
  //   });
  //   it('Throws there are no questions in the queue', () => {
  //     testArea.addBreakoutRoom(br1);
  //     expect(() => testArea.takeQuestion(ta1)).toThrowError('No questions available');
  //   });
  //   describe('Initialized with breakout rooms and questions', () => {
  //     beforeEach(() => {
  //       testArea.addUpdateQuestion(q1.toModel());
  //       testArea.addBreakoutRoom(br1);
  //     });
  //     it('Properly assigns the TA to a question and breakout room', () => {
  //       testArea.takeQuestion(ta1);
  //       expect(ta1.currentQuestion).toEqual(q1);
  //       expect(ta1.officeHoursID).toEqual(testArea.id);
  //       expect(ta1.officeHoursID).toEqual(q1.officeHoursID);
  //       expect(ta1.breakoutRoomID).toEqual(br1);
  //       expect(testArea.openBreakoutRooms.get(br1)).toEqual(ta1.id);
  //     });
  //   });
  // });

  describe('[OMG2 fromMapObject]', () => {
    it('Throws an error if the width or height are missing', () => {
      expect(() =>
        OfficeHoursArea.fromMapObject(
          { id: 1, name: nanoid(), visible: true, x: 0, y: 0 },
          townEmitter,
        ),
      ).toThrowError();
    });
    it('Creates a new poster session area using the provided boundingBox and id, with no TAs, and emitter', () => {
      const x = 30;
      const y = 20;
      const width = 10;
      const height = 20;
      const name = 'name';
      const val = OfficeHoursArea.fromMapObject(
        { x, y, width, height, name, id: 10, visible: true },
        townEmitter,
      );
      expect(val.boundingBox).toEqual({ x, y, width, height });
      expect(val.id).toEqual(name);
      expect(val.teachingAssistantsByID).toEqual([]);
      expect(val.occupantsByID).toEqual([]);
      expect(val.openBreakoutRooms).toEqual(new Map<string, string | undefined>());
    });
  });
});
