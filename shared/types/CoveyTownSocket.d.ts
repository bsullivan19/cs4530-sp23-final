export type TownJoinResponse = {
  /** Unique ID that represents this player * */
  userID: string;
  /** Secret token that this player should use to authenticate
   * in future requests to this service * */
  sessionToken: string;
  /** Secret token that this player should use to authenticate
   * in future requests to the video service * */
  providerVideoToken: string;
  /** List of players currently in this town * */
  currentPlayers: Player[];
  /** Friendly name of this town * */
  friendlyName: string;
  /** Is this a private town? * */
  isPubliclyListed: boolean;
  /** Current state of interactables in this town */
  interactables: Interactable[];
}

export type Interactable = ViewingArea | ConversationArea | PosterSessionArea | OfficeHoursArea | BreakoutRoomArea;

export type TownSettingsUpdate = {
  friendlyName?: string;
  isPubliclyListed?: boolean;
}

export type Direction = 'front' | 'back' | 'left' | 'right';
export interface Player {
  id: string;
  userName: string;
  location: PlayerLocation;
};
export interface TAModel extends Player {
  breakoutRoomID?: string;
  questions?: OfficeHoursQuestion[];
};

export type XY = { x: number, y: number };

export interface PlayerLocation {
  /* The CENTER x coordinate of this player's location */
  x: number;
  /* The CENTER y coordinate of this player's location */
  y: number;
  /** @enum {string} */
  rotation: Direction;
  moving: boolean;
  interactableID?: string;
};
export type ChatMessage = {
  author: string;
  sid: string;
  body: string;
  dateCreated: Date;
  interactableId?: string;
};

export interface ConversationArea {
  id: string;
  topic?: string;
  occupantsByID: string[];
};
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface ViewingArea {
  id: string;
  video?: string;
  isPlaying: boolean;
  elapsedTimeSec: number;
}

export interface PosterSessionArea {
  id: string;
  stars: number;
  imageContents?: string;
  title?: string;
}

export interface BreakoutRoomArea {
  id: string;
  topic?: string;
  teachingAssistantID?: string;
  studentsByID: string[];
  linkedOfficeHoursID: string;
  timeLeft: number | undefined;
};


export interface OfficeHoursQuestion {
  id: string;
  officeHoursID: string;
  questionContent: string;
  students: string[];
  groupQuestion: boolean;
  timeAsked: number;
  questionType: string;
}

export interface OfficeHoursQueue {
  officeHoursID: string;
  questionQueue: OfficeHoursQuestion[];
}

export interface OfficeHoursArea {
  id: string;
  officeHoursActive: boolean; 
  teachingAssistantsByID: string[];
  questionTypes: string[];
  taInfos: TAInfo[];
  timeLimit?: number | undefined;
}

export interface Priority {
  key: string
  value: number;
}

export interface TAInfo {
  taID: string;
  isSorted: boolean;
  priorities: Priority[];
}

export interface ServerToClientEvents {
  playerMoved: (movedPlayer: Player) => void;
  teleportPlayer: (movedPlayer: Player) => void;
  playerDisconnect: (disconnectedPlayer: Player) => void;
  playerJoined: (newPlayer: Player) => void;
  initialize: (initialData: TownJoinResponse) => void;
  townSettingsUpdated: (update: TownSettingsUpdate) => void;
  townClosing: () => void;
  chatMessage: (message: ChatMessage) => void;
  interactableUpdate: (interactable: Interactable) => void;

  officeHoursQueueUpdate: (officeHoursQueue: OfficeHoursQueue) => void;

  officeHoursQuestionTaken: (ta: TAModel) => void;

  breakOutRoomUpdate: (x: BreakoutRoomAreaModel) => void;
}

export interface ClientToServerEvents {
  chatMessage: (message: ChatMessage) => void;
  playerMovement: (movementData: PlayerLocation) => void;
  interactableUpdate: (update: Interactable) => void;
}
