import React, { useEffect, useState } from 'react';
import { Annotation, Annotator, ImageAnnotator, useAnnotator } from '@annotorious/react';
import { W3CImageRelationFormat } from '@annotorious/plugin-connectors'; 
import { ConnectionPopup, ConnectorPlugin } from '../src';

export const App = () => {

  const [mode, setMode] = useState<'ANNOTATE' | 'RELATIONS'>('ANNOTATE');

  const anno = useAnnotator<Annotator<Annotation, Annotation>>();

  useEffect(() => {
    if (!anno) return;

    const onUpdate = (a: Annotation, _: Annotation) => console.log('updated', a);
    anno.on('updateAnnotation', onUpdate);

    anno.loadAnnotations('annotations.json');

    return () => {
      anno.off('updateAnnotation', onUpdate);
    }
  }, [anno]);

  return (
    <div id="content">
      <div>
        <button onClick={() => setMode(mode => mode === 'ANNOTATE' ? 'RELATIONS' : 'ANNOTATE')}>
          {mode === 'ANNOTATE' ? 'Annotate' : 'Relations'}
        </button>
      </div>

      <ImageAnnotator
        // @ts-ignore
        adapter={W3CImageRelationFormat('640px-Hallstatt.jpg')}>
        <img src="640px-Hallstatt.jpg" />
      </ImageAnnotator>

      <ConnectorPlugin 
        enabled={mode === 'RELATIONS'}>

        <ConnectionPopup 
          popup={props => (
            <div>
              <button onClick={() => props.onCreateBody({ purpose: 'testing', value: 'test'})}>Add Tag</button>
            </div>
          )} />

      </ConnectorPlugin>
    </div>
  )

}