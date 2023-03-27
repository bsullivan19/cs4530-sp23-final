import { ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import { nanoid } from 'nanoid';
import Player from '../lib/Player';
import Question from '../lib/Question';
import TA, { isTA } from '../lib/TA';
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

  private _teachingAssistants: TA[]; // TA's currently online

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
    if (isTA(player)) {
      this._teachingAssistants.push(player);
    }
  }

  public remove(player: Player) {
    super.remove(player);
    this._teachingAssistants = this._teachingAssistants.filter(ta => ta.id !== player.id);
    this._queue.forEach(q => q.removeStudent(player.id));
  }

  public getQuestion(questionID: string): Question | undefined {
    return this._queue.find(q => q.id === questionID);
  }

  public addQuestion(student: Player, question: string) {
    this._queue.push(new Question(nanoid(), student.id, question));
  }

  public takeQuestion(teachingAssistant: Player, questionID: string) {
    const question = this._queue.find(q => q.id === questionID);
    if (
      question &&
      isTA(teachingAssistant) &&
      this.teachingAssistants.find(p => p.id === teachingAssistant.id)
    ) {
      teachingAssistant.currentQuestion = question.id;
    }
  }

  public joinQuestion(student: Player, questionID: string) {
    const question = this._queue.find(q => q.id === questionID);
    if (question && question.isGroup) {
      question.addStudent(student.id);
    }
  }

  public leaveQuestion(student: Player, questionID: string) {
    const question = this._queue.find(q => q.id === questionID);
    if (!question) {
      return;
    }
    question.removeStudent(student.id);
    if (question.studentsByID.length === 0) {
      this._queue = this._queue.filter(q => q.id !== questionID);
    }
  }
}
