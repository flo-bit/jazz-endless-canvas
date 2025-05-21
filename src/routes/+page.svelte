<script>
	import { CoState } from 'jazz-svelte';
	import {
		gridId,
		Painting,
		PaintingCell,
		PaintingCells,
		PaintingPaths
	} from '$lib/schema';
	import { Button, Modal, Prose } from '@fuxui/base';
	import Draw from './Draw.svelte';
	import { Group } from 'jazz-tools';

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
		new CoState(Painting, 'co_zATqzofqYQcNxDQniA4mK1t4i9C')
	);

	let isOpen = $state(true);
</script>

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
