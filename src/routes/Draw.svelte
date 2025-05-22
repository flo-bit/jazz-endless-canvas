<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import paper from 'paper';
	import { Group, type Loaded } from 'jazz-tools';
	import { ColorPicker } from '@fuxui/colors';
	import {
		Box,
		Button,
		cn,
		Heading,
		Input,
		Modal,
		Popover,
		SliderNumber,
		Subheading,
		toast,
		ToggleGroup,
		ToggleGroupItem
	} from '@fuxui/base';
	import NumberFlow from '@number-flow/svelte';

	import { PinchGesture } from '@use-gesture/vanilla';
	import {
		cellSize,
		gridId,
		PaintingCell,
		PaintingPaths,
		Path,
		Painting,
		indexFromGridId
	} from '$lib/schema';

	let { painting }: { painting: Loaded<typeof Painting> } = $props();

	let moveTool: paper.Tool | null = null;
	let drawTool: paper.Tool | null = null;

	let isFilling = $state(false);

	let path: paper.Path | null = null;
	let scope: paper.PaperScope | null = null;
	let currentColor = $state('#ec4899');

	let loaded = $state(false);

	let gridData: Record<
		string,
		{
			unsubscribe?: () => void;
			drawnPaths?: Record<string, paper.Path>;
			group?: paper.Group;
		}
	> = $state({});

	function addSubscription(id: string) {
		if (!painting || !painting.cells || !painting.cells[id]?.paths || gridData[id]?.unsubscribe) {
			return;
		}

		const sub = PaintingPaths.subscribe(
			painting.cells[id]?.paths.id,
			{
				resolve: {
					$each: true
				}
			},
			(painting) => {
				addPath(painting, id);
			}
		);
		// console.log('added subscription', id);

		gridData[id] ??= {};

		if (gridData[id].group) {
			gridData[id].group.visible = true;
		}

		gridData[id].unsubscribe = sub;
	}

	function removeSubscription(id: string) {
		if (!gridData[id]?.unsubscribe) return;

		gridData[id].unsubscribe();
		// console.log('removed subscription', id);
		gridData[id].unsubscribe = undefined;

		if (gridData[id].group) {
			gridData[id].group.visible = false;
		}
	}

	function addPath(painting: Loaded<typeof PaintingPaths>, id: string) {
		loaded = true;

		gridData[id] ??= {};
		gridData[id].drawnPaths ??= {};
		gridData[id].group ??= new paper.Group();

		let drawnPaths = gridData[id].drawnPaths;
		let group = gridData[id].group;

		for (let path of painting ?? []) {
			if (!path || drawnPaths[path.id]) continue;

			drawnPaths[path.id] = new paper.Path();
			drawnPaths[path.id].strokeColor = path.strokeColor as unknown as paper.Color;
			drawnPaths[path.id].strokeWidth = path.strokeWidth;

			group.addChild(drawnPaths[path.id]);

			for (let segment of path.segments ?? []) {
				if (!segment) continue;

				scope?.activate();

				let segmentPoint = new paper.Segment({
					point: new paper.Point(segment.point.x, segment.point.y),
					handleIn: new paper.Point(segment.handleIn.x, segment.handleIn.y),
					handleOut: new paper.Point(segment.handleOut.x, segment.handleOut.y)
				});

				drawnPaths[path.id].add(segmentPoint);
			}

			if (path.filled) {
				drawnPaths[path.id].fillColor = path.strokeColor as unknown as paper.Color;
			}
		}
	}

	let grid: paper.Group | null = null;

	function drawGrid() {
		let color = '#27272a' as unknown as paper.Color;
		grid = new paper.Group();
		for (let x = -50; x < 50; x++) {
			let topPoint = new paper.Point((x * cellSize) / 5, cellSize * -50);
			let bottomPoint = new paper.Point((x * cellSize) / 5, cellSize * 50);
			let aLine = new paper.Path.Line(topPoint, bottomPoint);
			aLine.strokeColor = color;
			aLine.strokeWidth = x % 5 === 0 ? 4 : 1;

			let leftPoint = new paper.Point(cellSize * -50, (x * cellSize) / 5);
			let rightPoint = new paper.Point(cellSize * 50, (x * cellSize) / 5);
			let bLine = new paper.Path.Line(leftPoint, rightPoint);
			bLine.strokeColor = color;
			bLine.strokeWidth = x % 5 === 0 ? 4 : 1;

			grid.addChild(aLine);
			grid.addChild(bLine);
		}
	}

	$effect(() => {
		if (!gridData[gridId(0, 0)] && painting && painting.cells) {
			updatedPosition();
		}
	});

	onDestroy(() => {
		for (let id in gridData) {
			if (gridData[id]?.unsubscribe) {
				gridData[id].unsubscribe();
				delete gridData[id];
			}
		}
	});

	function getCellBounds() {
		let bounds = scope?.view.bounds;
		if (!bounds) return;

		let topY = Math.floor(bounds.y / cellSize) - 2;
		let bottomY = Math.floor((bounds.y + bounds.height) / cellSize) + 2;
		let leftX = Math.floor(bounds.x / cellSize) - 2;
		let rightX = Math.floor((bounds.x + bounds.width) / cellSize) + 2;

		return {
			top: topY,
			bottom: bottomY,
			left: leftX,
			right: rightX
		};
	}

	function updatedPosition() {
		// get visible bounds
		let bounds = getCellBounds();
		if (!bounds) return;

		// console.log('updated position', bounds);

		let visibleCells = new Set<string>();
		for (let x = bounds.left; x <= bounds.right; x++) {
			for (let y = bounds.top; y <= bounds.bottom; y++) {
				addSubscription(gridId(x, y));
				visibleCells.add(gridId(x, y));
			}
		}

		for (let id in gridData) {
			if (!visibleCells.has(id)) {
				removeSubscription(id);
			}
		}

		currentX = (scope?.view.center.x ?? 0) / cellSize;
		currentY = (scope?.view.center.y ?? 0) / cellSize;

		if (grid) {
			// move grid to center on current position
			let x = Math.floor((scope?.view.center.x ?? 0) / cellSize) * cellSize;
			let y = Math.floor((scope?.view.center.y ?? 0) / cellSize) * cellSize;
			grid.position = new paper.Point(x, y);
		}
	}

	function onZoom(delta: number, origin: number[]) {
		if (!scope) return;

		let newZoom = scope.view.zoom;
		let oldZoom = scope.view.zoom;

		newZoom = scope.view.zoom + delta;

		newZoom = Math.max(0.15, newZoom);
		newZoom = Math.min(5, newZoom);

		let beta = oldZoom / newZoom;

		let mousePosition = new paper.Point(origin[0], origin[1]);

		let viewPosition = scope.view.viewToProject(mousePosition);

		let mpos = viewPosition;
		let ctr = scope.view.center;

		let pc = mpos.subtract(ctr);
		let offset = mpos.subtract(pc.multiply(beta)).subtract(ctr);

		scope.view.zoom = newZoom;
		scope.view.center = scope.view.center.add(offset);

		updatedPosition();
	}

	let isZooming = false;

	onMount(async () => {
		if (!canvas) {
			return;
		}

		setInterval(() => {
			updatedPosition();
		}, 2000);

		document.addEventListener('gesturestart', (e) => e.preventDefault());
		document.addEventListener('gesturechange', (e) => e.preventDefault());

		scope = new paper.PaperScope();
		scope.setup(canvas);
		drawTool = new paper.Tool();

		let move = 40;
		window.addEventListener('keydown', (e) => {
			// arrow keys for moving
			if (e.key === 'ArrowUp') {
				scope?.view.translate(new paper.Point(0, move));
			} else if (e.key === 'ArrowDown') {
				scope?.view.translate(new paper.Point(0, -move));
			} else if (e.key === 'ArrowLeft') {
				scope?.view.translate(new paper.Point(move, 0));
			} else if (e.key === 'ArrowRight') {
				scope?.view.translate(new paper.Point(-move, 0));
			}

			// same for w a s d
			if (e.code === 'KeyW') {
				scope?.view.translate(new paper.Point(0, move));
			} else if (e.code === 'KeyS') {
				scope?.view.translate(new paper.Point(0, -move));
			} else if (e.code === 'KeyA') {
				scope?.view.translate(new paper.Point(move, 0));
			} else if (e.code === 'KeyD') {
				scope?.view.translate(new paper.Point(-move, 0));
			}

			if (e.key === '+') {
				onZoom(0.2, [window.innerWidth / 2, window.innerHeight / 2]);
			} else if (e.key === '-') {
				onZoom(-0.2, [window.innerWidth / 2, window.innerHeight / 2]);
			}
		});

		const gesture = new PinchGesture(canvas, (e) => {
			isOpen = false;
			if (!scope) return;

			if (e.first) {
				isZooming = true;
			}

			if (e.last) {
				isZooming = false;
			}

			onZoom(e.delta[0], e.origin);

			if (path) {
				// remove path
				path.remove();
				path = null;
			}
		});

		drawTool.onMouseDown = (event: paper.ToolEvent) => {
			if (isZooming) return;

			// if (path) {
			// 	finishPath();
			// 	return;
			// }
			isOpen = false;

			scope?.activate();

			path = new paper.Path();
			path.strokeColor = currentColor as unknown as paper.Color;
			path.strokeWidth = strokeWidth;

			path.add(event.point);
		};

		drawTool.onMouseDrag = (event: paper.ToolEvent) => {
			isOpen = false;

			if (path === null || isZooming) {
				return;
			}
			scope?.activate();

			path.add(event.point);
		};

		drawTool.onMouseUp = (event: paper.ToolEvent) => {
			if (isZooming) return;

			finishPath();
		};

		moveTool = new paper.Tool();

		moveTool.onMouseDrag = function (event: any) {
			if (!scope) return;

			var pan_offset = event.point.subtract(event.downPoint);
			scope.view.center = scope.view.center.subtract(pan_offset);

			updatedPosition();
		};

		scope.tool = moveTool;

		drawGrid();
	});

	let canvas: HTMLCanvasElement | null = null;

	let color = $state({
		r: 0.92,
		g: 0.28,
		b: 0.6
	});

	let strokeWidth = $state(3);

	let selectedTool = $state('move');

	let isOpen = $state(false);

	function finishPath() {
		if (!path) return;

		scope?.activate();

		path.simplify(10);

		const group = Group.create();
		group.addMember('everyone', 'writer');

		if (isFilling) {
			path.fillColor = currentColor as unknown as paper.Color;
		}

		let coPath = Path.create(
			{
				segments: path.segments.map((segment) => {
					return {
						point: {
							x: segment.point.x,
							y: segment.point.y
						},
						handleIn: {
							x: segment.handleIn.x,
							y: segment.handleIn.y
						},
						handleOut: {
							x: segment.handleOut.x,
							y: segment.handleOut.y
						}
					};
				}),
				strokeColor: currentColor,
				strokeWidth: strokeWidth,
				filled: isFilling
			},
			group
		);

		let gridIdX = Math.floor(path.segments[0].point.x / cellSize);
		let gridIdY = Math.floor(path.segments[0].point.y / cellSize);

		let id = gridId(gridIdX, gridIdY);

		gridData[id] ??= {};
		gridData[id].drawnPaths ??= {};
		gridData[id].drawnPaths[coPath.id] = path;

		if (!painting.cells) return;

		if (!painting.cells[id]) {
			painting.cells[id] = PaintingCell.create(
				{
					paths: PaintingPaths.create([], group)
				},
				group
			);
		}
		painting.cells[id]?.paths?.push(coPath);

		path = null;
	}

	let currentX = $state(0.0001);
	let currentY = $state(0.0001);

	let coordinatesOpen = $state(false);
	let xCoordinate = $state('0');
	let yCoordinate = $state('0');
</script>

<div class="fixed right-2 bottom-2 z-20 flex flex-col gap-3"></div>

<canvas
	bind:this={canvas}
	class={cn(
		'fixed h-screen w-screen',
		selectedTool === 'move' ? 'cursor-grab' : 'cursor-crosshair'
	)}
	data-paper-resize="true"
></canvas>

<div class="fixed top-2 left-2 z-20 hidden">
	<Button
		onclick={() => {
			// add 100 random paths
			let paths = [];
			for (let i = 0; i < 100000; i++) {
				const path = new paper.Path();
				path.strokeColor = currentColor as unknown as paper.Color;
				path.strokeWidth = strokeWidth;
				let rx = Math.random() * 10000 - 5000;
				let ry = Math.random() * 10000 - 5000;
				path.add(new paper.Point(rx, ry));
				path.add(new paper.Point(rx + 50, ry + 50));
				paths.push(path);

				continue;

				const group = Group.create();
				group.addMember('everyone', 'writer');

				let coPath = Path.create(
					{
						segments: path.segments.map((segment) => {
							return {
								point: {
									x: segment.point.x,
									y: segment.point.y
								},
								handleIn: {
									x: segment.handleIn.x,
									y: segment.handleIn.y
								},
								handleOut: {
									x: segment.handleOut.x,
									y: segment.handleOut.y
								}
							};
						}),
						strokeColor: currentColor,
						strokeWidth: strokeWidth
					},
					group
				);

				painting?.paths?.push(coPath);
			}

			//create new group
			const pGroup = new paper.Group(paths);
		}}
	>
		Add lots
	</Button>
</div>

<Modal bind:open={coordinatesOpen}>
	<div class="flex flex-col gap-8 items-center">
		<Heading>Enter coordinates</Heading>

		<form
			class="flex flex-col gap-2 items-center"
			onsubmit={() => {
				if (!scope) return;

				let x = parseFloat(xCoordinate);
				let y = parseFloat(yCoordinate);

				if (isNaN(x) || isNaN(y)) {
					toast.error('Invalid coordinates');
					return;
				}

				scope.view.center = new paper.Point(x * cellSize, y * cellSize);

				updatedPosition();

				coordinatesOpen = false;
			}}
		>
			<div class="flex max-w-40 gap-2">
				<Input bind:value={xCoordinate} class="w-1/2" />
				<Input bind:value={yCoordinate} class="w-1/2" />
			</div>

			<Button type="submit">Jump to coordinates</Button>
		</form>
	</div>
</Modal>

<div class="fixed top-2 left-2 z-20 flex gap-2 p-0">
	<button
		onclick={() => {
			coordinatesOpen = true;
		}}
		class="cursor-pointer transition-all duration-200 hover:scale-105 hover:opacity-90"
	>
		<Box class="px-1 py-1">
			<div class="bg-base-800/50 rounded-2xl px-2">
				<NumberFlow
					value={currentX}
					format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
				/> /
				<NumberFlow
					value={currentY}
					format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
				/>
			</div>
		</Box>
	</button>

	<Button
		variant="secondary"
		onclick={() => {
			let cellIds = Object.keys(painting?.cells ?? {});
			// console.log(cellIds);
			let randomCellId = cellIds[Math.floor(Math.random() * cellIds.length)];

			let cell = indexFromGridId(randomCellId);

			if (!cell || !scope) return;

			scope.view.center = new paper.Point(cell.x * cellSize, cell.y * cellSize);

			updatedPosition();
		}}
	>
		Jump to random point
	</Button>
</div>
{#if !painting || !loaded}
	<div class="pointer-events-none fixed inset-0 flex h-full w-full items-center justify-center">
		<Subheading>Loading...</Subheading>
	</div>
{/if}

<div class="absolute right-2 bottom-2">
	<div class="bg-base-900 flex items-center justify-center gap-4 rounded-2xl p-2">
		<ToggleGroup
			type="single"
			bind:value={
				() => {
					return selectedTool;
				},
				(value) => {
					if (!value) return;

					selectedTool = value;
					if (!scope) return;
					if (selectedTool === 'move') {
						scope.tool = moveTool!;
					} else {
						scope.tool = drawTool!;
					}

					if (selectedTool === 'fill') {
						isFilling = true;
					} else {
						isFilling = false;
					}
				}
			}
		>
			<!-- move -->
			<ToggleGroupItem value="move">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
					class="size-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
					/>
				</svg>
			</ToggleGroupItem>

			<!-- rotate -->
			<ToggleGroupItem value="paint">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
					class="size-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
					/>
				</svg>
			</ToggleGroupItem>

			<!-- <ToggleGroupItem value="fill">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-paint-bucket-icon lucide-paint-bucket"
					><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" /><path
						d="m5 2 5 5"
					/><path d="M2 13h15" /><path
						d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"
					/></svg
				>
			</ToggleGroupItem> -->
		</ToggleGroup>

		<Popover side="bottom" bind:open={isOpen}>
			{#snippet child({ props })}
				<button
					{...props}
					class="bg-base-400/30 border-base-700/30 dark:border-base-400 flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border shadow-md backdrop-blur-sm"
				>
					<div
						class="size-8 rounded-2xl"
						style="background-color: rgb({color.r * 255}, {color.g * 255}, {color.b * 255})"
					></div>
				</button>
			{/snippet}
			<Subheading class="mb-2 text-sm sm:text-base">Stroke Width</Subheading>

			<SliderNumber
				type="single"
				bind:value={strokeWidth}
				min={1}
				max={10}
				step={1}
				class="min-w-36"
			/>

			<Subheading class="mt-6 mb-2 text-sm sm:text-base">Color</Subheading>

			<ColorPicker
				bind:rgb={color}
				onchange={(color) => {
					currentColor = color.hex;
				}}
				quickSelects={[
					{
						label: 'white',
						rgb: {
							r: 1,
							g: 1,
							b: 1
						}
					},
					{
						label: 'black',
						rgb: {
							r: 0,
							g: 0,
							b: 0
						}
					},
					{
						label: 'red',
						rgb: {
							r: 0.93,
							g: 0.26,
							b: 0.26
						}
					},
					{
						label: 'blue',
						rgb: {
							r: 0.23,
							g: 0.5,
							b: 0.96
						}
					},
					{
						label: 'green',
						rgb: {
							r: 0.13,
							g: 0.77,
							b: 0.36
						}
					},
					{
						label: 'yellow',
						rgb: {
							r: 0.91,
							g: 0.7,
							b: 0.03
						}
					},
					{
						label: 'pink',
						rgb: {
							r: 0.92,
							g: 0.28,
							b: 0.6
						}
					}
				]}
			/>
		</Popover>
	</div>
</div>
