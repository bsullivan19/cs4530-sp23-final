import { EventEmitter } from 'events';
import { useEffect, useState } from 'react';
import TypedEventEmitter from 'typed-emitter';
import {
  OfficeHoursArea as OfficeHoursAreaModel,
  OfficeHoursQueue,
  OfficeHoursQuestion,
  TAInfo,
  Priority,
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

  questionTypesChange: (questionTypes: string[]) => void;

  isSortedChange: (isSorted: boolean) => void;

  prioritiesChange: (priorities: Map<string, number>) => void;
};

export function convertToMap(p: Priority[]): Map<string, number> {
  const mp = new Map<string, number>();
  for (let i = 0; i < p.length; i++) mp.set(p[i].key, p[i].value);
  return mp;
}

export function convertFromMap(mp: Map<string, number>) {
  const p: Priority[] = [];
  for (const [key, value] of mp) {
    const x: Priority = { key: key, value: value };
    p.push(x);
  }
  return p;
}

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

  public get taInfos() {
    return this._model.taInfos;
  }

  public set taInfos(taInfos: TAInfo[]) {
    this._model.taInfos = taInfos;
  }

  public get questionTypes() {
    return this._model.questionTypes;
  }

  public set questionTypes(questionTypes: string[]) {
    if (this.questionTypes !== questionTypes) {
      this._model.questionTypes = questionTypes;
      this.emit('questionTypesChange', this.questionTypes);
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
    // this._queueModel = questionQueue;
    // this.emit('officeHoursQueueChange', this._queueModel);
  }

  public getPriorities(taID: string): Map<string, number> {
    const x: TAInfo | undefined = this.taInfos.find(info => taID === info.taID);
    let p: Map<string, number> = new Map<string, number>();
    if (x) {
      p = convertToMap(x.priorities);
    }
    return p;
  }

  public setPriorities(taID: string, p: Map<string, number>) {
    const x: TAInfo | undefined = this.taInfos.find(info => taID === info.taID);
    if (x) {
      x.priorities = convertFromMap(p);
    }
    this.emit('prioritiesChange', p);
  }

  public getIsSorted(taID: string): boolean {
    const x: TAInfo | undefined = this.taInfos.find(info => taID === info.taID);
    let s = false;
    if (x) {
      s = x.isSorted;
    }
    return s;
  }

  public setIsSorted(taID: string, s: boolean) {
    const x: TAInfo | undefined = this.taInfos.find(info => taID === info.taID);
    if (x) {
      x.isSorted = s;
    }
    this.emit('isSortedChange', s);
  }

  public questionsAsked(studentID: string): number {
    return this.questionQueue.filter(q => q.students.includes(studentID)).length;
  }

  public officeHoursAreaModel(): OfficeHoursAreaModel {
    return this._model;
  }

  public updateModel(officeHoursAreaModel: OfficeHoursAreaModel) {
    this.isActive = officeHoursAreaModel.officeHoursActive;
    this.teachingAssistantsByID = officeHoursAreaModel.teachingAssistantsByID;
    this.questionTypes = officeHoursAreaModel.questionTypes;
    this.taInfos = officeHoursAreaModel.taInfos;
  }
}

// export function useActive(controller: OfficeHoursAreaController): boolean {
//   const [isActive, setActive] = useState(controller.isActive);
//   useEffect(() => {
//     controller.addListener('officeHoursActiveChange', setActive);
//     return () => {
//       controller.removeListener('officeHoursActiveChange', setActive);
//     };
//   }, [controller]);
//   return isActive;
// }

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

export function useQuestionTypes(controller: OfficeHoursAreaController): string[] {
  const [questionTypes, setQuestionTypes] = useState(controller.questionTypes);
  useEffect(() => {
    controller.addListener('questionTypesChange', setQuestionTypes);
    return () => {
      controller.removeListener('questionTypesChange', setQuestionTypes);
    };
  }, [controller]);
  return questionTypes;
}

export function useIsSorted(controller: OfficeHoursAreaController, id: string): boolean {
  // TODO: Code style: All hooks and useEffects must be at the top of a function
  // Add a useTAInfos hook instead cause this isn't how react hooks work.
  const x: TAInfo | undefined = controller.taInfos.find(info => id === info.taID);
  let s = false;
  if (x) {
    s = x.isSorted;
  }
  const [isSorted, setIsSorted] = useState(s);
  useEffect(() => {
    controller.addListener('isSortedChange', setIsSorted);
    return () => {
      controller.removeListener('isSortedChange', setIsSorted);
    };
  }, [controller]);
  return isSorted;
}

export function usePriorities(
  controller: OfficeHoursAreaController,
  id: string,
): Map<string, number> {
  const x: TAInfo | undefined = controller.taInfos.find(info => id === info.taID);
  let p: Map<string, number> = new Map<string, number>();
  if (x) {
    p = convertToMap(x.priorities);
  }
  // TODO: This isn't actually a react hook. p is re-initalized every time usePriorities is called.
  const [priorities, setPriorities] = useState(p);
  useEffect(() => {
    controller.addListener('prioritiesChange', setPriorities);
    return () => {
      controller.removeListener('prioritiesChange', setPriorities);
    };
  }, [controller]);
  return priorities;
}
