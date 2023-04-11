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

  timerChange: (x: undefined | number) => void;
};

export default class BreakoutRoomAreaController extends (EventEmitter as new () => TypedEventEmitter<BreakoutRoomAreaEvents>) {
  private readonly _id: string;

  private readonly _officeHoursAreaID: string;

  private _topic: string | undefined;

  private _teachingAssistant: PlayerController | undefined;

  private _students: PlayerController[] = [];

  private _timeLeft: undefined | number = undefined;

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

  public get timeLeft() {
    return this._timeLeft;
  }

  public set timeLeft(x: undefined | number) {
    this._timeLeft = x;
    this.emit('timerChange', x);
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
      linkedOfficeHoursID: this.officeHoursAreaID,
      timeLeft: this.timeLeft,
    };
  }

  public updateFrom(
    breakoutRoomAreaModel: BreakoutRoomAreaModel,
    studentControllers: PlayerController[],
    taController: PlayerController | undefined,
  ) {
    this.topic = breakoutRoomAreaModel.topic;
    this.teachingAssistant = taController;
    this.students = studentControllers;
  }

  public static fromBreakoutRoomAreaModel(
    breakoutRoomAreaModel: BreakoutRoomAreaModel,
    studentControllers: PlayerController[],
    taController: PlayerController | undefined,
  ): BreakoutRoomAreaController {
    const ret = new BreakoutRoomAreaController(
      breakoutRoomAreaModel.id,
      breakoutRoomAreaModel.linkedOfficeHoursID,
      breakoutRoomAreaModel.topic,
    );
    ret.teachingAssistant = taController;
    ret.students = studentControllers;
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

export function useBreakOutRoomTimeLeft(
  controller: BreakoutRoomAreaController,
): undefined | number {
  const [timeLeft, setTimeLeft] = useState(controller.timeLeft);
  useEffect(() => {
    controller.addListener('timerChange', setTimeLeft);
    return () => {
      controller.removeListener('timerChange', setTimeLeft);
    };
  }, [controller]);
  return timeLeft;
}
