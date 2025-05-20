<script lang="ts">
	import { onMount } from 'svelte';
	import paper from 'paper';
	import { Counter, PaintingPaths, Path, Point, Segment, Segments } from '$lib/schema';
	import { CoState } from 'jazz-svelte';
	import { Group } from 'jazz-tools';
	import { ColorPicker } from '@fuxui/colors';
	import {
		Button,
		cn,
		Popover,
		SliderNumber,
		Subheading,
		toast,
		ToggleGroup,
		ToggleGroupItem
	} from '@fuxui/base';
	import { base } from '$app/paths';

	import { PinchGesture } from '@use-gesture/vanilla';

	let { painting }: { painting: CoState<Counter> } = $props();

	let tool: paper.Tool | null = null;
	let path: paper.Path | null = null;
	let scope: paper.PaperScope | null = null;
	let drawnPaths: { [key: string]: paper.Path } = $state({});
	let currentColor = $state('#ec4899');
	let subscription = $state(null);

	$effect(() => {
		if (subscription || !painting.current?.painting) return;

		PaintingPaths.subscribe(
			painting.current.painting.id,
			{
				resolve: {
					$each: {
						segments: {
							$each: {
								point: true,
								handleIn: true,
								handleOut: true
							}
						}
					}
				}
			},
			(painting) => {
				// get all paths
				for (let path of painting ?? []) {
					if (!path || drawnPaths[path.id]) continue;

					drawnPaths[path.id] = new paper.Path();
					drawnPaths[path.id].strokeColor = path.strokeColor as unknown as paper.Color;
					drawnPaths[path.id].strokeWidth = path.strokeWidth;

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
				}
			}
		);
	});

	let isDragging = false;
	let lastTouch = { x: 0, y: 0 };
	let currentPosition = { x: 0, y: 0 };

	// const handleTouchStart = (event: TouchEvent) => {
	// 	if (event.touches.length === 2) {
	// 		// Start dragging, record initial touch points
	// 		isDragging = true;
	// 		lastTouch.x = event.touches[0].pageX - currentPosition.x;
	// 		lastTouch.y = event.touches[0].pageY - currentPosition.y;
	// 	}
	// };

	// const handleTouchMove = (event: TouchEvent) => {
	// 	if (isDragging && event.touches.length === 2) {
	// 		// Calculate the new position based on finger movement
	// 		currentPosition.x = event.touches[0].pageX - lastTouch.x;
	// 		currentPosition.y = event.touches[0].pageY - lastTouch.y;

	// 		scope?.view.translate(currentPosition);
	// 	}
	// };

	// const handleTouchEnd = (event: TouchEvent) => {
	// 	if (event.touches.length < 2) {
	// 		// End dragging when fewer than two fingers are on the screen
	// 		isDragging = false;
	// 	}
	// };

	onMount(async () => {
		if (!canvas) {
			return;
		}

		document.addEventListener('gesturestart', (e) => e.preventDefault());
		document.addEventListener('gesturechange', (e) => e.preventDefault());

		scope = new paper.PaperScope();
		scope.setup(canvas);
		tool = new paper.Tool();

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
		});

		let startMatrix: paper.Matrix;
		let startMatrixInverted: paper.Matrix;
		let p0ProjectCoords: paper.Point;

		function getCenterPoint(e: any) {
			return new paper.Point(e.origin[0], e.origin[1]);
		}

		const gesture = new PinchGesture(canvas, (e) => {
			isOpen = false;
			if(!scope)return;
			console.log(e);

			// if (e.first) {
			// 	startMatrix = scope.view.matrix.clone();
			// 	startMatrixInverted = startMatrix.inverted();
			// 	const p0 = new paper.Point(e.origin[0], e.origin[1]);
			// 	p0ProjectCoords = scope.view.viewToProject(p0);
			// } else if (!e.last) {
			// 	const p = new paper.Point(e.origin[0], e.origin[1]);
			// 	const pProject0 = p.transform(startMatrixInverted);
			// 	let currentScale = scope.view.scaling.x ?? 1;
			// 	const delta = pProject0.subtract(p0ProjectCoords).divide(currentScale + e.delta[0]);
			// 	scope.view.matrix = startMatrix.clone().scale(currentScale + e.delta[0], p0ProjectCoords).translate(delta);
			// }
		});

		tool.onMouseDown = (event: paper.ToolEvent) => {
			isOpen = false;
			if (event.modifiers.shift || selectedTool === 'move') {
				return;
			}

			scope?.activate();

			path = new paper.Path();
			path.strokeColor = currentColor as unknown as paper.Color;
			path.strokeWidth = strokeWidth;

			path.add(event.point);
		};

		tool.onMouseDrag = (event: paper.ToolEvent) => {
			isOpen = false;
			if (event.modifiers.shift || selectedTool === 'move') {
				scope?.view.translate(event.delta);
				return;
			}

			if (path === null) {
				return;
			}
			scope?.activate();

			path.add(event.point);
		};

		tool.onMouseUp = (event: paper.ToolEvent) => {
			if (event.modifiers.shift || path === null) {
				return;
			}

			scope?.activate();

			path.simplify(10);

			const group = Group.create();
			group.addMember('everyone', 'writer');

			// add path to painting
			let coSegments = Segments.create([], group);
			let coPath = Path.create(
				{
					segments: coSegments,
					strokeColor: currentColor,
					strokeWidth: strokeWidth
				},
				group
			);
			for (let segment of path.segments) {
				const position = Point.create(
					{
						x: segment.point.x,
						y: segment.point.y
					},
					group
				);
				const handleIn = Point.create(
					{
						x: segment.handleIn.x,
						y: segment.handleIn.y
					},
					group
				);
				const handleOut = Point.create(
					{
						x: segment.handleOut.x,
						y: segment.handleOut.y
					},
					group
				);
				coSegments.push(
					Segment.create(
						{
							point: position,
							handleIn: handleIn,
							handleOut: handleOut
						},
						group
					)
				);
			}

			drawnPaths[coPath.id] = path;

			painting.current?.painting?.push(coPath);
			if (painting.current) {
				painting.current.count += 1;
			}

			path = null;
		};
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
</script>

<div class="fixed right-2 bottom-2 z-20 flex flex-col gap-3"></div>

<canvas
	bind:this={canvas}
	class={cn(
		'fixed h-screen w-screen',
		selectedTool === 'move' ? 'cursor-grab' : 'cursor-crosshair'
	)}
></canvas>

<!-- ontouchstart={handleTouchStart}
ontouchmove={handleTouchMove}
ontouchend={handleTouchEnd} -->

<div class="fixed top-2 left-2 z-20">
	<Button
		onclick={() => {
			// toast('Link copied to clipboard', {
			// 	description: 'Send this link to your friends to draw together'
			// });
			// navigator.clipboard.writeText(window.location.href);

			// jump to random drawing
			const numDrawnPaths = Object.keys(drawnPaths).length;
			const randomIndex = Math.floor(Math.random() * numDrawnPaths);

			const randomPathId = Object.keys(drawnPaths)[randomIndex];
			const point = drawnPaths[randomPathId].segments[0].point;

			// scope?.view.center.set(new paper.Point(point.x, point.y));
			// get current translation
			const translation = scope?.view.center;
			console.log(translation);
			if (translation) {
				scope?.view.translate(new paper.Point(translation.x - point.x, translation.y - point.y));

				// scale to 1
				// const currentScale = scope?.view.scaling ?? 1;
				// scope?.view.scale(1 / currentScale, new paper.Point(point.x, point.y));
			}
		}}
	>
		Random point
	</Button>
</div>

<div class="absolute top-2 right-2">
	<div class="bg-base-900 flex items-center justify-center gap-4 rounded-2xl p-2">
		<ToggleGroup
			type="single"
			bind:value={
				() => {
					return selectedTool;
				},
				(value) => {
					selectedTool = value;
				}
			}
		>
			<!-- move -->
			<ToggleGroupItem value="move">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
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
					stroke-width="1.5"
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
					console.log(color);
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
