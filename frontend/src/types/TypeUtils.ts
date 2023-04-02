import {
  ConversationArea,
  Interactable,
  OfficeHoursArea,
  PosterSessionArea,
  ViewingArea,
} from './CoveyTownSocket';

/**
 * Test to see if an interactable is a conversation area
 */
export function isConversationArea(interactable: Interactable): interactable is ConversationArea {
  return 'occupantsByID' in interactable;
}

/**
 * Test to see if an interactable is a viewing area
 */
export function isViewingArea(interactable: Interactable): interactable is ViewingArea {
  return 'isPlaying' in interactable;
}

/**
 * Test to see if an interactable is a poster session area
 */
export function isPosterSessionArea(interactable: Interactable): interactable is PosterSessionArea {
  return 'stars' in interactable;
}

/**
 * Test to see if an interactable is an office hours area
 */
export function isOfficeHoursArea(interactable: Interactable): interactable is OfficeHoursArea {
  return 'officeHoursActive' in interactable;
}
