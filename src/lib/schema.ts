import { co, z } from 'jazz-tools';

const Point = z.object({
	x: z.number(),
	y: z.number()
});

export const Path = co.map({
	segments: z.array(
		z.object({
			point: Point,
			handleIn: Point,
			handleOut: Point
		})
	),
	strokeColor: z.string(),
	strokeWidth: z.number()
});

export const PaintingPaths = co.list(Path);

export const PaintingCell = co.map({
	paths: PaintingPaths
});

export const PaintingCells = co.record(z.string(), PaintingCell);

export const Painting = co.map({
	cells: PaintingCells
});

export const MyAppAccount = co.account({
	profile: co.profile(),
	root: co.map({})
});

export const cellSize = 1000;

export const gridId = (x: number, y: number): string => {
	return `${Math.floor(x)}/${Math.floor(y)}`;
};

export const indexFromGridId = (gridId: string): { x: number; y: number } | undefined => {
	if (!gridId?.includes('/')) return undefined;
	const [xIndex, yIndex] = gridId.split('/').map(Number);
	return { x: xIndex, y: yIndex };
};
