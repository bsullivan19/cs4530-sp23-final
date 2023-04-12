import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { PlayerLocation } from '../types/CoveyTownSocket';
import BreakoutRoomAreaController, { BreakoutRoomAreaEvents } from './BreakoutRoomAreaController';
import PlayerController from './PlayerController';
import { BreakoutRoomArea as BreakoutRoomAreaModel } from '../types/CoveyTownSocket';

describe('[T2] BreakoutRoomAreaController', () => {
  // A valid BreakoutRoomAreaController to be reused within the tests
  let testArea: BreakoutRoomAreaController;
  const mockListeners = mock<BreakoutRoomAreaEvents>();
  const playerLocation: PlayerLocation = {
    moving: false,
    x: 0,
    y: 0,
    rotation: 'front',
  };
  beforeEach(() => {
    testArea = new BreakoutRoomAreaController(nanoid(), nanoid(), nanoid());
    testArea.students = [
      new PlayerController(nanoid(), nanoid(), playerLocation),
      new PlayerController(nanoid(), nanoid(), playerLocation),
      new PlayerController(nanoid(), nanoid(), playerLocation),
    ];
    testArea.teachingAssistant = new PlayerController(nanoid(), nanoid(), playerLocation);
    testArea.timeLeft = 0;
    mockClear(mockListeners.breakoutRoomTopicChange);
    mockClear(mockListeners.breakoutRoomStudentsChange);
    mockClear(mockListeners.breakoutRoomTAChange);
    mockClear(mockListeners.newTimeLeft);
    testArea.addListener('breakoutRoomTopicChange', mockListeners.breakoutRoomTopicChange);
    testArea.addListener('breakoutRoomStudentsChange', mockListeners.breakoutRoomStudentsChange);
    testArea.addListener('breakoutRoomTAChange', mockListeners.breakoutRoomTAChange);
    testArea.addListener('newTimeLeft', mockListeners.newTimeLeft);
  });

  describe('setting the topic property', () => {
    it('does not update the property if the topic is the same string', () => {
      const topicCopy = `${testArea.topic}`;
      testArea.topic = topicCopy;
      expect(mockListeners.breakoutRoomTopicChange).not.toBeCalled();
    });
    it('emits the breakoutRoomTopicChange event when setting the property and updates the model', () => {
      const newTopic = nanoid();
      testArea.topic = newTopic;
      expect(mockListeners.breakoutRoomTopicChange).toBeCalledWith(newTopic);
      expect(testArea.topic).toEqual(newTopic);
      expect(testArea.toModel()).toEqual({
        id: testArea.id,
        topic: newTopic,
        teachingAssistantID: testArea.teachingAssistant?.id,
        studentsByID: testArea.students.map(eachStudant => eachStudant.id),
        linkedOfficeHoursID: testArea.officeHoursAreaID,
        timeLeft: testArea.timeLeft,
      });
    });
  });

  describe('setting the timeLeft property', () => {
    it('emits the newTimeLeft event when setting the property and updates the model', () => {
      const newTimeLeft = 5;
      testArea.timeLeft = newTimeLeft;
      expect(mockListeners.newTimeLeft).toBeCalledWith(newTimeLeft);
      expect(testArea.timeLeft).toEqual(newTimeLeft);
      expect(testArea.toModel()).toEqual({
        id: testArea.id,
        topic: testArea.topic,
        teachingAssistantID: testArea.teachingAssistant?.id,
        studentsByID: testArea.students.map(eachStudant => eachStudant.id),
        linkedOfficeHoursID: testArea.officeHoursAreaID,
        timeLeft: newTimeLeft,
      });
    });
  });

  describe('setting the teachingAssistant property', () => {
    it('does not update the property if the teachingAssistant is the same string', () => {
      const taCopy = `${testArea.teachingAssistant}`;
      testArea.topic = taCopy;
      expect(mockListeners.breakoutRoomTAChange).not.toBeCalled();
    });
    it('emits the breakoutRoomTAChange event when setting the property and updates the model', () => {
      const newTA = new PlayerController(nanoid(), nanoid(), playerLocation);
      testArea.teachingAssistant = newTA;
      expect(mockListeners.breakoutRoomTAChange).toBeCalledWith(newTA);
      expect(testArea.teachingAssistant).toEqual(newTA);
      expect(testArea.toModel()).toEqual({
        id: testArea.id,
        topic: testArea.topic,
        teachingAssistantID: newTA.id,
        studentsByID: testArea.students.map(eachStudant => eachStudant.id),
        linkedOfficeHoursID: testArea.officeHoursAreaID,
        timeLeft: testArea.timeLeft,
      });
    });
  });

  describe('setting the students property', () => {
    it('updates the property but does not emit the breakoutRoomStudentsChange event when the new students are the same set as the old', () => {
      const studentsCopy = testArea.students.concat([]);
      const shuffledStudents = studentsCopy.reverse();
      testArea.students = shuffledStudents;
      expect(testArea.students).toEqual(shuffledStudents);
      expect(mockListeners.breakoutRoomStudentsChange).not.toBeCalled();
    });
    it('emits the breakoutRoomStudentsChange event when setting the property and updates the model', () => {
      const newStudents = testArea.students.slice(1);
      testArea.students = newStudents;
      expect(testArea.students).toEqual(newStudents);
      expect(mockListeners.breakoutRoomStudentsChange).toBeCalledWith(newStudents);
      expect(testArea.toModel()).toEqual({
        id: testArea.id,
        topic: testArea.topic,
        teachingAssistantID: testArea.teachingAssistant?.id,
        studentsByID: testArea.students.map(eachStudent => eachStudent.id),
        linkedOfficeHoursID: testArea.officeHoursAreaID,
        timeLeft: testArea.timeLeft,
      });
    });
  });

  describe('updateFrom', () => {
    it('Updates the title, imageContents and stars properties', () => {
      const newModel: BreakoutRoomAreaModel = {
        id: testArea.id,
        topic: nanoid(),
        teachingAssistantID: testArea.teachingAssistant?.id,
        studentsByID: testArea.students.map(eachStudent => eachStudent.id),
        linkedOfficeHoursID: testArea.officeHoursAreaID,
        timeLeft: testArea.timeLeft,
      };
      const newTA = new PlayerController(nanoid(), nanoid(), playerLocation);
      const newStudents = testArea.students.slice(1);
      testArea.updateFrom(newModel, newStudents, newTA);
      expect(testArea.topic).toEqual(newModel.topic);
      expect(testArea.teachingAssistant).toEqual(newTA);
      expect(testArea.students).toEqual(newStudents);
      expect(mockListeners.breakoutRoomTopicChange).toBeCalledWith(newModel.topic);
      expect(mockListeners.breakoutRoomStudentsChange).toBeCalledWith(newStudents);
      expect(mockListeners.breakoutRoomTAChange).toBeCalledWith(newTA);
    });
    it('Does not update the id property', () => {
      const existingID = testArea.id;
      const newModel: BreakoutRoomAreaModel = {
        id: nanoid(),
        topic: nanoid(),
        teachingAssistantID: testArea.teachingAssistant?.id,
        studentsByID: testArea.students.map(eachStudent => eachStudent.id),
        linkedOfficeHoursID: testArea.officeHoursAreaID,
        timeLeft: testArea.timeLeft,
      };
      const newTA = new PlayerController(nanoid(), nanoid(), playerLocation);
      const newStudents = testArea.students.slice(1);
      testArea.updateFrom(newModel, newStudents, newTA);
      expect(testArea.id).toEqual(existingID);
    });
  });
});
