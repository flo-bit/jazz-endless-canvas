<script>
	import Draw from './Draw.svelte';
	import { CoState } from 'jazz-svelte';
	import { Counter, PaintingPaths } from '$lib/schema';
	import { Group } from 'jazz-tools';
	import { Alert, Button, Heading, Modal, Paragraph, Prose } from '@fuxui/base';

	// $effect(() => {
	// 	console.log('painting', painting);
	// 	if (painting.current === undefined) {
	// 		const group = Group.create();
	// 		group.addMember('everyone', 'writer');

	// 		// create new
	// 		let newPainting = Counter.create(
	// 			{
	// 				painting: PaintingPaths.create([], group),
	// 				count: 0
	// 			},
	// 			group
	// 		);

	// 		console.log('created new painting', newPainting.id);
	// 	}
	// });

	let painting = $derived(
		new CoState(Counter, 'co_zfasJeym9uvhBJ9mKnnaNJAVyjp', {
			resolve: {
				painting: {
					$each: {
						segments: {
							$each: true
						}
					}
				}
			}
		})
	);

	let isOpen = $state(true);
</script>

<Draw {painting} />

<Button onclick={() => (isOpen = true)} class="fixed bottom-2 left-2 z-10" variant="secondary">
	Info
</Button>

<Modal bind:open={isOpen}>
	<Prose>
		<h1>Endless shared canvas</h1>

		<p>This is an experiment of a shared canvas, that anyone can draw on.</p>

		<h3>Controls:</h3>

		<ul>
			<li>Click "Random point" to jump to a random drawn point in the canvas</li>
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
