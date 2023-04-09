import { EventEmitter } from 'events';
import { useEffect, useState } from 'react';
import TypedEventEmitter from 'typed-emitter';
import { BreakoutRoomArea as BreakoutRoomAreaModel } from '../types/CoveyTownSocket';
import PlayerController from './PlayerController';
import _ from 'lodash';

/**
 * The events an OfficeHoursAreaController can emit.
 */
export type BreakoutRoomAreaEvents = {
  /**
   * An officeHoursActiveChange event indicates that the active state has changed.
   * Listeners are passed the new active state.
   */
  breakoutRoomTopicChange: (newTopic: string | undefined) => void;

  /**
   * An officeHoursTAChange event indicates that the teaching assistants online has changed.
   * Listeners are passed the new list of teaching assistants by id.
   */
  breakoutRoomStudentsChange: (newStudentsByID: PlayerController[]) => void;

  breakoutRoomTAChange: (newTeachingAssistantID: PlayerController | undefined) => void;
};

export default class BreakoutRoomAreaController extends (EventEmitter as new () => TypedEventEmitter<BreakoutRoomAreaEvents>) {
  private readonly _id: string;

  private readonly _officeHoursAreaID: string;

  private _topic: string | undefined;

  private _teachingAssistant: PlayerController | undefined;

  private _students: PlayerController[] = [];

  /**
   * Constructs a new OfficeHoursAreaController, initialized with the state of the
   * provided officeHoursAreaModel.
   *
   * @param officeHoursAreaModel The poster session area model that this controller should represent
   */
  constructor(id: string, officeHoursAreaID: string, topic?: string) {
    super();
    this._id = id;
    this._officeHoursAreaID = officeHoursAreaID;
    this._topic = topic;
  }

  public get id() {
    return this._id;
  }

  public get topic(): string | undefined {
    return this._topic;
  }

  public set topic(newTopic: string | undefined) {
    if (this.topic !== newTopic) {
      this.emit('breakoutRoomTopicChange', newTopic);
    }
    this._topic = newTopic;
  }

  public get teachingAssistant(): PlayerController | undefined {
    return this._teachingAssistant;
  }

  public set teachingAssistant(newTeachingAssistant: PlayerController | undefined) {
    if (this.teachingAssistant !== newTeachingAssistant) {
      this.emit('breakoutRoomTAChange', newTeachingAssistant);
    }
    this._teachingAssistant = newTeachingAssistant;
  }

  public get students(): PlayerController[] {
    return this._students;
  }

  public set students(newStudents: PlayerController[]) {
    if (
      this.students.length !== newStudents.length ||
      _.xor(this.students, newStudents).length > 0
    ) {
      this.emit('breakoutRoomStudentsChange', newStudents);
    }
    this._students = newStudents;
  }

  public get officeHoursAreaID() {
    return this._officeHoursAreaID;
  }

  public toModel(): BreakoutRoomAreaModel {
    return {
      id: this.id,
      topic: this.topic,
      teachingAssistantID: this.teachingAssistant?.id,
      studentsByID: this.students.map(s => s.id),
      officeHoursAreaID: this.officeHoursAreaID,
    };
  }

  public updateFrom(
    breakoutRoomAreaModel: BreakoutRoomAreaModel,
    playerFinder: (playerIDs: string[]) => PlayerController[],
  ) {
    this.topic = breakoutRoomAreaModel.topic;
    if (breakoutRoomAreaModel.teachingAssistantID) {
      this.teachingAssistant = playerFinder([breakoutRoomAreaModel.teachingAssistantID])[0];
    } else {
      this.teachingAssistant = undefined;
    }
    this.students = playerFinder(breakoutRoomAreaModel.studentsByID);
  }

  public static fromBreakoutRoomAreaModel(
    breakoutRoomAreaModel: BreakoutRoomAreaModel,
    playerFinder: (playerIDs: string[]) => PlayerController[],
  ): BreakoutRoomAreaController {
    const ret = new BreakoutRoomAreaController(
      breakoutRoomAreaModel.id,
      breakoutRoomAreaModel.officeHoursAreaID,
      breakoutRoomAreaModel.topic,
    );
    if (breakoutRoomAreaModel.teachingAssistantID) {
      ret.teachingAssistant = playerFinder([breakoutRoomAreaModel.teachingAssistantID]).at(0);
    }
    ret.students = playerFinder(breakoutRoomAreaModel.studentsByID);
    return ret;
  }
}

export function useBreakoutRoomAreaTA(
  controller: BreakoutRoomAreaController,
): PlayerController | undefined {
  const [teachingAssistant, setTeachingAssistant] = useState(controller.teachingAssistant);
  useEffect(() => {
    controller.addListener('breakoutRoomTAChange', setTeachingAssistant);
    return () => {
      controller.removeListener('breakoutRoomTAChange', setTeachingAssistant);
    };
  }, [controller]);
  return teachingAssistant;
}

export function useBreakoutRoomAreaStudents(
  controller: BreakoutRoomAreaController,
): PlayerController[] {
  const [students, setStudents] = useState(controller.students);
  useEffect(() => {
    controller.addListener('breakoutRoomStudentsChange', setStudents);
    return () => {
      controller.removeListener('breakoutRoomStudentsChange', setStudents);
    };
  }, [controller]);
  return students;
}

export function useBreakoutRoomAreaTopic(
  controller: BreakoutRoomAreaController,
): string | undefined {
  const [topic, setTopic] = useState(controller.topic);
  useEffect(() => {
    controller.addListener('breakoutRoomTopicChange', setTopic);
    return () => {
      controller.removeListener('breakoutRoomTopicChange', setTopic);
    };
  }, [controller]);
  return topic;
}
