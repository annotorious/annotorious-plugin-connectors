import { ShapeType, type ImageAnnotation, type PolygonGeometry } from '@annotorious/annotorious';
import { roundCorners } from 'svg-round-corners';
import type { 
  Connection, 
  ConnectionHandle, 
  Direction, 
  FloatingConnectionHandle, 
  Path, 
  PinnedConnectionHandle,
  Point
} from './model';

const isFloatingConnectionHandle = (arg: any): arg is FloatingConnectionHandle => 
  arg.point !== undefined && 
  typeof arg.point.x === 'number' && 
  typeof arg.point.y === 'number';

const invert = (dir: Direction): Direction =>
  dir === 'E' ? 'W' :
  dir === 'W' ? 'E' :
  dir === 'S' ? 'N' :
  'S';

/** 
 * Returns all handles for this image annotation.
 */
const getHandles = (annotation: ImageAnnotation): PinnedConnectionHandle[] => {
  if (annotation.target.selector.type === ShapeType.POLYGON) {
    const { minX, minY, maxX, maxY } = annotation.target.selector.geometry.bounds;

    const w = maxX - minX;
    const h = maxY - minY;

    const { points } = (annotation.target.selector.geometry as PolygonGeometry);

    const getClosest = (pt: Point): Point => {
      const distSq = (xy: number[]) => {
        const dx = pt.x - xy[0];
        const dy = pt.y - xy[1];
        return dx * dx + dy * dy;
      }

      const sorted = [...points].sort((a, b) => distSq(a) - distSq(b));
      return { x: sorted[0][0], y: sorted[0][1] };
    }

    // Use closest point instead of bound middle
    return [
      { point: getClosest({ x: minX + w / 2, y: maxY }), annotation, direction: 'N' }, // top
      { point: getClosest({ x: maxX, y: minY + h / 2 }), annotation, direction: 'E' }, // right
      { point: getClosest({ x: minX + w / 2, y: minY }), annotation, direction: 'S' }, // bottom
      { point: getClosest({ x: minX, y: minY + h / 2 }), annotation, direction: 'W' }  // left
    ];
  } else {
    // Rectangles and ellipses
    const { minX, minY, maxX, maxY } = annotation.target.selector.geometry.bounds;

    const w = maxX - minX;
    const h = maxY - minY;

    return [
      { point: { x: minX + w / 2, y: maxY }, annotation, direction: 'N' }, // top
      { point: { x: maxX, y: minY + h / 2 }, annotation, direction: 'E' }, // right
      { point: { x: minX + w / 2, y: minY }, annotation, direction: 'S' }, // bottom
      { point: { x: minX, y: minY + h / 2 }, annotation, direction: 'W' }  // left
    ];
  }
}

/**
 * Enumerate possible I-, L- and S-path layouts between two handles. (Reminder:
 * a handle has an x/y position and a starting direction.)
 */
const enumeratePathLayouts = (start: PinnedConnectionHandle, end: ConnectionHandle) => {
  const dx = end.point.x - start.point.x;
  const dy = end.point.y - start.point.y;

  const sd = start.direction;
  const ed = 'direction' in end ? invert(end.direction) : undefined;

  const pathLayouts = [
    { dx: (dx: number) => dx < 0, dy: (dy: number) => dy > 0,   layouts: ['W-N', 'N-W', 'W-N-W', 'N-W-N']},
    { dx: (dx: number) => dx < 0, dy: (dy: number) => dy === 0, layouts: ['W']},
    { dx: (dx: number) => dx < 0, dy: (dy: number) => dy < 0,   layouts: ['W-S', 'S-W', 'W-S-W', 'S-W-S']},
    { dx: (dx: number) => dx === 0, dy: (dy: number) => dy > 0, layouts: ['N'] },
    { dx: (dx: number) => dx === 0, dy: (dy: number) => dy < 0, layouts: ['S'] },
    { dx: (dx: number) => dx > 0, dy: (dy: number) => dy > 0,   layouts: ['E-N', 'N-E', 'E-N-E', 'N-E-N']},
    { dx: (dx: number) => dx > 0, dy: (dy: number) => dy === 0, layouts: ['E']},
    { dx: (dx: number) => dx > 0, dy: (dy: number) => dy < 0,   layouts: ['E-S', 'S-E', 'E-S-E', 'S-E-S']}
  ];

  // Paths that work for this dx/dy combination
  const potentialLayouts = pathLayouts.filter(row => row.dx(dx) && row.dy(dy));

  // Paths that work for this dx/dy combination and start/end direction
  return potentialLayouts.reduce<string[]>((all, row) => {
    const validLayouts = row.layouts.filter(l => 
      (l.startsWith(sd) && (!ed || l.endsWith(ed))) ||
      // A half-sensible workaround to support intersecting shapes
      (l.startsWith(invert(sd)) && (!ed || l.endsWith(invert(ed)))));
    return [...all, ...validLayouts];
  }, []); 
}

/** 
 * Enumerates all possible I-, L- and S-path layouts between all handles on 
 * the given image annotations.
 */
const enumerateConnections = (source: ImageAnnotation, target: FloatingConnectionHandle | ImageAnnotation) => {
  const sourceHandles = getHandles(source);
  const targetHandles: ConnectionHandle[] = isFloatingConnectionHandle(target) ? [target] : getHandles(target);

  const connections: Connection[] = [];

  sourceHandles.forEach(start => {
    targetHandles.forEach(end => {
      const layouts = enumeratePathLayouts(start, end);
      connections.push(...layouts.map(layout => ({ start, layout, end })));
    });
  });

  return connections;
}

export const getConnection = (source: ImageAnnotation, target: FloatingConnectionHandle | ImageAnnotation) => {
  const connections = enumerateConnections(source, target);

  connections.sort((a, b) => {
    const lengthA = getLength(a);
    const lengthB = getLength(b);

    if (lengthA !== lengthB)
      return lengthA - lengthB;

    return countCorners(a) - countCorners(b);
  });

  return connections[0];
}

const countCorners = (connection: Connection) => 
  connection.layout.split('-').length - 1;

const getLength = (connection: Connection) => {
  const dx = connection.end.point.x - connection.start.point.x;
  const dy = connection.end.point.y - connection.start.point.y;
  return Math.abs(dx) + Math.abs(dy);
}

export const computePath = (connection: Connection, r?: number): Path => {
  const segments = connection.layout.split('-') as Direction[];

  const isS = segments.length === 3;

  const dx = connection.end.point.x - connection.start.point.x;
  const dy = connection.end.point.y - connection.start.point.y;

  const d = segments.reduce<string>((d, direction, idx) => {
    let delta: number;

    switch (direction) {
      case 'N': 
      case 'S':
        delta = (!isS || idx === 1) ? dy : dy / 2;
        return `${d} v ${delta}`;

      case 'E': 
      case 'W':
        delta = (!isS || idx === 1) ? dx : dx / 2;
        return `${d} h ${delta}`;
    }
  }, `M ${connection.start.point.x} ${connection.start.point.y}`);

  const rounded = r !== undefined && r > 0 ? roundCorners(d, r).path : d;

  return { start: connection.start.point, end: connection.end.point, d: rounded };
}
