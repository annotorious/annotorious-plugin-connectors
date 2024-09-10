import type OpenSeadragon from 'openseadragon';
import type { ImageAnnotation, ImageAnnotator, ImageAnnotatorState } from '@annotorious/annotorious';
import { UserSelectAction } from '@annotorious/openseadragon';
import type { ConnectorPluginInstance } from './connectorsPlugin';
import { OSDConnectorLayer } from './components/OSDConnectorLayer';
import { createConnectionGraph } from './state';

export const mountOSDPlugin = (
  anno: ImageAnnotator<ImageAnnotation>, 
  viewer: OpenSeadragon.Viewer
): ConnectorPluginInstance  => {

  const graph = createConnectionGraph(anno.state.store);

  let isEnabled = false;

  const connectorLayer = new OSDConnectorLayer({
    target: viewer.element.querySelector('.openseadragon-canvas')!,
    props: {
      enabled: isEnabled,
      graph,
      state: anno.state as ImageAnnotatorState<ImageAnnotation>,
      viewer
    }
  });

  /** API **/

  const getMidpoint = (id: string) =>
    connectorLayer.getMidpoint(id);

  const setEnabled = (enabled: boolean) => {
    isEnabled = enabled;

    connectorLayer.$set({ enabled: isEnabled });

    // TODO this should actually revert to the last
    // action set by the host application. (But how?)
    if (enabled)
      anno.setUserSelectAction(UserSelectAction.SELECT);
    else 
      anno.setUserSelectAction(UserSelectAction.EDIT);
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