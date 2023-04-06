/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type OfficeHoursQuestion = {
    id: string;
    officeHoursID: string;
    questionContent: string;
    students: Array<string>;
    groupQuestion: boolean;
    timeAsked?: number;
    questionType: string;
};

