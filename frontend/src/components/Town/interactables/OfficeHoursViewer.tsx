import {
  Button,
  FormControl,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
  Input,
  Checkbox,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useInteractable, useOfficeHoursAreaController } from '../../../classes/TownController';
import OfficeHoursAreaController, {
  useActive,
  useQueue,
  useTAsByID,
} from '../../../classes/OfficeHoursAreaController';
import useTownController from '../../../hooks/useTownController';
import OfficeHoursAreaInteractable from './OfficeHoursArea';

export function QueueViewer({
  controller,
  isOpen,
  close,
}: {
  controller: OfficeHoursAreaController;
  isOpen: boolean;
  close: () => void;
}): JSX.Element {
  // const teachingAssistantsByID = useTAsByID(controller);
  // const active = useActive(controller);
  // const queue = useQueue(controller);

  const [newQuestion, setQuestion] = useState<string>('');
  const [groupQuestion, setGroupQuestion] = useState<boolean>(false);

  const townController = useTownController();
  const curPlayerId = townController.ourPlayer.id;
  const toast = useToast();

  townController.pause();

  useEffect(() => {
    townController.getOfficeHoursQueue(controller);
  }, [townController, controller]);

  const addQuestion = useCallback(async () => {
    if (controller.questionsAsked(curPlayerId) != 0) {
      toast({
        title: 'Cannot add more than 1 question to the queue',
        status: 'error',
      });
    } else if (newQuestion) {
      try {
        await townController.addOfficeHoursQuestion(controller, newQuestion, groupQuestion);
        toast({
          title: 'Question Created!',
          status: 'success',
        });
        setQuestion('');
        setGroupQuestion(false);
        townController.unPause();
        close();
      } catch (err) {
        if (err instanceof Error) {
          toast({
            title: 'Unable to create question',
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
    }
  }, [
    controller,
    curPlayerId,
    newQuestion,
    setQuestion,
    groupQuestion,
    setGroupQuestion,
    toast,
    townController,
    close,
  ]);

  const nextQuestion = useCallback(async () => {
    try {
      const taModel = await townController.takeNextOfficeHoursQuestion(controller);
      toast({
        title: `Successfully took question ${taModel.question?.id}, you will be teleported shortly`,
        status: 'success',
      });
      townController.unPause();
      close();
    } catch (err) {
      if (err instanceof Error) {
        toast({
          title: 'Unable to take next question',
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
  }, [controller, townController, toast, close]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        close();
        townController.unPause();
      }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Office Hours, {controller.questionQueue.length} Questions Asked </ModalHeader>
        <ModalCloseButton />
        <form
          onSubmit={ev => {
            ev.preventDefault();
            addQuestion();
          }}>
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel htmlFor='questionContent'>Question Content</FormLabel>
              <Input
                id='questionContent'
                placeholder='Enter your question here'
                name='questionContent'
                value={newQuestion}
                onChange={e => setQuestion(e.target.value)}
              />
            </FormControl>
            <FormLabel htmlFor='groupQuestion'>Group Question?</FormLabel>
            <Checkbox
              type='checkbox'
              id='groupQuestion'
              name='groupQuestion'
              checked={groupQuestion}
              onChange={e => setGroupQuestion(e.target.checked)}
            />
            <Button colorScheme='blue' mr={3} onClick={addQuestion}>
              Create
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme='red' mr={3} onClick={nextQuestion}>
              Take next question (TAs only)
            </Button>
            <Button onClick={close}>Cancel</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

/**
 * The PosterViewer monitors the player's interaction with a PosterSessionArea on the map: displaying either
 * a popup to set the poster image and title for a poster session area, or if the image/title is set,
 * a PosterImage modal to display the poster itself.
 *
 * @param props: the viewing area interactable that is being interacted with
 */
export function OfficeHoursViewer({
  officeHoursArea,
}: {
  officeHoursArea: OfficeHoursAreaInteractable;
}): JSX.Element {
  const townController = useTownController();
  const officeHoursAreaController = useOfficeHoursAreaController(officeHoursArea.name);

  return (
    <>
      <QueueViewer
        controller={officeHoursAreaController}
        isOpen={true}
        close={() => {
          // setSelectIsOpen(false);
          // forces game to emit "posterSessionArea" event again so that
          // repoening the modal works as expected
          townController.interactEnd(officeHoursArea);
        }}
      />
    </>
  );
}

/**
 * The OfficeHoursViewerWrapper is suitable to be *always* rendered inside of a town, and
 * will activate only if the player begins interacting with a poster session area.
 */
export default function OfficeHoursViewerWrapper(): JSX.Element {
  const officeHoursArea = useInteractable<OfficeHoursAreaInteractable>('officeHoursArea');
  if (officeHoursArea) {
    return <OfficeHoursViewer officeHoursArea={officeHoursArea} />;
  }
  return <></>;
}
