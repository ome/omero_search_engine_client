import { getJson } from './util.js';

// export const BASE_URL = 'https://idr-testing.openmicroscopy.org/';
export const BASE_URL = 'http://localhost:1080/';
const SEARCH_ENGINE_URL = `${BASE_URL}searchengine/api/v1/`;

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

// projects or screens might match Name or Description.
function mapNames(rsp, type, key, searchTerm, operator) {
	// rsp is a list of [ {id, name, description}, ]
	searchTerm = searchTerm.toLowerCase();

	// use_description not enabled yet (see below)
	// if (key == "description") {
	//   // results from resources/all/names/?use_description=true will include searches by name
	//   // need to check they really match description.
	//   rsp = rsp.filter((resultObj) => {
	//     return resultObj.description.toLowerCase().includes(searchTerm);
	//   });
	// }
	// Need to filter out containers without images
	rsp = rsp.filter((resultObj) => {
		return !(resultObj.no_images === 0);
	});

	return rsp.map((resultObj) => {
		let name = resultObj.name;
		let desc = resultObj.description;
		let attribute = key;
		// If we searched for Any, show all results.
		// "Attribute" form field will be filled (Name or Desc) if user picks item
		if (attribute == 'Any') {
			attribute = name.toLowerCase().includes(searchTerm) ? NAME_KEY : 'description';
		}
		let value = name;
		if (attribute == 'description') {
			// truncate Description around matching word...
			let start = desc.toLowerCase().indexOf(searchTerm);
			let targetLength = 80;
			let padding = (targetLength - searchTerm.length) / 2;
			if (start - padding < 0) {
				start = 0;
			} else {
				start = start - padding;
			}
			let truncated = desc.substr(start, targetLength);
			if (start > 0) {
				truncated = '...' + truncated;
			}
			if (start + targetLength < desc.length) {
				truncated = truncated + '...';
			}
			value = desc;
			name = truncated;
		}

		return {
			key: attribute,
			label: `${attribute} <span style="color:#bbb">${operator}</span> <b>${name}</b> <span style="color:#bbb">(1 ${DISPLAY_TYPES[type]})</span>`,
			value,
			count: 1,
			dtype: type
		};
	});
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
			label: `${result.Key} <span style="color:#bbb">${operator}</span> <b>${
				result.Value
			}</b> <span style="color:#bbb">(${gt}${count} ${DISPLAY_TYPES[type]}${
				count != 1 ? 's' : ''
			})</span>`,
			value: `${result.Value}`,
			dtype: type,
			count
		};
	});
	// If we searched the 2nd Name/Description endpoint, concat the results...
	if (responses[1]) {
		const projectNameHits = mapNames(responses[1].project, 'project', key, query, operator);
		const screenNameHits = mapNames(responses[1].screen, 'screen', key, query, operator);
		const nameHits = projectNameHits.concat(screenNameHits);
		// TODO: sort nameHits...
		results = nameHits.concat(results);
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
