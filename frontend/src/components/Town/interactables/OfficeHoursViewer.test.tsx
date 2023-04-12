import { ChakraProvider } from '@chakra-ui/react';
import { EventNames } from '@socket.io/component-emitter';
import { cleanup, render, RenderResult } from '@testing-library/react';
import { DeepMockProxy, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import { act } from 'react-dom/test-utils';
import TownController from '../../../classes/TownController';
import TownControllerContext from '../../../contexts/TownControllerContext';
import { mockTownController } from '../../../TestUtils';
import { QueueViewer } from './OfficeHoursViewer';
import OfficeHoursAreaController, {
  OfficeHoursAreaEvents,
} from '../../../classes/OfficeHoursAreaController';

function renderOfficeHoursArea(
  officeHoursArea: OfficeHoursAreaController,
  townController: TownController,
) {
  let isOpen = true;
  const close = () => {
    isOpen = false;
  };
  return (
    <ChakraProvider>
      <TownControllerContext.Provider value={townController}>
        <QueueViewer controller={officeHoursArea} isOpen={isOpen} close={close} />
      </TownControllerContext.Provider>
    </ChakraProvider>
  );
}

describe('Office Hours Queue Viewer', () => {
  const mockToast = jest.fn();
  let officeHoursArea: OfficeHoursAreaController;
  type OfficeHoursAreaEventName = keyof OfficeHoursAreaEvents;
  let addListenerSpy: jest.SpyInstance<
    OfficeHoursAreaController,
    [event: OfficeHoursAreaEventName, listener: OfficeHoursAreaEvents[OfficeHoursAreaEventName]]
  >;

  let removeListenerSpy: jest.SpyInstance<
    OfficeHoursAreaController,
    [event: OfficeHoursAreaEventName, listener: OfficeHoursAreaEvents[OfficeHoursAreaEventName]]
  >;

  let townController: DeepMockProxy<TownController>;

  let renderData: RenderResult;
  beforeEach(() => {
    mockClear(mockToast);
    officeHoursArea = new OfficeHoursAreaController({
      id: `id-${nanoid()}`,
      officeHoursActive: true,
      teachingAssistantsByID: ['taID1'],
      questionTypes: ['default'],
      taInfos: [{ taID: 'taID1', isSorted: true, priorities: [{ key: 'default', value: 1 }] }],
    });
    townController = mockTownController({ officeHoursAreas: [officeHoursArea] });

    addListenerSpy = jest.spyOn(officeHoursArea, 'addListener');
    removeListenerSpy = jest.spyOn(officeHoursArea, 'removeListener');

    renderData = render(renderOfficeHoursArea(officeHoursArea, townController));
  });

  /**
   * Retrieve the listener passed to "addListener" for a given eventName
   * @throws Error if the addListener method was not invoked exactly once for the given eventName
   */
  function getSingleListenerAdded<Ev extends EventNames<OfficeHoursAreaEvents>>(
    eventName: Ev,
    spy = addListenerSpy,
  ): OfficeHoursAreaEvents[Ev] {
    const addedListeners = spy.mock.calls.filter(eachCall => eachCall[0] === eventName);
    if (addedListeners.length !== 1) {
      throw new Error(
        `Expected to find exactly one addListener call for ${eventName} but found ${addedListeners.length}`,
      );
    }
    return addedListeners[0][1] as unknown as OfficeHoursAreaEvents[Ev];
  }
  /**
   * Retrieve the listener pased to "removeListener" for a given eventName
   * @throws Error if the removeListener method was not invoked exactly once for the given eventName
   */
  function getSingleListenerRemoved<Ev extends EventNames<OfficeHoursAreaEvents>>(
    eventName: Ev,
  ): OfficeHoursAreaEvents[Ev] {
    const removedListeners = removeListenerSpy.mock.calls.filter(
      eachCall => eachCall[0] === eventName,
    );
    if (removedListeners.length !== 1) {
      throw new Error(
        `Expected to find exactly one removeListeners call for ${eventName} but found ${removedListeners.length}`,
      );
    }
    return removedListeners[0][1] as unknown as OfficeHoursAreaEvents[Ev];
  }

  describe('OfficeHoursHooks', () => {
    it('[REE2] useQueue Registers exactly one officeHoursQueueChange listener', () => {
      act(() => {
        officeHoursArea.emit('officeHoursQueueChange', []);
      });
      act(() => {
        officeHoursArea.emit('officeHoursQueueChange', [
          {
            id: 'qid1',
            officeHoursID: officeHoursArea.id,
            questionContent: 'q1',
            students: [],
            groupQuestion: false,
            questionType: 'default',
            timeAsked: 0,
          },
        ]);
      });
      act(() => {
        officeHoursArea.emit('officeHoursQueueChange', [
          {
            id: 'qid2',
            officeHoursID: officeHoursArea.id,
            questionContent: 'q2',
            students: [],
            groupQuestion: false,
            questionType: 'default',
            timeAsked: 0,
          },
        ]);
      });
      getSingleListenerAdded('officeHoursQueueChange');
    });
    it('[REE2] useQueue Unregisters exactly the same officeHoursQueueChange listener on unmounting', () => {
      act(() => {
        officeHoursArea.emit('officeHoursQueueChange', []);
      });
      const listenerAdded = getSingleListenerAdded('officeHoursQueueChange');
      cleanup();
      expect(getSingleListenerRemoved('officeHoursQueueChange')).toBe(listenerAdded);
    });
    it('[REE2] useTAsByID Registers exactly one officeHoursTAChange listener', () => {
      act(() => {
        officeHoursArea.emit('officeHoursTAChange', []);
      });
      act(() => {
        officeHoursArea.emit('officeHoursTAChange', ['1']);
      });
      act(() => {
        officeHoursArea.emit('officeHoursTAChange', ['1', '2']);
      });
      getSingleListenerAdded('officeHoursTAChange');
    });
    it('[REE2] useTAsByID Unregisters exactly the same officeHoursTAChange listener on unmounting', () => {
      act(() => {
        officeHoursArea.emit('officeHoursTAChange', ['1', '2', '3']);
      });
      const listenerAdded = getSingleListenerAdded('officeHoursTAChange');
      cleanup();
      expect(getSingleListenerRemoved('officeHoursTAChange')).toBe(listenerAdded);
    });
    it('[REE2] useQuestionTypes Registers exactly one questionTypesChange listener', () => {
      act(() => {
        officeHoursArea.emit('questionTypesChange', ['cont1']);
      });
      act(() => {
        officeHoursArea.emit('questionTypesChange', ['cont1', 'cont2']);
      });
      act(() => {
        officeHoursArea.emit('questionTypesChange', ['cont1', 'cont2', 'cont3']);
      });
      getSingleListenerAdded('questionTypesChange');
    });
    it('[REE2] useQuestionTypes Unregisters exactly the same questionTypesChange listener on unmounting', () => {
      act(() => {
        officeHoursArea.emit('questionTypesChange', ['cont1', 'cont2', 'cont3', 'cont4']);
      });
      const listenerAdded = getSingleListenerAdded('questionTypesChange');
      cleanup();
      expect(getSingleListenerRemoved('questionTypesChange')).toBe(listenerAdded);
    });
    it('[REE2] Removes the listeners and adds new ones if the controller changes', () => {
      const origQueueChange = getSingleListenerAdded('officeHoursQueueChange');
      const origTAChange = getSingleListenerAdded('officeHoursTAChange');
      const origQuestionTypeChange = getSingleListenerAdded('questionTypesChange');

      const newOfficeHoursArea = new OfficeHoursAreaController({
        id: `id-${nanoid()}`,
        officeHoursActive: true,
        teachingAssistantsByID: ['taID1'],
        questionTypes: ['default'],
        taInfos: [{ taID: 'taID1', isSorted: true, priorities: [{ key: 'default', value: 1 }] }],
      });

      const newAddListenerSpy = jest.spyOn(newOfficeHoursArea, 'addListener');
      renderData.rerender(renderOfficeHoursArea(newOfficeHoursArea, townController));

      expect(getSingleListenerRemoved('officeHoursQueueChange')).toBe(origQueueChange);
      expect(getSingleListenerRemoved('officeHoursTAChange')).toBe(origTAChange);
      expect(getSingleListenerRemoved('questionTypesChange')).toBe(origQuestionTypeChange);

      getSingleListenerAdded('officeHoursQueueChange', newAddListenerSpy);
      getSingleListenerAdded('officeHoursTAChange', newAddListenerSpy);
      getSingleListenerAdded('questionTypesChange', newAddListenerSpy);
    });
  });
});
