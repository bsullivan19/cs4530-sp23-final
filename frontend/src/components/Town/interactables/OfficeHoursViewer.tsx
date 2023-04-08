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
  Select,
  OrderedList,
  TableContainer,
  TableCaption,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Table,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useInteractable, useOfficeHoursAreaController } from '../../../classes/TownController';
import OfficeHoursAreaController, {
  useQueue,
  useTAsByID,
  useQuestionTypes,
  usePriorities,
  useIsSorted,
} from '../../../classes/OfficeHoursAreaController';
import useTownController from '../../../hooks/useTownController';
import OfficeHoursAreaInteractable from './OfficeHoursArea';
import { OfficeHoursQuestion } from '../../../types/CoveyTownSocket';

// Finds the next possible group to take grouped by the earliest guys question type
const LIMIT = 4;
function getGroup(queue: OfficeHoursQuestion[]): string[] | undefined {
  const questionIDs: string[] = [];
  let questionType: string | undefined = undefined;
  queue.forEach((question: OfficeHoursQuestion) => {
    if (questionIDs.length < LIMIT && question.groupQuestion) {
      if (questionType === undefined) {
        questionType = question.questionType;
      }
      if (questionType === question.questionType) {
        questionIDs.push(question.id);
      }
    }
  });
  return questionIDs.length > 0 ? questionIDs : undefined;
}

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
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  townController.pause();
  useEffect(() => {
    setSelectedQuestions(
      selectedQuestions.filter(qid => queue.map(question => question.id).includes(qid)),
    );
    priorities.forEach((value: number, key: string) => {
      if (!questionTypes.includes(key)) {
        const copy = new Map<string, number>(priorities);
        copy.delete(key);
        controller.setPriorities(curPlayerId, copy);
      }
    });
  }, [queue, questionTypes]);

  const cmp = useCallback(
    (x: OfficeHoursQuestion, y: OfficeHoursQuestion) => {
      const p1: number | undefined = priorities.get(x.questionType);
      const p2: number | undefined = priorities.get(y.questionType);
      if (p1 === p2 || !isSorted) {
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
    },
    [priorities, isSorted],
  );

  const addQuestion = useCallback(async () => {
    if (controller.questionsAsked(curPlayerId) != 0) {
      toast({
        title: 'Cannot add more than 1 question to the queue',
        status: 'error',
      });
    } else if (newQuestion && questionType) {
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
      const questionId = controller.questionQueue.sort(cmp).shift()?.id;
      const taModel = await townController.takeNextOfficeHoursQuestionWithQuestionId(
        controller,
        questionId,
      );
      toast({
        title: `Successfully took question ${taModel.questions?.map(
          (q: OfficeHoursQuestion) => q.id,
        )}, you will be teleported shortly`,
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
  }, [controller, townController, toast, close, cmp]);

  const nextSelectedQuestions = useCallback(async () => {
    try {
      const taModel = await townController.takeNextOfficeHoursQuestionWithQuestionIDs(
        controller,
        selectedQuestions,
      );
      toast({
        title: `Successfully took questions ${taModel.questions?.map(
          (q: OfficeHoursQuestion) => q.id,
        )}, you will be teleported shortly`,
        status: 'success',
      });
      close();
    } catch (err) {
      if (err instanceof Error) {
        toast({
          title: 'Unable to take next questions',
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
  }, [controller, townController, toast, close, selectedQuestions]);

  const takeQuestionsAsGroup = useCallback(async () => {
    try {
      const questionsAsGroup = getGroup(queue);
      if (questionsAsGroup) {
        const taModel = await townController.takeNextOfficeHoursQuestionWithQuestionIDs(
          controller,
          questionsAsGroup,
        );
        toast({
          title: `Successfully took questions ${taModel.questions?.map(
            (q: OfficeHoursQuestion) => q.id,
          )}, you will be teleported shortly`,
          status: 'success',
        });
        close();
      } else {
        toast({
          title: `No questions to take that are group`,
          status: 'success',
        });
      }
    } catch (err) {
      if (err instanceof Error) {
        toast({
          title: 'Unable to take next questions',
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
  }, [controller, townController, toast, close, selectedQuestions]);

  const updateModel = useCallback(async () => {
    try {
      const model = controller.officeHoursAreaModel();
      const updatedModel = await townController.updateOfficeHoursModel(model);
    } catch (err) {
      toast({
        title: 'Unable to take next question',
        description: 'error',
        status: 'error',
      });
    }
  }, [controller, townController, isSorted]);

  function RowView({ question }: { question: OfficeHoursQuestion }) {
    const allPlayers = townController.players;
    const players = allPlayers.filter(p => question.students.includes(p.id));
    const usernames = players.map(p => p.userName);
    if (!teachingAssistantsByID.includes(curPlayerId)) {
      return (
        <Tr>
          <Td>{usernames}</Td>
          <Td>{question.questionType}</Td>
          <Td>{question.timeAsked}</Td>
          <Td>{question.questionContent}</Td>
        </Tr>
      );
    } else {
      return (
        <Tr>
          <Td>
            <Checkbox
              type='checkbox'
              name='Select Question'
              isChecked={selectedQuestions.includes(question.id)}
              onChange={e => {
                if (selectedQuestions.includes(question.id)) {
                  setSelectedQuestions(selectedQuestions.filter(qid => qid !== question.id));
                } else {
                  setSelectedQuestions(selectedQuestions.concat(question.id));
                }
              }}
            />
          </Td>
          <Td>{usernames}</Td>
          <Td>{question.questionType}</Td>
          <Td>{question.groupQuestion ? 'true' : 'false'}</Td>
          <Td>{question.timeAsked}</Td>
          <Td>{question.questionContent}</Td>
        </Tr>
      );
    }
  }
  function QuesitonsViewer(x: any) {
    return (
      <TableContainer>
        <Table size='sm'>
          <TableCaption>Office Hours Queue</TableCaption>
          <Thead>
            <Tr>
              {teachingAssistantsByID.includes(curPlayerId) ? <Th>Select Question</Th> : null}
              <Th>Username</Th>
              <Th>Question Type</Th>
              {teachingAssistantsByID.includes(curPlayerId) ? <Th>Group</Th> : null}
              <Th>Time Asked</Th>
              <Th>Question Description</Th>
            </Tr>
          </Thead>
          <Tbody>
            {queue.sort(cmp).map(eachQuestion => (
              <RowView key={eachQuestion.id} question={eachQuestion} />
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    );
  }
  function QuestionView({ question }: { question: OfficeHoursQuestion }) {
    const allPlayers = townController.players;
    const players = allPlayers.filter(p => question.students.includes(p.id));
    const usernames = players.map(p => p.userName);
    if (!teachingAssistantsByID.includes(curPlayerId)) {
      return (
        // TODO: number of quesiton
        <ListItem title={questionType}>
          <Tag>{usernames}</Tag>
          <Tag>{question.questionContent}</Tag>
          <Tag>{question.timeAsked}</Tag>
          <Tag>{question.questionType}</Tag>
        </ListItem>
      );
    } else {
      return (
        // TODO: number of quesiton
        <ListItem>
          <Tag>{usernames}</Tag>
          <Tag>{question.questionContent}</Tag>
          <Tag>{question.timeAsked}</Tag>
          <Tag>{question.questionType}</Tag>
          <Checkbox
            type='checkbox'
            name='Selected Questions'
            isChecked={selectedQuestions.includes(question.id)}
            value={question.id}
            onChange={e => {
              if (selectedQuestions.includes(question.id)) {
                setSelectedQuestions(selectedQuestions.filter(qid => qid !== question.id));
              } else {
                setSelectedQuestions(selectedQuestions.concat(question.id));
              }
            }}
          />
        </ListItem>
      );
    }
  }
  const taView = (
    <ModalBody pb={6}>
      <QuesitonsViewer> </QuesitonsViewer>
      <Button colorScheme='blue' mr={3} onClick={nextQuestion}>
        Take next question
      </Button>
      <Button colorScheme='purple' mr={3} onClick={takeQuestionsAsGroup}>
        Take questions as group (max 4)
      </Button>
      <Button colorScheme='red' mr={3} onClick={nextSelectedQuestions}>
        Take selected question(s)
      </Button>
      <List></List>{' '}
      {/* <h1>line break cuz idk how to do better, this makes everything vertical</h1> */}
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
            updateModel();
          }
        }}>
        Add Question Type
      </Button>
      <div></div>
      <label>Sort by question type?</label>
      <Checkbox
        type='checkbox'
        name='Should Sort'
        isChecked={isSorted}
        onChange={e => {
          controller.setIsSorted(curPlayerId, !isSorted);
          updateModel();
        }}
      />
      <List>
        {questionTypes.map(eachQuestionType => {
          return (
            <ListItem key={eachQuestionType}>
              <Checkbox
                type='checkbox'
                name='Should use Question Type in Priorities'
                isChecked={priorities.has(eachQuestionType)}
                value={eachQuestionType}
                onChange={e => {
                  if (priorities.has(eachQuestionType)) {
                    priorities.delete(eachQuestionType);
                    const copy = new Map(priorities);
                    controller.setPriorities(curPlayerId, copy);
                    updateModel();
                  } else {
                    priorities.set(eachQuestionType, 1); // Maybe assign different priorities later
                    const copy = new Map(priorities);
                    controller.setPriorities(curPlayerId, copy);
                    updateModel();
                  }
                }}
              />
              {eachQuestionType}
              <Button
                colorScheme='red'
                onClick={() => {
                  const temp = questionTypes.filter(q => q !== eachQuestionType);
                  controller.questionTypes = temp;
                  updateModel();
                  if (priorities.has(eachQuestionType)) {
                    priorities.delete(eachQuestionType);
                    const copy = new Map(priorities);
                    controller.setPriorities(curPlayerId, copy);
                    updateModel();
                  }
                }}>
                Delete
              </Button>
            </ListItem>
          );
        })}
      </List>
      {/*<ul>*/}
      {/*  {questionTypes.map(eachQuestionType => {*/}
      {/*    return (*/}
      {/*      <li key={eachQuestionType}>*/}
      {/*        <Checkbox*/}
      {/*          type='checkbox'*/}
      {/*          name='Should use Question Type in Priorities'*/}
      {/*          isChecked={priorities.has(eachQuestionType)}*/}
      {/*          value={eachQuestionType}*/}
      {/*          onChange={e => {*/}
      {/*            if (priorities.has(eachQuestionType)) {*/}
      {/*              priorities.delete(eachQuestionType);*/}
      {/*              const copy = new Map(priorities);*/}
      {/*              controller.setPriorities(curPlayerId, copy);*/}
      {/*              updateModel();*/}
      {/*            } else {*/}
      {/*              priorities.set(eachQuestionType, 1); // Maybe assign different priorities later*/}
      {/*              const copy = new Map(priorities);*/}
      {/*              controller.setPriorities(curPlayerId, copy);*/}
      {/*              updateModel();*/}
      {/*            }*/}
      {/*          }}*/}
      {/*        />*/}
      {/*        {eachQuestionType}*/}
      {/*        <Button*/}
      {/*          colorScheme='red'*/}
      {/*          onClick={() => {*/}
      {/*            const temp = questionTypes.filter(q => q !== eachQuestionType);*/}
      {/*            controller.questionTypes = temp;*/}
      {/*            updateModel();*/}
      {/*            if (priorities.has(eachQuestionType)) {*/}
      {/*              priorities.delete(eachQuestionType);*/}
      {/*              const copy = new Map(priorities);*/}
      {/*              controller.setPriorities(curPlayerId, copy);*/}
      {/*              updateModel();*/}
      {/*            }*/}
      {/*          }}>*/}
      {/*          Delete*/}
      {/*        </Button>*/}
      {/*      </li>*/}
      {/*    );*/}
      {/*  })}*/}
      {/*</ul>*/}
      <ModalFooter>
        <Button onClick={close}>Cancel</Button>
      </ModalFooter>
    </ModalBody>
  );
  const studentView = (
    <form
      onSubmit={ev => {
        ev.preventDefault();
        addQuestion();
      }}>
      <ModalBody pb={6}>
        <QuesitonsViewer> </QuesitonsViewer>
        <FormControl>
          <FormLabel htmlFor='questionContent'>Question Content (max 75 Characters)</FormLabel>
          <Input
            id='questionContent'
            placeholder='Enter your question here'
            name='questionContent'
            // value={newQuestion}
            onChange={e => setQuestion(e.target.value)}
          />
          <Select
            placeholder='Select option'
            onChange={e => {
              setQuestionType(e.target.value);
            }}>
            {questionTypes.map(eachQuestion => {
              return (
                <option value={eachQuestion} key={eachQuestion}>
                  {eachQuestion}
                </option>
              );
            })}
          </Select>
        </FormControl>
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
      size={'6xl'}
      isOpen={isOpen}
      onClose={() => {
        close();
        townController.unPause();
      }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Office Hours, {controller.questionQueue.length} Questions Asked </ModalHeader>
        <ModalCloseButton />
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
// 1
// each question that students ask has a property of group question
// ta: poll manually x number of students with the same question
// student can be part of a group to make his wait time less, but he might have to be part of a group
// qustionType

// 2
// each student is able to create a group question
// each student is able to join a group question
// group questions will be in the same queue as indivdiual questions
// priority of group quesitons is more than individual questions
//    group size
//    groupSize * time
