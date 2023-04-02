import { EventEmitter } from 'events';
import { useEffect, useState } from 'react';
import TypedEventEmitter from 'typed-emitter';
import {
  OfficeHoursArea as OfficeHoursAreaModel,
  OfficeHoursQueue,
  OfficeHoursQuestion,
} from '../types/CoveyTownSocket';

/**
 * The events an OfficeHoursAreaController can emit.
 */
export type OfficeHoursAreaEvents = {
  /**
   * An officeHoursActiveChange event indicates that the active state has changed.
   * Listeners are passed the new active state.
   */
  officeHoursActiveChange: (active: boolean) => void;

  /**
   * An officeHoursTAChange event indicates that the teaching assistants online has changed.
   * Listeners are passed the new list of teaching assistants by id.
   */
  officeHoursTAChange: (teachingAssistantsByID: string[]) => void;

  /**
   * An officeHoursQueueChange event indicates that the office hours question queue has changed.
   * Listeners are passed the new state of the queue.
   */
  officeHoursQueueChange: (questionQueue: OfficeHoursQuestion[]) => void;
};

export default class OfficeHoursAreaController extends (EventEmitter as new () => TypedEventEmitter<OfficeHoursAreaEvents>) {
  private _model: OfficeHoursAreaModel;

  private _queueModel: OfficeHoursQuestion[];

  /**
   * Constructs a new OfficeHoursAreaController, initialized with the state of the
   * provided officeHoursAreaModel.
   *
   * @param officeHoursAreaModel The poster session area model that this controller should represent
   */
  constructor(officeHoursAreaModel: OfficeHoursAreaModel, officeHoursQueue?: OfficeHoursQueue) {
    super();
    this._model = officeHoursAreaModel;
    this._queueModel = officeHoursQueue?.questionQueue || [];
  }

  public get id() {
    return this._model.id;
  }

  public get teachingAssistantsByID() {
    return this._model.teachingAssistantsByID;
  }

  public set teachingAssistantsByID(newTeachingAssistantsByID: string[]) {
    if (
      newTeachingAssistantsByID.length !== this.teachingAssistantsByID.length ||
      !newTeachingAssistantsByID.every(taID => this.teachingAssistantsByID.includes(taID))
    ) {
      this._model.teachingAssistantsByID = newTeachingAssistantsByID;
      this.emit('officeHoursTAChange', this.teachingAssistantsByID);
    }
  }

  public get isActive() {
    return this._model.officeHoursActive;
  }

  public set isActive(active: boolean) {
    if (this.isActive !== active) {
      this._model.officeHoursActive = active;
      this.emit('officeHoursActiveChange', this.isActive);
    }
  }

  public get questionQueue() {
    return this._queueModel;
  }

  public set questionQueue(questionQueue: OfficeHoursQuestion[]) {
    if (
      questionQueue.length !== this._queueModel.length ||
      !questionQueue.every((value, index) => value === this._queueModel[index])
    ) {
      this._queueModel = questionQueue;
      this.emit('officeHoursQueueChange', this._queueModel);
    }
  }

  public questionsAsked(studentID: string): number {
    return this.questionQueue.filter(q => q.students.includes(studentID)).length;
  }

  public officeHoursAreaModel(): OfficeHoursAreaModel {
    return this._model;
  }

  public updateModel(officeHoursAreaModel: OfficeHoursAreaModel) {
    this.isActive = officeHoursAreaModel.officeHoursActive;
  }
}

export function useActive(controller: OfficeHoursAreaController): boolean {
  const [isActive, setActive] = useState(controller.isActive);
  useEffect(() => {
    controller.addListener('officeHoursActiveChange', setActive);
    return () => {
      controller.removeListener('officeHoursActiveChange', setActive);
    };
  }, [controller]);
  return isActive;
}

export function useQueue(controller: OfficeHoursAreaController): OfficeHoursQuestion[] {
  const [queue, setQueue] = useState(controller.questionQueue);
  useEffect(() => {
    controller.addListener('officeHoursQueueChange', setQueue);
    return () => {
      controller.removeListener('officeHoursQueueChange', setQueue);
    };
  }, [controller]);
  return queue;
}

export function useTAsByID(controller: OfficeHoursAreaController): string[] {
  const [teachingAssistantsByID, setTAs] = useState(controller.teachingAssistantsByID);
  useEffect(() => {
    controller.addListener('officeHoursTAChange', setTAs);
    return () => {
      controller.removeListener('officeHoursTAChange', setTAs);
    };
  }, [controller]);
  return teachingAssistantsByID;
}
