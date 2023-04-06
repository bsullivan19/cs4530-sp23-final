/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Direction } from './Direction';

export type PlayerLocation = {
    'x': number;
    'y': number;
    rotation: Direction;
    moving: boolean;
    interactableID?: string;
};

