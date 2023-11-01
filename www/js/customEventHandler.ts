/**
 * since react doesn't quite support custom events, writing our own handler
 * having the ability to broadcast and emit events prevents files from being tightly coupled
 * if we want something else to happen when an event is emitted, we can just listen for it
 * instead of having to change the code at the point the event is emitted
 * 
 * looser coupling = point of broadcast doesn't 'know' what is triggered by that event
 * leads to more extensible code
 * consistent event names help us know what happens when
 * 
 * code based on: https://blog.logrocket.com/using-custom-events-react/
 */

import { logDebug } from './plugin/logger';

export const EVENT_NAMES = {
  CLOUD_NOTIFICATION_EVENT: 'cloud:push:notification',
  CONSENTED_EVENT: "data_collection_consented",
  INTRO_DONE_EVENT: "intro_done",
}

export function subscribe(eventName: string, listener) {
  logDebug("adding " + eventName + " listener");
  document.addEventListener(eventName, listener);
}

export function unsubscribe(eventName: string, listener){
  logDebug("removing " + eventName + " listener");
  document.removeEventListener(eventName, listener);
}

export function publish(eventName, data) {
  logDebug("publishing " + eventName + " with data " + JSON.stringify(data));
  const event = new CustomEvent(eventName, { detail: data });
  document.dispatchEvent(event);
}