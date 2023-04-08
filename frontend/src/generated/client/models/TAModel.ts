/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { OfficeHoursQuestion } from './OfficeHoursQuestion';
import type { PlayerLocation } from './PlayerLocation';

export type TAModel = {
    id: string;
    userName: string;
    location: PlayerLocation;
    breakoutRoomID?: string;
    questions?: Array<OfficeHoursQuestion>;
};
