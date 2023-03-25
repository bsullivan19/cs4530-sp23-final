import { ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import { nanoid } from 'nanoid';
import Player from '../lib/Player';
import Question from '../lib/Question';
import {
  BoundingBox,
  TownEmitter,
  OfficeHoursArea as OfficeHoursModel,
  OfficeHoursQuestion,
  Interactable,
} from '../types/CoveyTownSocket';
import InteractableArea from './InteractableArea';

export default class OfficeHoursArea extends InteractableArea {
  private _queue: Question[];

  private _teachingAssistants: Player[];

  private _numRooms: number;

  public get questionQueue() {
    return this._queue;
  }

  public get teachingAssistants() {
    return this._teachingAssistants;
  }

  public get numRooms() {
    return this._numRooms;
  }

  private _isTAOnline(player: Player): boolean {
    return this._teachingAssistants.map(p => p.id).includes(player.id);
  }

  public get isActive(): boolean {
    return this.teachingAssistants.length > 0;
  }

  public constructor(
    { id, numRooms, questions }: OfficeHoursModel,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
  ) {
    super(id, coordinates, townEmitter);
    this._teachingAssistants = [];
    this._numRooms = numRooms;
    this._queue =
      questions?.map(q =>
        Question.fromQuestionModel(id, q.students, q.questionContent, q.groupQuestion),
      ) || [];
  }

  public toModel(): OfficeHoursModel {
    return {
      id: this.id,
      numRooms: this.numRooms,
      questions: this.questionQueue.map(q => q.toModel()),
    };
  }

  public add(player: Player) {
    super.add(player);
    throw new Error('Not yet implemented');
    // TODO:
    // if (isTA(player)) {
    //   this._teachingAssistants.push(player);
    // }
  }

  public remove(player: Player) {
    super.remove(player);
    this._teachingAssistants = this._teachingAssistants.filter(ta => ta.id !== player.id);
    this._queue.forEach(q => q.studentsByID.filter(sid => sid !== player.id));
  }

  public addQuestion(student: Player, question: string) {
    this._queue.push(new Question(nanoid(), student.id, question));
  }

  public takeQuestion(TA: Player, questionID: string) {
    const question = this._queue.find(q => q.id === questionID);
    throw new Error('Not yet implemented');
    // TODO: Give to TA object
  }

  public joinQuestion(student: Player, questionID: string) {
    const question = this._queue.find(q => q.id === questionID);
    if (question && question.isGroup) {
      question.addStudent(student.id);
    }
  }
}
