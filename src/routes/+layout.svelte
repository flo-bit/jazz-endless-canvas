<script lang="ts">
	import { Head, Toaster } from '@fuxui/base';
	import { JazzProvider } from 'jazz-svelte';
	import { MyAppAccount } from '$lib/schema';
	import '../app.css';

	let { children } = $props();
</script>

<JazzProvider
	sync={{
		peer: `wss://cloud.jazz.tools/?key=flo.bit.dev@gmail.com`
	}}
	AccountSchema={MyAppAccount}
>

	{@render children()}
</JazzProvider>

<Toaster />

<Head title="endless canvas" emojiFavicon="👩‍🎨" />
