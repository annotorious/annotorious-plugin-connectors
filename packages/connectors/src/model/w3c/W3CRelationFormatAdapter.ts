import { v5 as uuidv5 } from 'uuid';
import { W3CImageFormat } from '@annotorious/annotorious';
import { isConnectionAnnotation, type ConnectionAnnotation } from '../ConnectionAnnotation';
import { isW3CRelationLinkAnnotation, isW3CRelationMetaAnnotation } from './W3CRelationAnnotation';
import type { W3CRelationLinkAnnotation, W3CRelationMetaAnnotation } from './W3CRelationAnnotation';
import type { 
  FormatAdapter, 
  ImageAnnotation, 
  ParseResult, 
  W3CAnnotationBody, 
  W3CImageAnnotation, 
  W3CImageFormatAdapter, 
  W3CImageFormatAdapterOpts
} from '@annotorious/openseadragon';

// Shorthand 
type W3CAnnotationOrRelation = 
  W3CImageAnnotation | W3CRelationLinkAnnotation | [W3CRelationLinkAnnotation, W3CRelationMetaAnnotation];

export type W3CRelationFormatAdapter = FormatAdapter<
  // Internal model
  ImageAnnotation | ConnectionAnnotation, 
  // Serialized to W3C
  W3CAnnotationOrRelation>;

export const W3CImageRelationFormat = (
  source: string,
  opts: W3CImageFormatAdapterOpts = { strict: true, invertY: false }
): W3CRelationFormatAdapter => {
  const imageAdapter = W3CImageFormat(source, {...opts, strict: false });

  const parse = (serialized: W3CAnnotationOrRelation) =>
    parseW3C(serialized, imageAdapter);

  const parseAll = (serialized: (W3CImageAnnotation | W3CRelationLinkAnnotation | W3CRelationMetaAnnotation)[]) => {
    const metaAnnotations = serialized.filter(a => 
      isW3CRelationMetaAnnotation(a)) as W3CRelationMetaAnnotation[];

    const otherAnnotations = serialized.filter(a => 
      !isW3CRelationMetaAnnotation(a)) as (W3CImageAnnotation | W3CRelationLinkAnnotation)[];

    // Pair a link annotation with its meta annotation, if possible
    const pair = (link: W3CRelationLinkAnnotation): W3CRelationLinkAnnotation | [W3CRelationLinkAnnotation, W3CRelationMetaAnnotation] => {
      const meta = metaAnnotations.find(a => a.target === link.id);
      return meta ? [link, meta] : link;
    } 

    return otherAnnotations.reduce((result, next) => {
      const { parsed, error } = isW3CRelationLinkAnnotation(next)
        ? parse(pair(next))
        : parse(next);

      return error ? {
        parsed: result.parsed,
        failed: [...result.failed, next ]
      } : parsed ? {
        parsed: [...result.parsed, parsed ],
        failed: result.failed
      } : {
        ...result
      }
    }, { parsed: [] as (ImageAnnotation | ConnectionAnnotation)[], failed: [] as any[]});
  }

  const serialize = (annotation: ImageAnnotation | ConnectionAnnotation) =>
    serializeW3C(annotation, imageAdapter);

  return { parse, parseAll, serialize }
}

export const parseW3C = (
  arg: W3CAnnotationOrRelation,
  imageAdapter: W3CImageFormatAdapter 
): ParseResult<ImageAnnotation | ConnectionAnnotation> => {

  const parseConnection = (arg: W3CRelationLinkAnnotation, meta?: W3CRelationMetaAnnotation) => {
    const { id, body, target } = arg;

    const parsed: ConnectionAnnotation = {
      id,
      motivation: 'linking',
      bodies: meta 
        ? Array.isArray(meta.body) ? meta.body : [meta.body]
        : [],
      target: {
        annotation: id,
        selector: {
          from: target,
          to: body
        }
      }
    };

    return parsed;
  };

  if (Array.isArray(arg)) {
    const [link, meta] = arg;
    const parsed = parseConnection(link, meta);
    return { parsed };
  } else if (isW3CRelationLinkAnnotation(arg)) {
    const parsed = parseConnection(arg);
    return { parsed };
  } else {
    return imageAdapter.parse(arg)
  }
}

export const serializeW3C = (
  annotation: ImageAnnotation | ConnectionAnnotation, 
  imageAdapter: W3CImageFormatAdapter
): W3CImageAnnotation | W3CRelationLinkAnnotation | [W3CRelationLinkAnnotation, W3CRelationMetaAnnotation] => {
  if (isConnectionAnnotation(annotation)) {
    const { id, bodies, target: { selector: { from, to }} } = annotation;

    const link = { 
      id,
      motivation: 'linking',
      body: to,
      target: from
    } as W3CRelationLinkAnnotation;

    if (bodies.length > 0) {
      // Here's a key problem: each annotation needs a stable ID. However, the "meta annotation"
      // does not exist in the internal model. (Meta payload is just stored as bodies.) Therefore,
      // we're deriving a UUID from the annotation UUID, and use that for the meta annotation.
      const meta = {
        id: uuidv5('@annotorious/plugin-connectors', id),
        motivation: 'tagging',
        body: bodies.map(b => ({
          purpose: b.purpose,
          value: b.value
        } as W3CAnnotationBody)),
        target: id
      } as W3CRelationMetaAnnotation;

      return [link, meta];
    } else {
      return link;
    }
  } else {
    return imageAdapter.serialize(annotation)
  }
}