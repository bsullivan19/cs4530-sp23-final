import {
  Button,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react';
import React, {
  useCallback,
  // useEffect,
  // useState,
} from 'react';
import { useBreakoutRoomAreaController, useInteractable } from '../../../classes/TownController';
import BreakoutRoomAreaInteractable from './BreakoutRoomArea';
import useTownController from '../../../hooks/useTownController';
import BreakoutRoomAreaController, {
  useBreakoutRoomAreaTA,
  // useBreakoutRoomAreaStudents,
  // useBreakoutRoomAreaTA,
  useBreakoutRoomAreaTopic,
} from '../../../classes/BreakoutRoomAreaController';

export function BreakoutRoomModal({
  controller,
  isOpen,
  close,
}: {
  controller: BreakoutRoomAreaController;
  isOpen: boolean;
  close: () => void;
}): JSX.Element {
  const townController = useTownController();
  const topic = useBreakoutRoomAreaTopic(controller);
  const teachingAssistant = useBreakoutRoomAreaTA(controller);
  const curPlayerId = townController.ourPlayer.id;
  // const students = useBreakoutRoomAreaStudents(controller);
  const toast = useToast();

  const finishQuestion = useCallback(async () => {
    try {
      await townController.closeBreakoutRoomArea(controller);
      toast({
        title: 'Closing breakout room and removing all players',
        status: 'success',
      });
      close();
    } catch (err) {
      if (err instanceof Error) {
        toast({
          title: 'Failed to close breakout room',
          description: err.toString(),
          status: 'error',
        });
      } else {
        console.trace(err);
        toast({
          title: 'Unexpected Error',
          status: 'error',
        });
      }
    }
  }, [close, controller, toast, townController]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        close();
      }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Breakout Room for Question: {topic}</ModalHeader>
        <ModalCloseButton />
        <form
          onSubmit={ev => {
            ev.preventDefault();
            finishQuestion();
          }}>
          <ModalFooter>
            {teachingAssistant?.id === curPlayerId ? (
              <Button colorScheme='red' mr={'3'} onClick={finishQuestion}>
                Close Breakout Room
              </Button>
            ) : (
              <FormLabel>Wait For TA to close Session</FormLabel>
            )}
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export function BreakoutRoomViewer({
  breakoutRoomArea,
}: {
  breakoutRoomArea: BreakoutRoomAreaInteractable;
}): JSX.Element {
  const townController = useTownController();
  const breakoutRoomAreaController = useBreakoutRoomAreaController(breakoutRoomArea.name);
  const isOpen = breakoutRoomAreaController.teachingAssistant !== undefined;
  if (isOpen) {
    return (
      <>
        <BreakoutRoomModal
          controller={breakoutRoomAreaController}
          isOpen={isOpen}
          close={() => {
            townController.unPause();
            townController.interactEnd(breakoutRoomArea);
          }}
        />
      </>
    );
  } else {
    return <></>;
  }
}

export default function BreakoutRoomViewerWrapper(): JSX.Element {
  const breakoutRoomArea = useInteractable<BreakoutRoomAreaInteractable>('breakoutRoomArea');
  if (breakoutRoomArea) {
    return (
      <>
        <BreakoutRoomViewer breakoutRoomArea={breakoutRoomArea} />
      </>
    );
  }
  return <></>;
}
