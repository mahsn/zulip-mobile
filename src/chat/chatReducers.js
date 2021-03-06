/* @flow */
import union from 'lodash.union';

import type {
  NarrowsState,
  MessageAction,
  MessageFetchCompleteAction,
  EventNewMessageAction,
  EventMessageDeleteAction,
} from '../types';
import {
  APP_REFRESH,
  LOGOUT,
  LOGIN_SUCCESS,
  ACCOUNT_SWITCH,
  MESSAGE_FETCH_COMPLETE,
  EVENT_NEW_MESSAGE,
  EVENT_MESSAGE_DELETE,
} from '../actionConstants';
import { LAST_MESSAGE_ANCHOR, FIRST_UNREAD_ANCHOR } from '../constants';
import { isMessageInNarrow } from '../utils/narrow';
import { NULL_OBJECT } from '../nullObjects';

const initialState: NarrowsState = NULL_OBJECT;

const messageFetchComplete = (
  state: NarrowsState,
  action: MessageFetchCompleteAction,
): NarrowsState => {
  const key = JSON.stringify(action.narrow);
  const fetchedMessageIds = action.messages.map(message => message.id);
  const replaceExisting =
    action.anchor === FIRST_UNREAD_ANCHOR || action.anchor === LAST_MESSAGE_ANCHOR;
  return {
    ...state,
    [key]: replaceExisting
      ? fetchedMessageIds
      : union(state[key], fetchedMessageIds).sort((a, b) => a - b),
  };
};

const eventNewMessage = (state: NarrowsState, action: EventNewMessageAction): NarrowsState => {
  let stateChange = false;
  const newState = Object.keys(state).reduce((msg, key) => {
    const isInNarrow = isMessageInNarrow(action.message, JSON.parse(key), action.ownEmail);
    const isCaughtUp = action.caughtUp[key] && action.caughtUp[key].newer;
    const messageDoesNotExist = state[key].find(id => action.message.id === id) === undefined;

    if (isInNarrow && isCaughtUp && messageDoesNotExist) {
      stateChange = true;
      msg[key] = [...state[key], action.message.id];
    } else {
      msg[key] = state[key];
    }
    return msg;
  }, {});
  return stateChange ? newState : state;
};

const eventMessageDelete = (
  state: NarrowsState,
  action: EventMessageDeleteAction,
): NarrowsState => {
  let stateChange = false;
  const newState = Object.keys(state).reduce((updatedState, key) => {
    updatedState[key] = state[key].filter(id => id !== action.messageId);
    stateChange = stateChange || updatedState[key].length < state[key].length;
    return updatedState;
  }, {});
  return stateChange ? newState : state;
};

export default (state: NarrowsState = initialState, action: MessageAction): NarrowsState => {
  switch (action.type) {
    case APP_REFRESH:
    case LOGOUT:
    case LOGIN_SUCCESS:
    case ACCOUNT_SWITCH:
      return initialState;

    case MESSAGE_FETCH_COMPLETE:
      return messageFetchComplete(state, action);

    case EVENT_NEW_MESSAGE:
      return eventNewMessage(state, action);

    case EVENT_MESSAGE_DELETE:
      return eventMessageDelete(state, action);

    default:
      return state;
  }
};
