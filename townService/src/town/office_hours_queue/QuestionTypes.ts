import Comparator from './comparator/Comparator';
import Ticket from './ticket/Ticket';

export default class QuestionTypes {
  private _types: string[];

  public constructor() {
    this._types = [];
  }

  public addType(str: string) {
    if (this._types.find(x => str === x)) {
      throw Error('Trying to add type that exists');
    }
    this._types.push(str);
  }

  public removeType(str: string) {
    if (!this._types.find(x => str === x)) {
      throw Error('Trying to add type that does not exists');
    }
    this._types = this._types.filter(x => x !== str);
  }

  public getTypes(): string[] {
    return this._types;
  }
}
