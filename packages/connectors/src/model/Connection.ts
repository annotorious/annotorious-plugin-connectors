import type { ConnectionHandle, PinnedConnectionHandle } from './ConnectionHandle';

export interface Connection {

  start: PinnedConnectionHandle;

  layout: string;

  end: ConnectionHandle;

}