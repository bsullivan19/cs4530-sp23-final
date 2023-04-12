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
  Select,
  TableContainer,
  TableCaption,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Table,
  VStack,
  HStack,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useInteractable, useOfficeHoursAreaController } from '../../../classes/TownController';
import OfficeHoursAreaController, {
  useQueue,
  useTAsByID,
  useQuestionTypes,
  usePriorities,
  useIsSorted,
  useTimeLimit,
} from '../../../classes/OfficeHoursAreaController';
import useTownController from '../../../hooks/useTownController';
import OfficeHoursAreaInteractable from './OfficeHoursArea';
import { OfficeHoursQuestion } from '../../../types/CoveyTownSocket';
import _ from 'lodash';

export function isInteger(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s[i] < '0' || s[i] > '9') return false;
  }
  return true;
}
export function convertMilliToMin(x: number): number {
  return x / 1000 / 60;
}
export function convertMinToMilli(x: number): number {
  return x * 1000 * 60;
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

  // const [flag, setFlag] = useState(false);
  const questionTypes = useQuestionTypes(controller);
  const priorities = usePriorities(controller, curPlayerId);
  const isSorted = useIsSorted(controller, curPlayerId);
  const [questionType, setQuestionType] = useState('');
  const toast = useToast();
  const queue = useQueue(controller);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const timeLimit = useTimeLimit(controller);
  const [inputTimeLimit, setInputTimeLimit] = useState<string>('');
  townController.pause();
  useEffect(() => {
    const filteredQuestions = selectedQuestions.filter(qid =>
      queue.map(question => question.id).includes(qid),
    );
    if (
      filteredQuestions.length !== selectedQuestions.length ||
      _.xor(filteredQuestions, selectedQuestions).length > 0
    ) {
      setSelectedQuestions(filteredQuestions);
    }
    priorities.forEach((value: number, key: string) => {
      if (!questionTypes.includes(key)) {
        const copy = new Map<string, number>(priorities);
        copy.delete(key);
        controller.setPriorities(curPlayerId, copy);
      }
    });
  }, [queue, questionTypes, priorities, controller, curPlayerId, selectedQuestions]);

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
    if (controller.questionsAsked(curPlayerId) !== 0) {
      toast({
        title: 'Cannot add more than 1 question to the queue',
        status: 'error',
      });
      return;
    }
    if (!newQuestion) {
      toast({
        title: 'Question must contain content',
        status: 'error',
      });
      return;
    }
    if (!questionType) {
      toast({
        title: 'Question must have a type',
        status: 'error',
      });
      return;
    }
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
  }, [questionType, controller, curPlayerId, newQuestion, groupQuestion, toast, townController]);

  const nextQuestion = useCallback(async () => {
    try {
      const questionId = controller.questionQueue.shift()?.id;
      if (!questionId) {
        throw new Error('No next question');
      }
      const questionList: string[] = [questionId];
      const taModel = await townController.takeOfficeHoursQuestions(controller, questionList);
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
  }, [controller, townController, toast, close]);

  const nextSelectedQuestions = useCallback(async () => {
    try {
      const taModel = await townController.takeOfficeHoursQuestions(controller, selectedQuestions);
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

  const updateModel = useCallback(async () => {
    try {
      const model = controller.officeHoursAreaModel();
      await townController.getUpdatedOfficeHoursModel(model);
    } catch (err) {
      toast({
        title: 'Unable to take next question',
        description: 'error',
        status: 'error',
      });
    }
  }, [controller, townController, toast]);

  const kickQuestion = useCallback(
    async (question: OfficeHoursQuestion) => {
      try {
        await townController.removeOfficeHoursQuestion(controller, question.id);
      } catch (err) {
        toast({
          title: 'Unable to kick question',
          description: 'error',
          status: 'error',
        });
      }
    },
    [controller, toast, townController],
  );

  const removeQuestionForPlayer = useCallback(async () => {
    try {
      await townController.removeOfficeHoursQuestionForPlayer(controller);
    } catch (err) {
      toast({
        title: 'Unable to remove question for student',
        description: 'error',
        status: 'error',
      });
    }
  }, [controller, toast, townController]);

  const joinQuestion = useCallback(
    async (questionId: string) => {
      try {
        await townController.joinOfficeHoursQuestion(controller, questionId);
        toast({
          title: 'Question Joined!',
          status: 'success',
        });
        return;
      } catch (err) {
        toast({
          title: 'Unable to join question',
          description: 'error',
          status: 'error',
        });
      }
    },
    [townController, controller, toast],
  );

  function RowView({ question }: { question: OfficeHoursQuestion }) {
    const allPlayers = townController.players;
    const players = allPlayers.filter(p => question.students.includes(p.id));
    let usernames: string[] = [];
    if (players && players.length) {
      usernames = players.map(p => p.userName.concat(' '));
    }
    if (!teachingAssistantsByID.includes(curPlayerId)) {
      return (
        <Tr>
          <Td>
            {question.groupQuestion && controller.questionsAsked(curPlayerId) === 0 ? (
              <Button
                colorScheme='green'
                onClick={() => {
                  joinQuestion(question.id);
                }}>
                join
              </Button>
            ) : null}
          </Td>
          <Td>{usernames}</Td>
          <Td>{question.questionType}</Td>
          <Td>{Math.round((Date.now() - question.timeAsked) / 600) / 100}</Td>
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
              onChange={() => {
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
          <Td>{Math.round((Date.now() - question.timeAsked) / 600) / 100}</Td>
          <Td>
            <Button
              colorScheme='red'
              onClick={() => {
                kickQuestion(question);
              }}>
              Kick
            </Button>
          </Td>
          <Td>{question.questionContent}</Td>
        </Tr>
      );
    }
  }
  function QuestionsViewer() {
    return (
      <TableContainer>
        <Table size='sm'>
          <TableCaption>Office Hours Queue</TableCaption>
          <Thead>
            <Tr>
              {!teachingAssistantsByID.includes(curPlayerId) ? <Th>Join</Th> : null}
              {teachingAssistantsByID.includes(curPlayerId) ? <Th>Select Question</Th> : null}
              <Th>Usernames</Th>
              <Th>Question Type</Th>
              {teachingAssistantsByID.includes(curPlayerId) ? <Th>group question</Th> : null}
              <Th>Time Waiting (min)</Th>
              {teachingAssistantsByID.includes(curPlayerId) ? <Th>Kick</Th> : null}
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
  function QuestionTypeViewer({ eachQuestionType }: { eachQuestionType: string }) {
    return (
      <Tr>
        <Td>
          <Checkbox
            type='checkbox'
            name='Should use Question Type in Priorities'
            isChecked={priorities.has(eachQuestionType)}
            value={eachQuestionType}
            onChange={() => {
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
        </Td>
        <Td>{eachQuestionType}</Td>
        <Td>
          {eachQuestionType !== 'Other' ? (
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
          ) : (
            <div>Default</div>
          )}
        </Td>
      </Tr>
    );
  }
  function QuestionTypesViewer() {
    return (
      <TableContainer>
        <Table size='sm' maxWidth='100px'>
          <TableCaption>Question Types</TableCaption>
          <Thead>
            <Tr>
              <Th>Select Question Type</Th>
              <Th>Question Type</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {questionTypes.map(eachQuestionType => (
              <QuestionTypeViewer key={eachQuestionType} eachQuestionType={eachQuestionType} />
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    );
  }
  const taView = (
    <ModalBody pb={6}>
      <>{QuestionsViewer()}</>
      <Button colorScheme='blue' mr={3} onClick={nextQuestion}>
        Take next question
      </Button>
      <Button colorScheme='red' mr={3} onClick={nextSelectedQuestions}>
        Take selected question(s)
      </Button>
      {/*this adds space lines*/}
      <VStack spacing={5} align='left'>
        <List></List>
        <FormLabel>Add Question Type</FormLabel>
      </VStack>
      <Input
        placeholder='question type'
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
      <VStack spacing={5} align='left'>
        <List></List>
        <FormLabel>Sort By Question Type?</FormLabel>
      </VStack>
      <Checkbox
        type='checkbox'
        name='Should Sort'
        isChecked={isSorted}
        onChange={() => {
          controller.setIsSorted(curPlayerId, !isSorted);
          updateModel();
        }}
      />
      <QuestionTypesViewer></QuestionTypesViewer>
      <FormLabel>{`Current Time Limit (MIN): ${
        timeLimit === undefined ? 'No Time Limit' : convertMilliToMin(timeLimit)
      }`}</FormLabel>
      <HStack spacing={10}>
        <Input
          id='Time Limit'
          placeholder='Time Limit'
          name='questionContent'
          type='string'
          width='10%'
          onChange={e => setInputTimeLimit(e.target.value)}
        />
        <Button
          colorScheme='yellow'
          onClick={() => {
            try {
              if (inputTimeLimit === 'na') {
                controller.timeLimit = undefined;
                updateModel();
              } else {
                const x = Number(inputTimeLimit);
                if (x <= 0 || !isInteger(inputTimeLimit)) {
                  throw Error();
                }
                controller.timeLimit = convertMinToMilli(x);
                updateModel();
              }
            } catch (e) {
              toast({
                title: 'Please enter a valid time limit',
                status: 'error',
              });
            }
          }}>
          {'Set New Time Limit (MIN or "na")'}
        </Button>
      </HStack>
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
        {QuestionsViewer()}
        <FormControl>
          <FormLabel htmlFor='questionContent'>Question Content</FormLabel>
          <Input
            id='questionContent'
            placeholder='Enter your question here'
            name='questionContent'
            // value={newQuestion}
            onChange={e => setQuestion(e.target.value)}
          />
          <Select
            placeholder='Select Question Type'
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
        <FormLabel htmlFor='groupQuestion'>Create Group Question?</FormLabel>
        <Checkbox
          type='checkbox'
          id='groupQuestion'
          name='groupQuestion'
          checked={groupQuestion}
          onChange={e => setGroupQuestion(e.target.checked)}
        />
        <div> </div>
        {controller.questionsAsked(curPlayerId) === 0 ? (
          <Button colorScheme='blue' mr={3} onClick={addQuestion}>
            Create Question
          </Button>
        ) : (
          <Button colorScheme='red' mr={3} onClick={removeQuestionForPlayer}>
            Remove Question
          </Button>
        )}
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
