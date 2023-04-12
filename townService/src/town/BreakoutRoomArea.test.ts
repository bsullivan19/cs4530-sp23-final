import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { ITiledMap, ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import Player from '../lib/Player';
import { getLastEmittedEvent } from '../TestUtils';
import { BreakoutRoomArea as BreakoutRoomAreaModel, TownEmitter } from '../types/CoveyTownSocket';
import BreakoutRoomArea from './BreakoutRoomArea';

describe('BreakoutRoomArea', () => {
  const testAreaBox = { x: 100, y: 100, width: 100, height: 100 };
  let testArea: BreakoutRoomArea;
  const townEmitter = mock<TownEmitter>();
  const topic = nanoid();
  const id = nanoid();
  let newPlayer: Player;

  beforeEach(() => {
    mockClear(townEmitter);
    testArea = new BreakoutRoomArea(
      { id, topic, studentsByID: [], linkedOfficeHoursID: '2', timeLeft: undefined },
      testAreaBox,
      townEmitter,
    );
    newPlayer = new Player(nanoid(), mock<TownEmitter>());
    testArea.add(newPlayer);
  });
  describe('remove', () => {
    it('Removes the player from the list of occupants and emits an interactableUpdate event', () => {
      // Add another player so that we are not also testing what happens when the last player leaves
      const extraPlayer = new Player(nanoid(), mock<TownEmitter>());
      testArea.add(extraPlayer);
      testArea.remove(newPlayer);

      expect(testArea.occupantsByID).toEqual([extraPlayer.id]);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({ id, topic, studentsByID: [], linkedOfficeHoursID: '2' });
    });
    it("Clears the player's conversationLabel and emits an update for their location", () => {
      testArea.remove(newPlayer);
      expect(newPlayer.location.interactableID).toBeUndefined();
      const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
      expect(lastEmittedMovement.location.interactableID).toBeUndefined();
    });
    it('Clears the topic of the conversation area when the last occupant leaves', () => {
      testArea.remove(newPlayer);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({ id, topic, studentsByID: [], linkedOfficeHoursID: '2' });
      expect(testArea.topic).toEqual(topic);
    });
  });
  it('toModel sets the ID, topic and occupantsByID and sets no other properties', () => {
    const model = testArea.toModel();
    expect(model).toEqual({
      id,
      topic,
      teachingAssisstantID: undefined,
      studentsByID: [],
      linkedOfficeHoursID: '2',
      timeLeft: undefined,
    } as BreakoutRoomAreaModel);
  });
  describe('fromMapObject', () => {
    it('Throws an error if the width or height are missing', () => {
      expect(() =>
        BreakoutRoomArea.fromMapObject(
          { id: 1, name: nanoid(), visible: true, x: 0, y: 0 },
          townEmitter,
        ),
      ).toThrowError();
    });
    it('Creates a new conversation area using the provided boundingBox and id, with an empty occupants list, and correct office hours link', () => {
      const x = 30;
      const y = 20;
      const width = 10;
      const height = 20;
      const name = 'name';
      const linkedOfficeHours = nanoid();
      const map: ITiledMapObject = {
        x,
        y,
        width,
        height,
        name,
        id: 10,
        visible: true,
      };
      map.properties = [
        {
          value: linkedOfficeHours,
          propertytype: nanoid(),
          type: 'string',
          name: 'linkedOfficeHoursID',
        },
      ];
      const val = BreakoutRoomArea.fromMapObject(map, townEmitter);
      expect(val.boundingBox).toEqual({ x, y, width, height });
      expect(val.id).toEqual(name);
      expect(val.topic).toBeUndefined();
      expect(val.occupantsByID).toEqual([]);
      expect(val.studentsByID).toEqual([]);
      expect(val.teachingAssistant).toEqual(undefined);
      expect(val.linkedOfficeHoursID).toEqual(linkedOfficeHours);
    });
  });
});
