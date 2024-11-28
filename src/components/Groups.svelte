<script>
	import { fade } from 'svelte/transition';
	import Fa from 'svelte-fa';
	import { faCaretRight } from '@fortawesome/free-solid-svg-icons';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import { groupStore } from '../groupQueryStore';
	import { selectedContainerStore } from '../containerStore.js';
	import { getKeyValues, addKeyValueQuery } from '../searchengine.js';
	import Images from './Images.svelte';

	// We want to group images by this hierarchy of groups...
	let groups = [];
	export let groupsIndex = 0;
	export let parentQuery;

	let loading = false;
	let buttonHeight = 20;

	groupStore.subscribeGroups((newGroups) => {
		console.log('Groups.svelte -> groups', newGroups);
		groups = newGroups;
	});

	selectedContainerStore.subscribe((container) => {
		// groupStore.setGroups([]);
	});

	// All the values for the first group...
	let values = [];

	onMount(() => {
		loading = true;
		// Load the Keys for the First Group...
		// let query = queryStore.getQuery();
		let key = groups[groupsIndex];
		let containerName = get(selectedContainerStore).name;

		console.log('<Groups> onMount() parentQuery, key, containerName', parentQuery, key, containerName);

		getKeyValues(parentQuery, key, containerName).then((data) => {
			loading = false;
			console.log('getKeyValues()', data);
			let results = data[0].results;
			results.sort((a, b) => {
				return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
			});
			values = results;
		});
	});

	function expand(idx) {
		values = values.map((val, index) => {
			if (index == idx) {
				val.expanded = !val.expanded;
			}
			return val;
		});
	}
</script>

<div class="groups">
	{#if loading}
		<div in:fade={{ delay: 1000, duration: 1000 }}>Loading values...</div>
	{:else if values.length == 0}
		<div>No values found for query</div>
	{/if}
	{#each values as val, idx (val.value)}
		<div>
			<!-- Button to expand the hierarchy of Groups -->
			<button
				onclick={() => expand(idx)}
				bind:clientHeight={buttonHeight}
				class:expanded={val.expanded}
				style="--sticky-top: {buttonHeight * groupsIndex}px; z-index: {100 - groupsIndex};"
			>
				<div class="icon">
					<Fa icon={faCaretRight} color="#666" />
				</div>
				{val.value} ({val.no_image})
			</button>

			{#if val.expanded}
				{#if groupsIndex < groups.length - 1}
					<!-- key forces rerender when child group changes -->
					{#key groups[groupsIndex + 1]}
						<div class="child_groups">
							<!-- Recursively include a child <Groups> component -->
							<svelte:self
								groupsIndex={groupsIndex + 1}
								parentQuery={addKeyValueQuery(parentQuery, groups[groupsIndex], val.value)}
							/>
						</div>
					{/key}
				{:else}
					<!-- To show images in this group, we use the current search query,
          combined wth container AND key=value for this group -->
					<Images query={addKeyValueQuery(parentQuery, groups[groupsIndex], val.value)} />
				{/if}
			{/if}
		</div>
	{/each}
</div>

<style>
	.child_groups {
		margin-left: 20px;
	}
	button {
		border: solid transparent 1px;
		background-color: white;
		white-space: nowrap;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 8px;
		width: 100%;
	}
	button.expanded {
		position: sticky;
		top: var(--sticky-top);
	}
	.icon {
		transition: transform 0.2s;
	}
	.expanded .icon {
		transform: rotate(90deg);
	}
</style>
