import type { StoreChangeEvent } from '@annotorious/core';
import { isImageAnnotation } from '@annotorious/annotorious';
import type { Annotation, Store } from '@annotorious/annotorious';
import { isConnectionAnnotation } from '../model';

interface Link {

  id: string;

  from: string;

  to: string;

}

export type ConnectionGraph = ReturnType<typeof createConnectionGraph>;

export const createConnectionGraph = <T extends Annotation>(store: Store<T>) => {

  let links: Link[] = [];

  const onCreateAnnotation = (a: T) => {
    if (isConnectionAnnotation(a)) {
      // Keep track of new connections
      const { from, to } = a.target.selector;
      links = [...links, { id: a.id, from, to }];
    }
  }

  const onDeleteAnnotation = (a: T) => {
    if (isConnectionAnnotation(a)) {
      // Keep track of deleted connections
      const { from, to } = a.target.selector;
      links = links.filter(l => l.from !== from && l.to !== to);
    } else if (isImageAnnotation(a)) {
      // Keep track of deleted image annotations & delete connected links
      const connected = links.filter(l => l.from === a.id || l.to === a.id);
      if (connected.length > 0)
        store.bulkDeleteAnnotation(connected.map(c => c.id))
    }
  }

  const isConnected = (fromId: string, toId: string) => {
    return links.some(l => (
      (l.from === fromId && l.to === toId) ||
      (l.from === toId && l.to === fromId)
    ))
  }

  const storeObserver = (event: StoreChangeEvent<T>) => {
    const { created, deleted } = event.changes;

    (created || []).map(onCreateAnnotation);
    (deleted || []).map(onDeleteAnnotation);
  }

  store.observe(storeObserver);

  const destroy = () => {
    store.unobserve(storeObserver);
  }

  return {
    destroy,
    isConnected
  }

}