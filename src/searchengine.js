import { getJson } from './util.js';

export const BASE_URL = 'https://idr.openmicroscopy.org/';
// NB: TEMPORARY - use localhost for testing
// export const BASE_URL = 'http://localhost:1080/';

export const SEARCH_ENGINE_URL = `${BASE_URL}searchengine/api/v1/`;
export const OMERO_URL = 'https://idr.openmicroscopy.org/';

const NAME_KEY = 'name';

const CONTAINER_TYPE = 'container';

const DISPLAY_TYPES = {
	image: 'image',
	project: 'experiment',
	screen: 'screen',
	container: 'experiments/screen'
};

export async function loadKnownKeys() {
	let url = `${SEARCH_ENGINE_URL}resources/all/keys/?mode=searchterms`;
	let data = await getJson(url);
	return data;
}

function autocompleteSort(key, queryVal, knownKeys = []) {
	// returns a sort function based on the current query Value
	// knownKeys is list of common keys e.g. ["Gene Symbol", "Antibody"] etc.

	queryVal = queryVal.toLowerCase();
	// const KNOWN_KEYS = [].concat(...Object.values(this.resources_data));
	return (a, b) => {
		// if exact match key or value, show first
		let aMatch = queryVal == a.Value.toLowerCase();
		let bMatch = queryVal == b.Value.toLowerCase();
		if (aMatch != bMatch) {
			return aMatch ? -1 : 1;
		}
		let aMatchKey = key == a.Key;
		let bMatchKey = key == b.Key;
		if (aMatchKey != bMatchKey) {
			return aMatchKey ? -1 : 1;
		}
		// show all known Keys before unknown
		let aKnown = knownKeys.includes(a.Key);
		let bKnown = knownKeys.includes(b.Key);
		if (aKnown != bKnown) {
			return aKnown ? -1 : 1;
		}
		// Show highest counts first
		return a.count > b.count ? -1 : a.count < b.count ? 1 : 0;
	};
}


export async function getAutoCompleteResults(key, query, knownKeys, operator, controller) {
	let params = { value: query };
	let paramsStr = new URLSearchParams(params).toString();
	let kvp_url = `${SEARCH_ENGINE_URL}resources/all/searchvalues/?` + paramsStr;
	let urls = [kvp_url];

	// We check for Names if "Any"
	if (key == 'Any') {
		let names_url = `${SEARCH_ENGINE_URL}resources/all/names/?value=${query}`;
		// NB: Don't show auto-complete for Description yet - issues with 'equals' search
		// if (key == "Any" || key == "description") {
		//   names_url += `&use_description=true`;
		// }
		urls.push(names_url);
	}

	const promises = urls.map((p) =>
		fetch(p, { signal: controller.signal }).then((rsp) => rsp.json())
	);
	const responses = await Promise.all(promises);

	const data = responses[0];

	// hideSpinner();
	let results;
	// combine 'screen', 'project' and 'image' results - can ignore 'well', 'plate' etc.
	let screenHits = data.screen.data.map((obj) => {
		return { ...obj, type: 'screen', count: obj['Number of screens'] };
	});
	let projectHits = data.project.data.map((obj) => {
		return { ...obj, type: 'project', count: obj['Number of projects'] };
	});
	// Need to combine 'screen' and 'project' results based on matching 'value', since any search
	// we perform with selected auto-complete item will search for 'containers'
	let projectScreenHits = {};
	projectHits.concat(screenHits).forEach((obj) => {
		let id = obj.Key + '=' + obj.Value;
		if (!projectScreenHits[id]) {
			projectScreenHits[id] = obj;
		} else {
			// we have duplicate result for project & screen - simply add counts
			console.log('Combining', obj, projectScreenHits[id]);
			projectScreenHits[id].count = projectScreenHits[id].count + obj.count;
			projectScreenHits[id].type = CONTAINER_TYPE;
		}
	});
	console.log('projectScreenHits', projectScreenHits);

	let imageHits = data.image.data.map((obj) => {
		return { ...obj, type: 'image', count: obj['Number of images'] };
	});
	let data_results = [].concat(Object.values(projectScreenHits), imageHits);
	// sort to put exact and 'known' matches first
	data_results.sort(autocompleteSort(key, query, knownKeys));

	results = data_results.map((result) => {
		let type = result.type;
		let count = result.count;
		// if we're using 'contains' show e.g. >10 results
		let gt = operator == 'contains' ? '&#8805; ' : '';
		return {
			key: result.Key,
			value: `${result.Value}`,
			dtype: type,
			data_source: result.data_source,
			count
		};
	});
	// If we searched the 2nd Name/Description endpoint, concat the results...
	let rsp = responses[1];
	let nameHits = [];

	nameHits = nameHits.concat(rsp.project);
	nameHits = nameHits.concat(rsp.screen);
	console.log("nameHits", nameHits)
	if (nameHits.length > 0) {
		let data_sources = nameHits.reduce((prev, current) => prev.add(current.data_source), new Set());
		// If we have some name matches, give option to filter by name
		console.log("data_sources", data_sources);
		let key = "name";
		let type = CONTAINER_TYPE;
		const nameOption = {
			key: key,
			value: query,
			count: nameHits.length,
			dtype: type,
			data_source: [...data_sources].join(", "),
			operator: 'contains'
		};
		console.log("nameOption", nameOption)
		results.unshift(nameOption);
	}

	// filter to remove annotation.csv KV pairs
	results = results.filter((item) => !item.value.includes('annotation.csv'));

	// Generate Summary of [{key: "name", count: 5, type: container, matches:[]} }
	let keyCounts = {};
	results.forEach((result) => {
		let key = result.key;
		if (!keyCounts[key]) {
			keyCounts[key] = {
				key: key,
				count: 0,
				type: result.dtype,
				matches: []
			};
		}
		// result.dtype can be 'project', 'screen', 'experiments/screens'
		if (result.dtype == 'project' || result.dtype == 'screen') {
			if (!keyCounts[key].type.includes(result.dtype)) {
				keyCounts[key].type = CONTAINER_TYPE;
			}
		}
		keyCounts[key].count += result.count;
		keyCounts[key].matches.push(result);
	});
	let keyCountsList = Object.values(keyCounts);
	keyCountsList.sort((a, b) =>
		a.count < b.count ? 1 : a.count > b.count ? -1 : a.key > b.key ? 1 : -1
	);
	// NB: we only use the keyCounts[key] if key isn't "Any" below
	console.log('keyCountsList', keyCountsList);

	// truncate list
	let result_count = results.length;
	const max_shown = 100;
	if (result_count > max_shown) {
		results = results.slice(0, max_shown);
		results.push({
			key: -1,
			label: `...and ${result_count - max_shown} more matches not shown`,
			value: -1
		});
	} else if (result_count == 0) {
		results = [{ label: 'No results found.', value: -1 }];
	}

	// If not "Any", add an option to search for contains the currently typed query
	if (key != 'Any' && keyCounts[key]) {
		let total = keyCounts[key].count;
		let type = keyCounts[key].type;
		// E.g. "Imaging Method contains light (16 experiments/screens)"
		// Or "Imaging Method contains SPIM (1 experiment)"
		const allOption = {
			key: key,
			label: `<span style="color:#bbb">${key} contains</span>
          <b>${query}</b> <span style="color:#bbb">(${total}
            ${DISPLAY_TYPES[type]}${total != 1 ? 's' : ''})</span>`,
			value: query,
			dtype: type,
			operator: 'contains'
		};
		results.unshift(allOption);
	}

	return results;
}

export function submitSearch(query, containers = false, opts = {}) {
	let url = `${SEARCH_ENGINE_URL}resources/submitquery/`;
	// For debugging, log the query
	console.log("QUERY", url);
	console.log(JSON.stringify(query, null, 2));
	if (containers) {
		url += `containers/`;
	}
	let options = {
		method: 'POST',
		body: JSON.stringify(query),
		headers: {
			'Content-Type': 'application/json'
		},
		...opts
	};
	return fetch(url, options).then((rsp) => rsp.json());
}


export function getKeyValues(query, key, containerName, opts = {}) {

	console.log("getKeyValues() query, key, containerName, opts", query, key, containerName, opts);
	let url = `${SEARCH_ENGINE_URL}resources/image/container_filterkeyvalues/`;
	url += `?container_name=${containerName}&key=${key}`;

	let options = {
		method: 'POST',
		body: JSON.stringify(query),
		headers: {
			'Content-Type': 'application/json'
		},
		...opts
	};
	return fetch(url, options).then((rsp) => rsp.json());
}


export function addKeyValueQuery(query, key, value, resource="image") {
	let newQuery = JSON.parse(JSON.stringify(query));
	newQuery.query_details.and_filters.push({
		name: key,
		value: value,
		operator: "equals",
		resource
	});
	return newQuery;
}
