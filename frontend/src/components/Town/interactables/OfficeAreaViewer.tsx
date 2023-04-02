import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { useInteractable, usePosterSessionAreaController } from '../../../classes/TownController';
import PosterSessionAreaController, {
  useImageContents,
  useStars,
  useTitle,
} from '../../../classes/PosterSessionAreaController';
import useTownController from '../../../hooks/useTownController';
import SelectPosterModal from './SelectPosterModal';
import PosterSessionAreaInteractable from './PosterSessionArea';
import OfficeHoursAreaController, { useQueue, useTAsByID } from '../../../classes/OfficeHoursAreaController';
import {
  ListItem, HStack, Tag, Badge,
  List, WrapItem
} from '@chakra-ui/react'
import { OfficeHoursQuestion } from '../../../types/CoveyTownSocket';

function QuestionView({question}: {question: OfficeHoursQuestion}){
  return (
    <ListItem key={question.id}>
      <Tag>{question.id}</Tag>
      <Tag>{question.questionContent}</Tag>
      <Tag>{question.timeAsked}</Tag>
    </ListItem>
  )
}

export function OfficeHourQueue({
                              controller,
                              isOpen,
                              close,
                            }: {
  controller: OfficeHoursAreaController;
  isOpen: boolean;
  close: () => void;
}): JSX.Element {
  const queue = useQueue(controller);
  const tas = useTAsByID(controller);
  const townController = useTownController();
  const curPlayerId = townController.ourPlayer.id;
  const toast = useToast();
  // useEffect(() => {
  //   townController.getPosterSessionAreaImageContents(controller);
  // }, [townController, controller]);
  return (<Modal
    isOpen={true}
    onClose={() => {
      close();
    }}>
    {<ModalHeader>{'Office Hours Queue'} </ModalHeader>}
    <List spacing={6}>
      {queue.map(eachQuestion => (<QuestionView question={eachQuestion}/>))}
    </List>
    <Button
      colorScheme='blue'
      onClick={() => {
        controller.questionQueue = queue.splice(1);
      }}>
      Poll
    </Button>
  </Modal>);
}

