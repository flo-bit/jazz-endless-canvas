<script>
	import { CoState } from 'jazz-svelte';
	import {
		gridId,
		indexFromGridId,
		Painting,
		PaintingCell,
		PaintingCells,
		PaintingPaths
	} from '$lib/schema';
	import { Button, Modal, Prose } from '@fuxui/base';
	import Draw from './Draw.svelte';
	import { Group } from 'jazz-tools';
	import { dev } from '$app/environment';

	// $effect(() => {
	// 	console.log('painting.current', painting.current);
	// 	if (painting.current === undefined) {
	// 		const group = Group.create();
	// 		group.addMember('everyone', 'writer');

	// 		const id = gridId(0, 0);
	// 		let newPainting = Painting.create(
	// 			{
	// 				cells: PaintingCells.create(
	// 					{
	// 						[id]: PaintingCell.create(
	// 							{
	// 								paths: PaintingPaths.create([], group)
	// 							},
	// 							group
	// 						)
	// 					},
	// 					group
	// 				)
	// 			},
	// 			group
	// 		);

	// 		console.log('created new painting', newPainting.id);
	// 	}
	// });

	// co_zfasJeym9uvhBJ9mKnnaNJAVyjp

	let painting = $derived(
		new CoState(Painting, 'co_zATqzofqYQcNxDQniA4mK1t4i9C', {
			resolve: {
				cells: true
			}
		})
	);

	async function checkPainting() {
		console.log('loading painting info...');

		let loadedPainting = await Painting.load(painting.current?.id ?? '', {
			resolve: {
				cells: {
					$each: {
						paths: true
					}
				}
			}
		});

		if (!loadedPainting) {
			console.log('painting not found');
			return;
		}

		let maxDist = 0;
		let furthestCell = '';

		let pathCount = 0;
		let loadedCells = 0;

		let painters = new Set();

		let num = 0;
		// load all cells
		for (let cell of Object.keys(loadedPainting.cells)) {
			let index = indexFromGridId(cell);
			if (!index) continue;
			let dist = Math.sqrt(index.x ** 2 + index.y ** 2);
			if (dist > maxDist) {
				maxDist = dist;
				furthestCell = cell;
			}
			if (!loadedPainting.cells?.[cell]?.paths?.id) {
				console.log('cell id not found for', cell);
				continue;
			}

			let paths = await PaintingPaths.load(loadedPainting.cells?.[cell]?.paths?.id, {
				resolve: {
					$each: true,
					$onError: null
				}
			});

			if (!paths) {
				console.log('error loading cell', cell);
				continue;
			}

			loadedCells++;
			pathCount += paths.length;

			for (let path of paths) {
				painters.add(path._edits.segments?.by?.profile?.id);
			}

			console.log(num + '/' + Object.keys(loadedPainting.cells).length);

			num++;
		}
		console.log('furthest cell', furthestCell);

		console.log('loaded cells', loadedCells, 'of', Object.keys(loadedPainting.cells).length);

		console.log('path count', pathCount);
		console.log('painters', painters.size);
	}

	let isOpen = $state(true);
</script>

{#if dev}
	<Button onclick={checkPainting} variant="secondary" class="fixed top-2 right-2 z-10"
		>Log stats</Button
	>
{/if}

<Draw painting={painting.current} />

<Button onclick={() => (isOpen = true)} class="fixed bottom-2 left-2 z-10" variant="secondary">
	Info
</Button>

<Modal bind:open={isOpen}>
	<Prose>
		<h1>Endless shared canvas</h1>

		<p>This is an experiment of a shared canvas, that anyone can draw on.</p>

		<h3>Controls:</h3>

		<ul>
			<li>
				Move around by selecting the "move" tool and dragging the canvas around (or use w, a, s, d)
			</li>
			<li>
				Select the "paint" tool to draw on the canvas (you can also change the color and stroke
				width)
			</li>
			<li>Zoom with + and - or pinch on mobile</li>
			<li>Send this website to your friends to draw together</li>
		</ul>

		<p>
			built with <a href="https://jazz.tools" target="_blank">jazz</a>,
			<a href="https://paperjs.org" target="_blank">paper.js</a>
			and <a href="https://svelte.dev" target="_blank">svelte</a> by
			<a href="https://flo-bit.dev" target="_blank">flo-bit</a>
		</p>
		<p>
			Check out the <a href="https://github.com/flo-bit/jazz-endless-canvas" target="_blank"
				>source code</a
			>
		</p>

		<div class="flex justify-end">
			<Button class="mt-4" onclick={() => (isOpen = false)}>Start drawing</Button>
		</div>
	</Prose>
</Modal>
