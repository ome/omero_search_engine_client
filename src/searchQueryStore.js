import { writable, get } from 'svelte/store';

export class SearchQueryStore {
    // We store the filters in a 2D array of filters, so the query looks like:
    // [[Filter 1a, OR Filter 1b], AND [Filter 2], AND [Filter 3a, OR Filter 3b]]
    // When we build the query, if there is only a single filter [Filter 2], it becomes an `and_filter`
    // and the others are `or_filters`.
	constructor() {
		this.filters = writable([]);
        // set to the index of the filter being edited - used to trigger FilterPopover
        this.filterBeingEdited = writable(-1);
	}

    // Add a new AND filter (list) to the store
    addFilter({key, value, dtype, operator = 'equals', resource = 'image'}) {
        if (dtype === "project" || dtype === "screen") {
            resource = "container";
        }
        // NB: api uses 'name' instead of 'key' https://github.com/ome/omero_search_engine/issues/42
        let newFilter = {name:key, value, operator, resource, active: true};
        let editedFilter = this.getFilterBeingEdited();
        console.log("STORE addFilter: editedFilter", editedFilter, newFilter);
        if (editedFilter == -1) {
            let newOrFilters = [newFilter];
            this.filters.update(filters => [...filters, newOrFilters]);
            // return the index of the new filter (last in the list)
            editedFilter = get(this.filters).length - 1;
            // this.editFilter(editedFilter);
        } else {
            this.filters.update((filters) => {
                // add the newFilter to the OR filters at the given index
                return filters.map((f, index) => index == editedFilter ? [...f, newFilter] : f);
            });
        }
        return editedFilter;
    }

    getFilters() {
        return get(this.filters);
    }

    getQuery(containerName) {
        // Build the query object from the filters, optionally adding a filter for the container name

        // for each filter, pick out the keys we need
        let pickKeys = (filterObj) => {
            let {name, value, operator, resource} = filterObj;
            return {name, value, operator, resource};
        }

        // ignore filters that are not active:
        // First, filter out any OR filters that are not active, then filter out any lists that are empty
        let filters = get(this.filters)
            .map(or_filters => or_filters.filter(f => f.active).map(pickKeys))
            .filter(or_filters => or_filters.length > 0);
        // split the filter lists into AND and OR filters
        let or_filters = filters.filter(f => f.length > 1);
        let and_filters = filters.filter(f => f.length === 1).map(f => f[0]);

        // if we're searching within a container, add a filter for the container name
        if (containerName) {
            // {name: "name", value: "idr0012-fuchs-cellmorph/screenA", operator: "equals", resource: "container"}
            and_filters.push({name: "name", value: containerName, operator: "equals", resource: "container"});
        }
        return {
            resource: 'image',
            query_details: {
                and_filters,
                or_filters,
                case_sensitive: false
            },
            mode: 'searchterms'
        }
    }

    toggleFilter(index) {
        // for a given AND filter (list of OR filters), toggle the active state of all OR filters
        this.filters.update(filters => {
            let newFilters = [...filters];
            // if any are active, set all to inactive, otherwise set all to active
            let active = newFilters[index].some(f => f.active);
            newFilters[index] = newFilters[index].map(f => {
                f.active = !active;
                return f;
            });
            return newFilters;
        });
    }

    updateFilterOperator(index, or_index, value) {
        this.filters.update(filters => {
            let newFilters = [...filters];
            newFilters[index][or_index].operator = value;
            return newFilters;
        });
    }
    toggleOrFilter(index, or_index) {
        this.filters.update(filters => {
            let newFilters = [...filters];
            let active = newFilters[index][or_index].active;
            newFilters[index][or_index].active = !active;
            return newFilters;
        });
    }
    removeOrFilter(index, or_index) {
        this.filters.update(filters => {
            let newFilters = [...filters];
            newFilters[index] = newFilters[index].filter((f, i) => i !== or_index);
            return newFilters;
        });
    }

    removeFilter(index) {
        this.filters.update(filters => filters.filter((f, i) => i !== index));
    }

    editFilter(index) {
        // triggers a modal to edit the filter
        this.filterBeingEdited.set(index);
    }
    getFilterBeingEdited() {
        return get(this.filterBeingEdited);
    }

    subscribeFilters(run) {
        return this.filters.subscribe(run);
    }
    subscribeFilterBeingEdited(run) {
        return this.filterBeingEdited.subscribe(run);
    }
    setFilters(filters) {
        this.filters.set(filters);
    }
}

// Single instance of the query store
export const queryStore = new SearchQueryStore();

// Selected image. E.g. {id: 123, name: "image.tiff"}
export const selectedImageStore = writable(null);

// let d = {
// 	resource: 'image',
// 	query_details: {
// 		or_filters: [{ name: 'Gene Symbol', value: 'ints11', operator: 'equals', resource: 'image' }],
// 		or_filters: [],
// 		case_sensitive: false
// 	},
// 	mode: 'searchterms'
// };
