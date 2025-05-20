import { coField, CoMap, CoList } from 'jazz-tools';

export class Point extends CoMap {
	x = coField.number;
	y = coField.number;
}

export class Segment extends CoMap {
	point = coField.ref(Point);
	handleIn = coField.ref(Point);
	handleOut = coField.ref(Point);
}

export class Segments extends CoList.Of(coField.ref(Segment)) {}

export class Path extends CoMap {
	segments = coField.ref(Segments);
	strokeColor = coField.string;
	strokeWidth = coField.number;
}

export class PaintingPaths extends CoList.Of(coField.ref(Path)) {}

export class Counter extends CoMap {
	painting = coField.ref(PaintingPaths);
	count = coField.number;
}

export class Paintings extends CoList.Of(coField.ref(Counter)) {}
