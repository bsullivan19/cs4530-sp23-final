import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { PlayerLocation } from '../types/CoveyTownSocket';
import BreakoutRoomAreaController, { BreakoutRoomAreaEvents } from './BreakoutRoomAreaController';
import PlayerController from './PlayerController';

describe('[T2] BreakoutRoomAreaController', () => {
  // A valid BreakoutRoomAreaController to be reused within the tests
  let testArea: BreakoutRoomAreaController;
  const mockListeners = mock<BreakoutRoomAreaEvents>();
  beforeEach(() => {
    const playerLocation: PlayerLocation = {
      moving: false,
      x: 0,
      y: 0,
      rotation: 'front',
    };
    testArea = new BreakoutRoomAreaController(nanoid(), nanoid(), nanoid());
    testArea.students = [
      new PlayerController(nanoid(), nanoid(), playerLocation),
      new PlayerController(nanoid(), nanoid(), playerLocation),
      new PlayerController(nanoid(), nanoid(), playerLocation),
    ];
    testArea.teachingAssistant = new PlayerController(nanoid(), nanoid(), playerLocation);
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
});
