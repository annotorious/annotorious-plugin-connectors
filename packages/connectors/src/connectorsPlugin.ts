import type { ImageAnnotation, ImageAnnotator, ImageAnnotatorState } from '@annotorious/annotorious';
import type { Point } from './model';
import { ConnectorLayer } from './components/ConnectorLayer';
import { createConnectionGraph } from './state';

export interface ConnectorPluginInstance {

  getMidpoint(id: string): Point | undefined;

  setEnabled(enabled: boolean): void;

  unmount(): void;

}

export const mountPlugin = (anno: ImageAnnotator<ImageAnnotation>): ConnectorPluginInstance => {

  let isEnabled = false;

  const graph = createConnectionGraph(anno.state.store);

  const connectorLayer = new ConnectorLayer({
    target: anno.element,
    props: {
      enabled: isEnabled,
      graph,
      state: anno.state as ImageAnnotatorState<ImageAnnotation>
    }
  });

  /** API **/

  const getMidpoint = (id: string) =>
    connectorLayer.getMidpoint(id);

  const setEnabled = (enabled: boolean) => {
    isEnabled = enabled;
    connectorLayer.$set({ enabled: isEnabled });
  }

  const unmount = () => {
    graph.destroy();
  }

  return { 
    getMidpoint,
    setEnabled,
    unmount
  }

}