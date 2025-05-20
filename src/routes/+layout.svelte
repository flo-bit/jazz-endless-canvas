<script lang="ts">
	import '../app.css';
	import { Head, Toaster } from '@fuxui/base';
	import { JazzProvider } from 'jazz-svelte';
	import { Account } from 'jazz-tools';

	let { children } = $props();
</script>

<JazzProvider
	sync={{
		peer: `wss://cloud.jazz.tools/?key=flo.bit.dev@gmail.com`
	}}
	AccountSchema={Account}
>

	{@render children()}
</JazzProvider>

<Toaster />

<Head title="endless canvas" emojiFavicon="👩‍🎨" />
