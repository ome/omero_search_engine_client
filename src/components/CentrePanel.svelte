<script>
	import { get } from 'svelte/store';
	import VirtualList from 'svelte-tiny-virtual-list';

	import { groupStore } from '../groupQueryStore';
	import { queryStore } from '../searchQueryStore.js';
	import { selectedContainerStore } from '../containerStore.js';
	import { submitSearch } from '../searchengine.js';
	import ThumbnailRow from './ThumbnailRow.svelte';
	import CentrePanelGroups from './CentrePanelGroups.svelte';
	import { onMount } from 'svelte';
	import Groups from './Groups.svelte';

	const THUMB_SIZE = 64;
	let panelHeight = 0;
	let panelWidth = 0;

	/**
	 * @type {string | any[]}
	 */
	let imagesJson = [];

	// Group images by these keys
	/**
	 * @type {string | any[]}
	 */
	let groups = [];
	$: queryWithoutContainer = null;

	// re-calculated based on panelWidth
	$: thumbColumns = 7;

	/**
	 * @type {{ current_page: number; total_pages: number; } | null}
	 */
	let pagination = null;
	/**
	 * @type {AbortController}
	 */
	let controller;

	// if either the filters or the selected container changes, we need to reload the images
	queryStore.subscribeFilters((/** @type {any} */ newFilters) => {
		loadImages();
	});
	selectedContainerStore.subscribe((obj_id) => {
		loadImages();
	});

	groupStore.subscribeGroups((/** @type {any[]} */ newGroups) => {
		console.log('CentrePanel.svelte -> groups', newGroups);
		groups = newGroups;
	});

	async function loadImages(clear = true) {
		console.log('loadImages... clear', clear);
		queryWithoutContainer = queryStore.getQuery();
		console.log('queryWithoutContainer', queryWithoutContainer);
		let obj = get(selectedContainerStore);
		if (!obj?.name) {
			imagesJson = [];
			pagination = null;
			return;
		}
    // If we have groups, don't need to load images...
    if (groups.length > 0) {
      // TODO: Need to force re-render of Groups...
      return;
    }
		let query = queryStore.getQuery(obj.name);
		if (!clear && pagination) {
			if (pagination.current_page >= pagination.total_pages) {
				return;
			}
			// include pagination so we get the next page...
			query.pagination = pagination;
		}
		if (controller) {
			controller.abort();
		}
		controller = new AbortController();
		let data = await submitSearch(query, false, { signal: controller.signal });

		console.log('LOADIMAGES -> data images', data.results.results.length, data);
		// Store pagination info...
		// total_pages = data.results.total_pages;
		pagination = data.results.pagination;

		if (clear) {
			// replace the existing images
			imagesJson = data.results.results;
		} else {
			// add the new images to the existing ones
			imagesJson = [...imagesJson, ...data.results.results];
		}
		console.log('imagesJson', imagesJson[0]);
	}

	function calculateColumns() {
		thumbColumns = Math.floor(panelWidth / (THUMB_SIZE + 15));
	}

	onMount(() => {
		calculateColumns();
	});

	/**
	 * @param {number} index
	 */
	function handleRowRendered(index) {
		if (index >= imagesJson.length) {
			console.log('LOAD MORE IMAGES?', pagination.current_page, pagination.total_pages);
			if (pagination.current_page < pagination.total_pages) {
				console.log('LOAD MORE IMAGES!');
				loadImages(false);
			}
		}
	}
</script>

<svelte:window on:resize={calculateColumns} />

<div class="header">
	{#if imagesJson.length > 0}
		<CentrePanelGroups keys={imagesJson[0].key_values.map((/** @type {{ name: any; }} */ kv) => kv.name)} />
	{/if}
</div>

<div
	bind:clientHeight={panelHeight}
	bind:clientWidth={panelWidth}
	class="wrapper"
	style="--thumbSize: {THUMB_SIZE}px"
>
	{#if groups.length > 0}
    <!-- Force re-render if first group changes -->
		{#key groups[0]}
			<Groups parentQuery={queryWithoutContainer} key={groups[0]} />
		{/key}
	{:else}
		<VirtualList
			width="100%"
			height={panelHeight - 15}
			itemCount={Math.ceil(imagesJson.length / thumbColumns)}
			itemSize={THUMB_SIZE + 10}
		>
			<div class="row" slot="item" let:index let:style {style}>
				<ThumbnailRow
					handleRendered={handleRowRendered}
					index={(index + 1) * thumbColumns}
					images={imagesJson.slice(index * thumbColumns, (index + 1) * thumbColumns)}
				/>
			</div>
		</VirtualList>
	{/if}
</div>

<style>
	.header {
		flex: 0 0 auto;
		background-color: #f1f0f4;
		border-bottom: solid #ddd 1px;
	}
	.wrapper {
		/* 300px to force scrollbar */
		height: 300px;
		flex: auto 1 1;
		margin: 0 10px 0 10px;
		overflow: auto;
	}
	.row {
		text-align: center;
	}
</style>
