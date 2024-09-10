import type { W3CAnnotation } from '@annotorious/annotorious';

export const isW3CRelationLinkAnnotation = (arg: any): arg is W3CRelationLinkAnnotation =>
  arg.motivation !== undefined && 
  arg.motivation === 'linking' &&
  arg.body !== undefined && 
  arg.target !== undefined &&
  typeof arg.body === 'string' && 
  typeof arg.target === 'string';

export const isW3CRelationMetaAnnotation = (arg: any): arg is W3CRelationMetaAnnotation =>
  (arg.motivation === undefined || arg.motivation === 'tagging') &&
   typeof arg.target === 'string';

export interface W3CRelationLinkAnnotation extends Omit<W3CAnnotation, 'body'> {

  motivation: 'linking';

  body: string;

  target: string;

}

export interface W3CRelationMetaAnnotation extends Omit<W3CAnnotation, 'target'> {

  motivation?: 'tagging',

  target: string;

}


