import { EventEmitter } from 'events';
import { useEffect, useState } from 'react';
import TypedEventEmitter from 'typed-emitter';
import {
  OfficeHoursArea as OfficeHoursAreaModel,
  OfficeHoursQueue,
  OfficeHoursQuestion,
} from '../types/CoveyTownSocket';

/**
 * The events that a PosterSessionAreaController can emit
 */
export type OfficeHoursAreaEvents = {
  teachingAssistantsChanged: (teachingAssistantsByID: string[]) => void;
  officeHoursQuestionChange: (question: OfficeHoursQuestion) => void;
  officeHoursQueueChange: (queue: OfficeHoursQueue) => void;
};

/**
 * A PosterSessionAreaController manages the state for a PosterSessionArea in the frontend app, serving as a bridge between the poster
 * image that is being displayed in the user's browser and the backend TownService, and ensuring that star updates are
 * synchronized across all the players looking at the poster.
 *
 * The PosterSessionAreaController implements callbacks that handle events from the poster image in this browser window, and
 * emits updates when the state is updated, @see PosterSessionAreaEvents
 */
export default class OfficeHoursAreaController extends (EventEmitter as new () => TypedEventEmitter<OfficeHoursAreaEvents>) {
  private _model: OfficeHoursAreaModel;

  private _queue: OfficeHoursQueue;

  /**
   * Constructs a new OfficeHoursAreaController, initialized with the state of the
   * provided officeHoursAreaModel, and optionally the state of the officeHoursQueue
   *
   * @param officeHoursAreaModel The office hours area model that this controller should represent
   */
  constructor(officeHoursAreaModel: OfficeHoursAreaModel, officeHoursQueue?: OfficeHoursQueue) {
    super();
    this._model = officeHoursAreaModel;
    this._queue = officeHoursQueue || { officeHoursID: this._model.id, questionQueue: [] };
  }

  /**
   * The ID of the poster session area represented by this poster session area controller
   * This property is read-only: once a PosterSessionAreaController is created, it will always be
   * tied to the same poster session area ID.
   */
  public get id(): string {
    return this._model.id;
  }

  public get teachingAssistantsOnline(): number {
    return this._model.teachingAssistantsByID.length;
  }

  /**
   * @returns OfficeHoursAreaModel that represents the current state of this OfficeHoursAreaController
   */
  public officeHoursAreaModel(): OfficeHoursAreaModel {
    return this._model;
  }

  /**
   * Applies updates to this poster session area controller's model, setting the fields
   * image, stars, and title from the updatedModel
   *
   * @param updatedModel
   */
  public updateModel(updatedModel: OfficeHoursAreaModel): void {
    // note: this calls the setters; really we're updating the model
    this.title = updatedModel.title;
    this.imageContents = updatedModel.imageContents;
    this.stars = updatedModel.stars;
  }
}

/**
 * A hook that returns the number of stars for the poster session area with the given controller
 */
export function useStars(controller: PosterSessionAreaController): number {
  const [stars, setStars] = useState(controller.stars);
  useEffect(() => {
    controller.addListener('posterStarChange', setStars);
    return () => {
      controller.removeListener('posterStarChange', setStars);
    };
  }, [controller]);
  return stars;
}

/**
 * A hook that returns the image contents for the poster session area with the given controller
 */
export function useImageContents(controller: PosterSessionAreaController): string | undefined {
  const [imageContents, setImageContents] = useState(controller.imageContents);
  useEffect(() => {
    controller.addListener('posterImageContentsChange', setImageContents);
    return () => {
      controller.removeListener('posterImageContentsChange', setImageContents);
    };
  }, [controller]);
  return imageContents;
}

/**
 * A hook that returns the title for the poster session area with the given controller
 */
export function useTitle(controller: PosterSessionAreaController): string | undefined {
  const [title, setTitle] = useState(controller.title);
  useEffect(() => {
    controller.addListener('posterTitleChange', setTitle);
    return () => {
      controller.removeListener('posterTitleChange', setTitle);
    };
  }, [controller]);
  return title;
}
