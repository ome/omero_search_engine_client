import { writable, get } from 'svelte/store';

import { submitSearch } from './searchengine.js';

export class ContainerStore {
	constructor() {
		this.containers = writable([]);
		this.controller = new AbortController();
	}

	async loadContainers(query) {
		// abort any previous requests...
		this.controller.abort();
		this.controller = new AbortController();
		let containers = true;
		let data = await submitSearch(query, containers, { signal: this.controller.signal });
		console.log('containerStore Search result', data);
		// sort results by name
		data.results.results.sort((a, b) => a.name.localeCompare(b.name));
		let resultContainers = data.results.results;
		this.containers.set(resultContainers);

		// If we have selectedContainer (e.g. from URL), need to set the name so it can be used for
		// center panel query (URL only gives us the id and type)
		let selectedContainer = get(selectedContainerStore);
		if (selectedContainer && !selectedContainer.name) {
			let container = resultContainers.find(
				(c) => c.id == selectedContainer.id && c.type == selectedContainer.type
			);
			if (container) {
				// add a flag to ignore the right panel - don't want to overwrite e.g. selected Image
				selectedContainerStore.set({ ...container, ignoreRightPanel: true });
			}
		}
	}

  subscribe(run) {
    return this.containers.subscribe(run);
  }
}

export const containerStore = new ContainerStore();

// Selected container. E.g. {id: 123, type: "screen", name: "idr0012-fuchs-cellmorph/screenA"}
export const selectedContainerStore = writable(null);
