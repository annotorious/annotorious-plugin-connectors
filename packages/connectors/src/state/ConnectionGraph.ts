import { writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { createNanoEvents } from 'nanoevents';
import type { AnnotatorState, ImageAnnotation } from '@annotorious/annotorious';
import type { ConnectionGraphEvents } from './ConnectionGraphEvents';

export interface Link {

  id: string;

  from: string;

  to: string; 

}

export type ConnectionGraph = ReturnType<typeof createConnectionGraph>;

export const createConnectionGraph = (state: AnnotatorState<ImageAnnotation>) => {

  const emitter = createNanoEvents<ConnectionGraphEvents>();

  const { subscribe, set } = writable<Link[]>([]);

  let links: Link[] = [];

  subscribe(l => links = l);

  const addLink = (from: string, to: string) => {
    const id = uuidv4();
    const link = { id, from, to };

    set([...links, {...link}]);

    emitter.emit('createConnection', from, to);

    return link;
  }

  const on = <E extends keyof ConnectionGraphEvents>(event: E, callback: ConnectionGraphEvents[E]) => 
    emitter.on(event, callback);

  return {
    addLink,
    links,
    on,
    subscribe
  }

}