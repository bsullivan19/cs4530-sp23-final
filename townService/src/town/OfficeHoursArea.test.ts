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
  TAInfo,
  TAModel,
} from '../types/CoveyTownSocket';
import OfficeHoursArea from './OfficeHoursArea';
import TA from '../lib/TA';
import Question from '../lib/Question';

describe('OfficeHoursArea', () => {
  const testAreaBox = { x: 100, y: 100, width: 100, height: 100 };
  let testArea: OfficeHoursArea;
  let testArea2: OfficeHoursArea;
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
    testArea2 = new OfficeHoursArea(
      {
        id: nanoid(),
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

  it('addBreakoutRoom adds rooms to the map correctly', () => {
    testArea.addBreakoutRoom('1');
    testArea.addBreakoutRoom('3');
    testArea.addBreakoutRoom('2');
    expect(testArea.openBreakoutRooms.size).toEqual(3);
    expect(testArea.openBreakoutRooms.get('1')).toEqual(undefined);
    expect(testArea.openBreakoutRooms.get('2')).toEqual(undefined);
    expect(testArea.openBreakoutRooms.get('3')).toEqual(undefined);
  });
  it('toQueueModel', () => {
    const q1: OfficeHoursQuestion = {
      id: nanoid(),
      officeHoursID: testArea.id,
      questionContent: nanoid(),
      students: [newPlayer.id],
      groupQuestion: true,
      timeAsked: 42,
      questionType: nanoid(),
    };
    testArea.addUpdateQuestion(q1);
    const ohQueue: OfficeHoursQueue = { officeHoursID: testArea.id, questionQueue: [q1] };
    expect(testArea.toQueueModel()).toEqual(ohQueue);
  });
  it('[OMG2 toModel] toModel returns the ID, officeHoursActive, and TAs by ID', () => {
    const model = testArea.toModel();
    expect(model).toEqual({
      id,
      officeHoursActive: true,
      teachingAssistantsByID: [newPlayer.id],
      questionTypes: ['Other'],
      taInfos: [{ isSorted: false, priorities: [], taID: newPlayer.id }],
    } as OfficeHoursModel);
  });
  it('[OMG2 updateModel] updateModel sets the ID and TAs by ID and reruns emit area changed', () => {
    const newId = nanoid();
    const newTasByID = ['ta1', 'ta2'];
    const newTasInfo: TAInfo[] = [{ isSorted: false, priorities: [], taID: newTasByID[0] }];
    testArea.updateModel({
      id: newId,
      officeHoursActive: false,
      teachingAssistantsByID: newTasByID,
      taInfos: newTasInfo,
      questionTypes: ['hw1'],
    } as OfficeHoursModel);
    const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
    expect(testArea.id).toBe(id);
    expect(testArea.officeHoursActive).toBe(true);
    expect(testArea.teachingAssistantsByID).toBe(newTasByID);
    expect(testArea.taInfos).toBe(newTasInfo);
  });
  describe('add', () => {
    it('Adds the player to the occupants list', () => {
      expect(testArea.occupantsByID).toEqual([newPlayer.id]);
    });
    it("Sets the player's interactableID and emits an update for their location", () => {
      expect(newPlayer.location.interactableID).toEqual(testArea.id);

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
    it('Does not clear the question queue if all players leave', () => {
      const q1: OfficeHoursQuestion = {
        id: nanoid(),
        officeHoursID: testArea.id,
        questionContent: nanoid(),
        students: [newPlayer.id],
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
        groupQuestion: true,
        timeAsked: 32,
        questionType: nanoid(),
      };
      const q2: OfficeHoursQuestion = {
        id: nanoid(),
        officeHoursID: testArea.id,
        questionContent: nanoid(),
        students: [newPlayer.id],
        groupQuestion: true,
        timeAsked: 5,
        questionType: nanoid(),
      };
      const q3: OfficeHoursQuestion = {
        id: nanoid(),
        officeHoursID: testArea.id,
        questionContent: nanoid(),
        students: [newPlayer.id],
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
          nanoid(),
          10,
        );
        testArea.addUpdateQuestion(updatedQuestion.toModel());
        expect(testArea.getQuestion(question.id)).toBeUndefined();
      });
    });
  });

  describe('multiple questions and breakout rooms', () => {
    let q1: Question;
    let q2: Question;
    let q3: Question;
    let br1: string;
    let br2: string;
    let ta1: TA;
    let ta2: TA;
    let student2: Player;
    let student3: Player;
    beforeEach(() => {
      student2 = new Player(nanoid(), townEmitter);
      student3 = new Player(nanoid(), townEmitter);
      q1 = new Question(nanoid(), testArea.id, [newStudent.id], nanoid(), false, nanoid(), 1);
      q2 = new Question(
        nanoid(),
        testArea.id,
        [newStudent.id, student2.id],
        nanoid(),
        true,
        nanoid(),
        1,
      );
      q3 = new Question(nanoid(), testArea.id, [student3.id], nanoid(), false, nanoid(), 1);
      br1 = nanoid();
      br2 = nanoid();
      ta1 = new TA(nanoid(), townEmitter);
      ta2 = new TA(nanoid(), townEmitter);
      testArea.addUpdateQuestion(q1.toModel());
      testArea.addUpdateQuestion(q2.toModel());
      testArea.addUpdateQuestion(q3.toModel());
      testArea.addBreakoutRoom(br1);
      testArea.addBreakoutRoom(br2);
    });
    describe('stopOfficeHours', () => {
      beforeEach(() => {
        testArea.takeQuestions(ta1, [q1.id]);
      });
      it('Throws an error if ta does not have breakoutroom id', () => {
        expect(() => testArea.stopOfficeHours(newPlayer)).toThrowError();
      });
      describe('multiple questions and breakout rooms', () => {
        it('Throws an error if the breakout room and ta br room do not match', () => {
          ta1.breakoutRoomID = nanoid();
          expect(() => testArea.stopOfficeHours(newPlayer)).toThrowError();
        });
        it('Works to stop the office hours session of a ta ', () => {
          testArea.takeQuestions(ta2, [q3.id, q2.id]);
          expect(ta2.breakoutRoomID).toEqual(br2);

          testArea.stopOfficeHours(ta2);
          expect(testArea.openBreakoutRooms.get(br2)).toBeUndefined();
          expect(ta2.breakoutRoomID).toBeUndefined();
          expect(ta2.breakoutRoomID).toBeUndefined();
          expect(ta2.location.interactableID).toEqual(testArea.id);
          expect(ta2.location.x).toEqual(150);
          expect(ta2.location.y).toEqual(150);
          expect(ta2.currentQuestions).toEqual([]);
          const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'officeHoursQuestionTaken');
          const model = ta2.toModel();
          model.questions = [q3.toModel(), q2.toModel()];
          expect(lastEmittedUpdate).toEqual(model);
        });
      });
    });

    describe('takeQuestions', () => {
      it('Throws there are no open breakout rooms', () => {
        q1 = new Question(nanoid(), testArea2.id, [newStudent.id], nanoid(), false, nanoid(), 1);
        testArea2.addUpdateQuestion(q1.toModel());
        expect(() => testArea2.takeQuestions(ta1, [q1.id])).toThrowError('No open breakout rooms');
      });
      it('Throws there are no questions in the queue', () => {
        q1 = new Question(nanoid(), testArea2.id, [newStudent.id], nanoid(), false, nanoid(), 1);
        testArea2.addBreakoutRoom(br1);
        expect(() => testArea2.takeQuestions(ta1, [q1.id])).toThrowError('Questions not available');
      });
      it('Does not remove any questions if even one question does not exist', () => {
        expect(() => testArea.takeQuestions(ta1, [q1.id, nanoid()])).toThrowError();
        expect(testArea.questionQueue).toEqual([q1, q2, q3]);
      });
      describe('Initialized with breakout rooms and questions', () => {
        it('Properly assigns the TA to a single question and breakout room', () => {
          testArea.takeQuestions(ta1, [q1.id]);
          expect(ta1.currentQuestions).toEqual([q1]);
          expect(ta1.officeHoursID).toEqual(testArea.id);
          expect(ta1.officeHoursID).toEqual(q1.officeHoursID);
          expect(ta1.breakoutRoomID).toEqual(br1);
          expect(testArea.openBreakoutRooms.get(br1)).toEqual(ta1.id);
          const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'officeHoursQueueUpdate');
          expect(lastEmittedUpdate).toEqual({
            officeHoursID: ta1.officeHoursID,
            questionQueue: [q2.toModel(), q3.toModel()],
          } as OfficeHoursQueue);
        });
        it('Properly assigns the TA to a multiple questions in the second breakout room', () => {
          testArea.takeQuestions(ta2, [q2.id]);
          testArea.takeQuestions(ta1, [q1.id, q3.id]);
          expect(ta1.currentQuestions).toEqual([q1, q3]);
          expect(ta1.officeHoursID).toEqual(testArea.id);
          expect(ta1.officeHoursID).toEqual(q1.officeHoursID);
          expect(ta1.officeHoursID).toEqual(q3.officeHoursID);
          expect(ta1.breakoutRoomID).toEqual(br2);
          expect(testArea.openBreakoutRooms.get(br2)).toEqual(ta1.id);
          const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'officeHoursQueueUpdate');
          expect(lastEmittedUpdate).toEqual({
            officeHoursID: ta1.officeHoursID,
            questionQueue: [],
          } as OfficeHoursQueue);
        });
      });
    });

    describe('removeQuestion', () => {
      it('removes the question properly if a ta and question is in area', () => {
        const q4 = new Question(
          nanoid(),
          testArea.id,
          [newStudent.id],
          nanoid(),
          false,
          nanoid(),
          1,
        );
        testArea.addUpdateQuestion(q4.toModel());
        expect(testArea.questionQueue.length).toEqual(4);
        expect(testArea.getQuestion(q4.id)).toEqual(q4);
        const question = testArea.removeQuestion(ta1, q4.id);
        expect(question).toEqual(q4);
        expect(testArea.questionQueue.length).toEqual(3);
        expect(testArea.getQuestion(q4.id)).toBeUndefined();
        const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'officeHoursQueueUpdate');
        expect(lastEmittedUpdate).toEqual({
          officeHoursID: testArea.id,
          questionQueue: [q1.toModel(), q2.toModel(), q3.toModel()],
        } as OfficeHoursQueue);
      });
      it('Does not remove the question if not a TA but does return it', () => {
        const q4 = new Question(
          nanoid(),
          testArea.id,
          [newStudent.id],
          nanoid(),
          false,
          nanoid(),
          1,
        );
        testArea.addUpdateQuestion(q4.toModel());
        expect(testArea.questionQueue.length).toEqual(4);
        expect(testArea.getQuestion(q4.id)).toEqual(q4);
        const question = testArea.removeQuestion(newStudent, q4.id);
        expect(question).toEqual(q4);
        expect(testArea.questionQueue.length).toEqual(4);
        expect(testArea.getQuestion(q4.id)).toEqual(q4);
      });
      it('Does nothing and returns undfined if question does not exist', () => {
        const q4 = new Question(
          nanoid(),
          testArea.id,
          [newStudent.id],
          nanoid(),
          false,
          nanoid(),
          1,
        );
        expect(testArea.questionQueue.length).toEqual(3);
        const question = testArea.removeQuestion(ta1, q4.id);
        expect(question).toBeUndefined();
        expect(testArea.questionQueue.length).toEqual(3);
      });
    });

    describe('removeQuestionForPlayer', () => {
      it('removes the student from the question but does not delete if students left in question', () => {
        expect(testArea.getQuestion(q2.id)).toEqual(q2);
        expect(testArea.getQuestion(q2.id)?.studentsByID).toEqual([newStudent.id, student2.id]);
        testArea.removeQuestionForPlayer(student2);

        const q2Updated = new Question(
          q2.id,
          q2.officeHoursID,
          [newStudent.id],
          q2.questionContent,
          q2.isGroup,
          q2.questionType,
          q2.timeAsked,
        );
        expect(testArea.getQuestion(q2.id)).toEqual(q2Updated);
        expect(testArea.getQuestion(q2.id)?.studentsByID).toEqual([newStudent.id]);
        expect(testArea.questionQueue.length).toEqual(3);
        const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'officeHoursQueueUpdate');
        expect(lastEmittedUpdate).toEqual({
          officeHoursID: testArea.id,
          questionQueue: [q1.toModel(), q2Updated.toModel(), q3.toModel()],
        } as OfficeHoursQueue);
      });
      it('removes the student from the question and deletes if no more students', () => {
        expect(testArea.getQuestion(q3.id)?.studentsByID).toEqual([student3.id]);
        testArea.removeQuestionForPlayer(student3);

        expect(testArea.getQuestion(q3.id)).toBeUndefined();
        expect(testArea.questionQueue.length).toEqual(2);
        const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'officeHoursQueueUpdate');
        expect(lastEmittedUpdate).toEqual({
          officeHoursID: testArea.id,
          questionQueue: [q1.toModel(), q2.toModel()],
        } as OfficeHoursQueue);
      });
      it('Does nothing if player not in question', () => {
        const student5 = new Player(nanoid(), townEmitter);
        expect(testArea.questionQueue.length).toEqual(3);
        testArea.removeQuestionForPlayer(student5);
        expect(testArea.questionQueue.length).toEqual(3);
      });
    });

    describe('removePlayerData', () => {
      it('removes the student from the question but does not delete if students left in question', () => {
        expect(testArea.getQuestion(q2.id)).toEqual(q2);
        expect(testArea.getQuestion(q2.id)?.studentsByID).toEqual([newStudent.id, student2.id]);
        testArea.removePlayerData(student2);

        const q2Updated = new Question(
          q2.id,
          q2.officeHoursID,
          [newStudent.id],
          q2.questionContent,
          q2.isGroup,
          q2.questionType,
          q2.timeAsked,
        );
        expect(testArea.getQuestion(q2.id)).toEqual(q2Updated);
        expect(testArea.getQuestion(q2.id)?.studentsByID).toEqual([newStudent.id]);
        expect(testArea.questionQueue.length).toEqual(3);
        const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'officeHoursQueueUpdate');
        expect(lastEmittedUpdate).toEqual({
          officeHoursID: testArea.id,
          questionQueue: [q1.toModel(), q2Updated.toModel(), q3.toModel()],
        } as OfficeHoursQueue);
      });
      it('removes the student from the question and deletes if no more students', () => {
        expect(testArea.getQuestion(q3.id)?.studentsByID).toEqual([student3.id]);
        testArea.removePlayerData(student3);

        expect(testArea.getQuestion(q3.id)).toBeUndefined();
        expect(testArea.questionQueue.length).toEqual(2);
        const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'officeHoursQueueUpdate');
        expect(lastEmittedUpdate).toEqual({
          officeHoursID: testArea.id,
          questionQueue: [q1.toModel(), q2.toModel()],
        } as OfficeHoursQueue);
      });
      it('Does nothing if player not in question', () => {
        const student5 = new Player(nanoid(), townEmitter);
        expect(testArea.questionQueue.length).toEqual(3);
        testArea.removePlayerData(student5);
        expect(testArea.questionQueue.length).toEqual(3);
      });
      it('removes TAInfo and breakout room assignment if TA', () => {
        testArea.add(ta1);
        testArea.takeQuestions(ta1, [q1.id]);
        expect(testArea.openBreakoutRooms.get(br1)).toEqual(ta1.id);
        expect(testArea.taInfos.length).toEqual(2);
        expect(testArea.taInfos.find(info => info.taID === ta1.id)).toEqual({
          taID: ta1.id,
          isSorted: false,
          priorities: [],
        });

        testArea.removePlayerData(ta1);
        expect(testArea.openBreakoutRooms.get(br1)).toBeUndefined();
        expect(testArea.taInfos.length).toEqual(1);
        expect(testArea.taInfos.find(info => info.taID === ta1.id)).toBeUndefined();
      });
    });
  });

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
