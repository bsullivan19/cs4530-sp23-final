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
  List,
  ListItem,
  Tag,
  Stack,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useInteractable, useOfficeHoursAreaController } from '../../../classes/TownController';
import OfficeHoursAreaController, {
  useActive,
  useQueue,
  useTAsByID,
  useQuestionTypes,
  usePriorities,
  useIsSorted,
} from '../../../classes/OfficeHoursAreaController';
import useTownController from '../../../hooks/useTownController';
import OfficeHoursAreaInteractable from './OfficeHoursArea';
import { OfficeHoursQuestion } from '../../../types/CoveyTownSocket';

export function QueueViewer({
  controller,
  isOpen,
  close,
}: {
  controller: OfficeHoursAreaController;
  isOpen: boolean;
  close: () => void;
}): JSX.Element {
  const teachingAssistantsByID = useTAsByID(controller);
  const active = useActive(controller);
  const townController = useTownController();
  const curPlayerId = townController.ourPlayer.id;

  const [newQuestion, setQuestion] = useState<string>('');
  const [groupQuestion, setGroupQuestion] = useState<boolean>(false);

  const [flag, setFlag] = useState(false);
  const questionTypes = useQuestionTypes(controller);
  const priorities = usePriorities(controller, curPlayerId);
  const isSorted = useIsSorted(controller, curPlayerId);
  const [questionType, setQuestionType] = useState('');
  const toast = useToast();
  const queue = useQueue(controller);

  townController.pause();
  useEffect(() => {
    townController.getOfficeHoursQueue(controller);
  }, [townController, controller]);

  useEffect(() => {
    let newQuestions = queue.map(x => x);
    newQuestions = newQuestions.sort((x: OfficeHoursQuestion, y: OfficeHoursQuestion) => {
      const p1: number | undefined = priorities.get(x.questionType);
      const p2: number | undefined = priorities.get(y.questionType);
      if (p1 == p2 || !isSorted) {
        // timeAsked should always exist?
        if (x.timeAsked !== undefined && y.timeAsked !== undefined) {
          return x.timeAsked - y.timeAsked;
        }
      }
      if (p1 === undefined) {
        return 1;
      }
      if (p2 === undefined) {
        return -1;
      }
      return p1 - p2;
    });
    controller.questionQueue = newQuestions;
  }, [isSorted, priorities, flag]);

  const addQuestion = useCallback(async () => {
    if (controller.questionsAsked(curPlayerId) != 0) {
      toast({
        title: 'Cannot add more than 1 question to the queue',
        status: 'error',
      });
    } else if (newQuestion) {
      try {
        await townController.addOfficeHoursQuestion(
          controller,
          newQuestion,
          groupQuestion,
          questionType,
        );
        toast({
          title: 'Question Created!',
          status: 'success',
        });
        setQuestion('');
        setGroupQuestion(false);
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
    questionType,
    setQuestionType,
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
      const questionId = controller.questionQueue.shift()?.id;
      const taModel = await townController.takeNextOfficeHoursQuestionWithQuestionId(
        controller,
        questionId,
      );
      toast({
        title: `Successfully took question ${taModel.question?.id}, you will be teleported shortly`,
        status: 'success',
      });
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
  function QuestionView({ question }: { question: OfficeHoursQuestion }) {
    const allPlayers = townController.players;
    const players = allPlayers.filter(p => question.students.includes(p.id));
    const usernames = players.map(p => p.userName);
    return (
      // TODO: number of quesiton
      <ListItem>
        <Tag>{usernames}</Tag>
        <Tag>{question.questionContent}</Tag>
        <Tag>{question.timeAsked}</Tag>
        <Tag>{question.questionType}</Tag>
      </ListItem>
    );
  }

  const taView = (
    <ModalBody pb={6}>
      <Button colorScheme='red' mr={3} onClick={nextQuestion}>
        Take next question
      </Button>
      <List></List>{' '}
      {/* <h1>line break cuz idk how to do better, this makes everything vertical</h1> */}
      <Button onClick={close}>Cancel</Button>
      <Input
        placeholder='Add question type'
        required
        onChange={e => {
          setQuestionType(e.target.value);
        }}></Input>
      <Button
        colorScheme='green'
        onClick={() => {
          if (!questionTypes.includes(questionType) && questionType.length > 0) {
            const temp = questionTypes.concat(questionType);
            controller.questionTypes = temp;
          }
        }}>
        Add Question Type
      </Button>
      <div></div>
      <label>Sort by question type?</label>
      <Checkbox
        type='checkbox'
        name='Should Sort'
        onChange={e => controller.setIsSorted(curPlayerId, !isSorted)}
      />
      <ul>
        {questionTypes.map(eachQuestionType => {
          return (
            <li key={eachQuestionType}>
              <Checkbox
                type='checkbox'
                name='Should use Question Type in Priorities'
                onChange={e => {
                  if (priorities.has(eachQuestionType)) {
                    priorities.delete(eachQuestionType);
                    const copy = new Map(priorities);
                    controller.setPriorities(curPlayerId, priorities);
                  } else {
                    priorities.set(eachQuestionType, 1); // Maybe assign different priorities later
                    const copy = new Map(priorities);
                    controller.setPriorities(curPlayerId, priorities);
                  }
                }}
              />
              <span>{eachQuestionType}</span>
              <Button
                colorScheme='red'
                onClick={() => {
                  const temp = questionTypes.filter(q => q !== eachQuestionType);
                  controller.questionTypes = temp;
                  if (priorities.has(eachQuestionType)) {
                    priorities.delete(eachQuestionType);
                    const copy = new Map(priorities);
                    controller.setPriorities(curPlayerId, priorities);
                  }
                }}>
                Delete
              </Button>
            </li>
          );
        })}
      </ul>
    </ModalBody>
  );
  const studentView = (
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
            // value={newQuestion}
            onChange={e => setQuestion(e.target.value)}
          />
          <FormLabel htmlFor='questionType'>Question Type</FormLabel>
          <Input
            id='questionType'
            placeholder='Enter question type'
            name='questionType'
            // value={questionType}
            onChange={e => {
              setQuestionType(e.target.value);
            }}
          />
        </FormControl>
        {/*<FormControl>*/}
        {/*  <FormLabel htmlFor='questionType'>Question Type</FormLabel>*/}
        {/*  <Input*/}
        {/*    id='questionType'*/}
        {/*    placeholder='Enter question type'*/}
        {/*    name='questionType'*/}
        {/*    value={questionType}*/}
        {/*    onChange={e => {*/}
        {/*      console.log('in on change');*/}
        {/*      console.log(questionType);*/}
        {/*      setQuestionType(questionType);*/}
        {/*    }*/}
        {/*    }*/}
        {/*  />*/}
        {/*</FormControl>*/}
        <FormLabel htmlFor='groupQuestion'>Group Question?</FormLabel>
        <Checkbox
          type='checkbox'
          id='groupQuestion'
          name='groupQuestion'
          checked={groupQuestion}
          onChange={e => setGroupQuestion(e.target.checked)}
        />
        <div> </div>
        <Button colorScheme='blue' mr={3} onClick={addQuestion}>
          Create
        </Button>
      </ModalBody>
      <ModalFooter>
        <Button onClick={close}>Cancel</Button>
      </ModalFooter>
    </form>
  );
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
        <List spacing={6}>
          {queue.map(eachQuestion => (
            <QuestionView key={eachQuestion.id} question={eachQuestion} />
          ))}
        </List>
        <div>{teachingAssistantsByID.includes(curPlayerId) ? taView : studentView}</div>
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
          townController.unPause();
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
