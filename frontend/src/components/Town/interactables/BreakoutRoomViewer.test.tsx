import { ChakraProvider } from '@chakra-ui/react';
import { EventNames } from '@socket.io/component-emitter';
import { cleanup, render, RenderResult } from '@testing-library/react';
import { DeepMockProxy, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import { act } from 'react-dom/test-utils';
import BreakoutRoomAreaController, {
  BreakoutRoomAreaEvents,
} from '../../../classes/BreakoutRoomAreaController';
import TownController from '../../../classes/TownController';
import TownControllerContext from '../../../contexts/TownControllerContext';
import { mockTownController } from '../../../TestUtils';
import { BreakoutRoomModal } from './BreakoutRoomModal';

function renderBreakoutRoomArea(
  breakoutRoomArea: BreakoutRoomAreaController,
  townController: TownController,
) {
  let roomInUse = breakoutRoomArea.topic === undefined;
  const close = () => {
    roomInUse = false;
  };
  return (
    <ChakraProvider>
      <TownControllerContext.Provider value={townController}>
        <BreakoutRoomModal controller={breakoutRoomArea} isOpen={!roomInUse} close={close} />
      </TownControllerContext.Provider>
    </ChakraProvider>
  );
}

describe('Breakout Room Viewer', () => {
  const mockToast = jest.fn();
  let breakoutRoomArea: BreakoutRoomAreaController;
  type BreakoutRoomAreaEventName = keyof BreakoutRoomAreaEvents;
  let addListenerSpy: jest.SpyInstance<
    BreakoutRoomAreaController,
    [event: BreakoutRoomAreaEventName, listener: BreakoutRoomAreaEvents[BreakoutRoomAreaEventName]]
  >;

  let removeListenerSpy: jest.SpyInstance<
    BreakoutRoomAreaController,
    [event: BreakoutRoomAreaEventName, listener: BreakoutRoomAreaEvents[BreakoutRoomAreaEventName]]
  >;

  let townController: DeepMockProxy<TownController>;

  let renderData: RenderResult;
  beforeEach(() => {
    mockClear(mockToast);
    breakoutRoomArea = new BreakoutRoomAreaController(
      `id-${nanoid()}`,
      `ohID-${nanoid()}`,
      `topicName-${nanoid()}`,
    );
    townController = mockTownController({ breakoutRoomAreas: [breakoutRoomArea] });

    addListenerSpy = jest.spyOn(breakoutRoomArea, 'addListener');
    removeListenerSpy = jest.spyOn(breakoutRoomArea, 'removeListener');

    renderData = render(renderBreakoutRoomArea(breakoutRoomArea, townController));
  });
  /**
   * Retrieve the listener passed to "addListener" for a given eventName
   * @throws Error if the addListener method was not invoked exactly once for the given eventName
   */
  function getSingleListenerAdded<Ev extends EventNames<BreakoutRoomAreaEvents>>(
    eventName: Ev,
    spy = addListenerSpy,
  ): BreakoutRoomAreaEvents[Ev] {
    const addedListeners = spy.mock.calls.filter(eachCall => eachCall[0] === eventName);
    if (addedListeners.length !== 1) {
      throw new Error(
        `Expected to find exactly one addListener call for ${eventName} but found ${addedListeners.length}`,
      );
    }
    return addedListeners[0][1] as unknown as BreakoutRoomAreaEvents[Ev];
  }
  /**
   * Retrieve the listener pased to "removeListener" for a given eventName
   * @throws Error if the removeListener method was not invoked exactly once for the given eventName
   */
  function getSingleListenerRemoved<Ev extends EventNames<BreakoutRoomAreaEvents>>(
    eventName: Ev,
  ): BreakoutRoomAreaEvents[Ev] {
    const removedListeners = removeListenerSpy.mock.calls.filter(
      eachCall => eachCall[0] === eventName,
    );
    if (removedListeners.length !== 1) {
      throw new Error(
        `Expected to find exactly one removeListeners call for ${eventName} but found ${removedListeners.length}`,
      );
    }
    return removedListeners[0][1] as unknown as BreakoutRoomAreaEvents[Ev];
  }

  describe('PosterHooks', () => {
    it('[REE2] useBreakoutRoomAreaTA Registers exactly one breakoutRoomTAChange listener', () => {
      act(() => {
        breakoutRoomArea.emit('breakoutRoomTAChange', breakoutRoomArea.teachingAssistant);
      });
      act(() => {
        breakoutRoomArea.emit('breakoutRoomTAChange', breakoutRoomArea.teachingAssistant);
      });
      act(() => {
        breakoutRoomArea.emit('breakoutRoomTAChange', breakoutRoomArea.teachingAssistant);
      });
      getSingleListenerAdded('breakoutRoomTAChange');
    });
    it('[REE2] useBreakoutRoomAreaTA Unregisters exactly the same breakoutRoomTAChange listener on unmounting', () => {
      act(() => {
        breakoutRoomArea.emit('breakoutRoomTAChange', breakoutRoomArea.teachingAssistant);
      });
      const listenerAdded = getSingleListenerAdded('breakoutRoomTAChange');
      cleanup();
      expect(getSingleListenerRemoved('breakoutRoomTAChange')).toBe(listenerAdded);
    });
    it('[REE2] useBreakOutRoomTimeLeft Registers exactly one newTimeLeft listener', () => {
      act(() => {
        breakoutRoomArea.emit('newTimeLeft', 0);
      });
      act(() => {
        breakoutRoomArea.emit('newTimeLeft', 1);
      });
      act(() => {
        breakoutRoomArea.emit('newTimeLeft', 2);
      });
      getSingleListenerAdded('newTimeLeft');
    });
    it('[REE2] useBreakOutRoomTimeLeft Unregisters exactly the same newTimeLeft listener on unmounting', () => {
      act(() => {
        breakoutRoomArea.emit('newTimeLeft', 3);
      });
      const listenerAdded = getSingleListenerAdded('newTimeLeft');
      cleanup();
      expect(getSingleListenerRemoved('newTimeLeft')).toBe(listenerAdded);
    });
    it('[REE2] useBreakoutRoomAreaTopic Registers exactly one breakoutRoomTopicChange listener', () => {
      act(() => {
        breakoutRoomArea.emit('breakoutRoomTopicChange', 'top1');
      });
      act(() => {
        breakoutRoomArea.emit('breakoutRoomTopicChange', 'top2');
      });
      act(() => {
        breakoutRoomArea.emit('breakoutRoomTopicChange', 'top3');
      });
      getSingleListenerAdded('breakoutRoomTopicChange');
    });
    it('[REE2] useBreakoutRoomAreaTopic Unregisters exactly the same breakoutRoomTopicChange listener on unmounting', () => {
      act(() => {
        breakoutRoomArea.emit('breakoutRoomTopicChange', 'top4');
      });
      const listenerAdded = getSingleListenerAdded('breakoutRoomTopicChange');
      cleanup();
      expect(getSingleListenerRemoved('breakoutRoomTopicChange')).toBe(listenerAdded);
    });
    it('Removes the listeners and adds new ones if the controller changes', () => {
      const origTAChange = getSingleListenerAdded('breakoutRoomTAChange');
      const origTimeChange = getSingleListenerAdded('newTimeLeft');
      const origTopicChange = getSingleListenerAdded('breakoutRoomTopicChange');

      const newBreakoutRoomArea = new BreakoutRoomAreaController(nanoid(), nanoid());
      const newAddListenerSpy = jest.spyOn(newBreakoutRoomArea, 'addListener');
      renderData.rerender(renderBreakoutRoomArea(newBreakoutRoomArea, townController));

      expect(getSingleListenerRemoved('breakoutRoomTAChange')).toBe(origTAChange);
      expect(getSingleListenerRemoved('newTimeLeft')).toBe(origTimeChange);
      expect(getSingleListenerRemoved('breakoutRoomTopicChange')).toBe(origTopicChange);

      getSingleListenerAdded('breakoutRoomTAChange', newAddListenerSpy);
      getSingleListenerAdded('newTimeLeft', newAddListenerSpy);
      getSingleListenerAdded('breakoutRoomTopicChange', newAddListenerSpy);
    });
  });
});
