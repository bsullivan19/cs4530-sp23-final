/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { TAInfo } from './TAInfo';

export type OfficeHoursArea = {
    id: string;
    officeHoursActive: boolean;
    teachingAssistantsByID: Array<string>;
    questionTypes: Array<string>;
    taInfos: Array<TAInfo>;
};

