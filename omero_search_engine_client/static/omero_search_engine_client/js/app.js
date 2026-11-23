var querystarttime;
var queryendtime;
var resource;
let cancel_check = false;
var ajaxCall;
var task_id;
var set_query_form = false;
var bookmark;
var page = 0;
var query;
var recieved_results = [];
var size = 0;
var query;
var pages_data = {};
var ag_grid;
var recieved_data = 0;
var columnDefs = [];
var current_values = {};
var cached_key_values = {};
var extend_url;
var names_ids;
var main_attributes = ["Name (IDR number)"];
var query_details;
var raw_elasticsearch_query;
var no_cloned = 0;
var original_external_int_div = document.getElementById("template"); //Div to Clone
var or_template = document.getElementById("ortemplate");
var or_parent = document.getElementById("conanewor");
var tree_nodes = [];
var is_new_query = true;
var auto_fetch_is_running = false;

//save query json string to the local user storage, so he cal load it again
function save_query() {
  query = get_current_query();
  if (query == false) return;
  else {
    $("#confirm_message").modal("show");
    document.getElementById("queryfilename").focus();
  }
}

//Save query to user local storage
function download_query() {
  filename = document.getElementById("queryfilename").value;
  query = JSON.stringify(get_current_query(), null, 4);
  if (filename) {
    filename = filename + ".txt";
    var file_container = document.createElement("a");
    file_container.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(query)
    );
    file_container.setAttribute("download", filename);

    if (document.createEvent) {
      var event = document.createEvent("MouseEvents");
      event.initEvent("click", true, true);
      file_container.dispatchEvent(event);
    } else {
      file_container.click();
    }
    $("#confirm_message").modal("hide");
    document.getElementById("queryfilename").value = "";
  }
  display_hide_remove_buttons();
}

//
function reset_query(need_confirmation = true) {
  query = get_current_query();
  if (query == false) return;
  if (need_confirmation)
    if (confirm("All the conditions will be discarded, process?") == false) {
      return;
    }
  reset_global_variables();
  const eGridDiv = document.querySelector("#myGrid_2");
  removeAllChildNodes(eGridDiv);
  document.getElementById("results").style.display = "none";
  document.getElementById("results_grid_buttons").style.display = "none";
  $("#search_form").empty();
  $("#addAND").click();
  //location.reload();
  return false;
}

function cancell_ajaxcall() {
  ajaxCall.onreadystatechange = null;
  ajaxCall.abort();
  console.log("Canceled");
  ajaxCall = null;
  return;
}

//display message to the user
function displayMessage(header, btn_text) {
  messageHeader.innerText = header;
  if (typeof btn_text !== "undefined" && btn_text !== null)
    moelButton.innerText = btn_text;
  $("#modalprogresbar").css("visibility", "hidden");

  $("#displaymessagemodal").modal("show");

  moelButton.addEventListener("click", update_table_visability);
  select_all.addEventListener("click", set_columns_hidden);
  deselect_all.addEventListener("click", set_columns_visible);

  //$("#moelButton").hide();
}

function set_columns_hidden() {
  set_columns_selection(false);
}

function set_columns_visible() {
  set_columns_selection(true);
}
function urlFormatter(row, cell, value, columnDef, dataContext) {
  return "<a href=" + value + " target='_blank'>" + value + "</a>";
}

function valueFormatter(row, cell, value, columnDef, dataContext) {
  try {
    return value.toString();
  } catch (err) {
    alert("Error " + err + ", for value: " + value);
  }
}

function loadMoreResultsFunction() {
  document.getElementById("loadMoreResults").disabled = true;
  submitQuery(false);
}

function reset_global_variables(data) {
  bookmark = null;
  raw_elasticsearch_query = null;
  page = 0;
  pages_data = {};
  recieved_results = [];
  size = 0;
  query_details = null;
  recieved_data = 0;
}

function set_global_variables(data) {
  bookmark = data["bookmark"];
  // {}
  raw_elasticsearch_query = data["raw_elasticsearch_query"];
  page = page + 1;
  pages_data[page] = data;
  recieved_results = recieved_results.concat(data["results"]["results"]);
  size = data["results"].size;
  query_details = data["query_details"];
  recieved_data = recieved_data + data["results"].length;
  var resultsbutton = document.getElementById("loadMoreResults");
  if (recieved_data >= size) {
    resultsbutton.disabled = true;
  } else {
    resultsbutton.disabled = false;
  }
}
function sizeToFit() {
  ag_grid.gridOptions.api.sizeColumnsToFit();
}

function resetResultsTabelFilters() {
  ag_grid.gridOptions.api.setFilterModel(null);
  ag_grid.gridOptions.api.onFilterChanged();
}

function getBoolean(id) {
  //var field = document.querySelector('#' + id);
  return true;
}

function getParams() {
  return {
    allColumns: getBoolean("allColumns"),
    //columnSeparator: '\t'
  };
}

function exportToCSV() {
  ag_grid.gridOptions.api.exportDataAsCsv(getParams());
}

function autoSizeAll(skipHeader) {
  var allColumnIds = [];
  gridOptions.columnApi.getAllColumns().forEach(function (column) {
    allColumnIds.push(column.colId);
  });
  gridOptions.columnApi.autoSizeColumns(allColumnIds, skipHeader);
}

function url_render(param) {
  if (resource == "screen")
    return (
      "<a href=" + extend_url + ' target="_blank" >' + param.value + "</a>"
    );
  else
    return (
      "<a href=" +
      extend_url +
      param.value +
      ' target="_blank" >' +
      param.value +
      "</a>"
    );
}

function onGridSizeChanged(params) {
  // get the current grids width
  var gridWidth = document.getElementById("grid-wrapper").offsetWidth;
  // keep track of which columns to hide/show
  var columnsToShow = [];
  var columnsToHide = [];
  // iterate over all columns (visible or not) and work out
  // now many columns can fit (based on their minWidth)
  var totalColsWidth = 0;
  var allColumns = params.columnApi.getAllColumns();
  for (var i = 0; i < allColumns.length; i++) {
    let column = allColumns[i];
    totalColsWidth += column.getMinWidth();
    if (totalColsWidth > gridWidth) {
      columnsToHide.push(column.colId);
    } else {
      columnsToShow.push(column.colId);
    }
  }

  // show/hide columns based on current grid width
  params.columnApi.setColumnsVisible(columnsToShow, true);
  params.columnApi.setColumnsVisible(columnsToHide, false);

  // fill out any available space to ensure there are no gaps
  params.api.sizeColumnsToFit();
}

function displayResults(data, new_data = true) {
  console.log("displayResults data", data);
  debugger;
  if (is_new_query == true) {
    is_new_query = false;
    reset_global_variables();
    $("#myGrid_2").empty();
  }
  if (new_data) set_global_variables(data);
  // columnDefs = data["columns_def"];
  columnDefs = ["name", "dataset_id", "data_source"]
  // extend_url = data["extend_url"];
  // names_ids = data["names_ids"];
  for (i in data["columns_def"]) {
    if (data["columns_def"][i]["field"] === "Id")
      // && resource==="image")
      data["columns_def"][i]["cellRenderer"] = url_render;
  }

  results = data["results"]["results"];

  let html = results.map(r => `<div>
    ${r.name} Dataset: ${r.dataset_id} Data Source: ${r.data_source}
    <a href="${window.WEBCLIENT_URL}?show=image-${r.id}" target="_blank">Image ID: ${r.id}</a>
  </div>`).join("");
  document.getElementById("myGrid_2").innerHTML = html;
  return;

  var gridOptions = {
    defaultColDef: {
      resizable: true,
      filter: true,
      animateRows: true,
    },
    enableCellTextSelection: true,
    columnDefs: columnDefs,
    rowData: null,
  };

  // lookup the container we want the Grid to use
  const eGridDiv = document.querySelector("#myGrid_2");
  // create the grid passing in the div to use together with the columns & data we want to use
  if (page == 1) ag_grid = new agGrid.Grid(eGridDiv, gridOptions);
  ag_grid.gridOptions.api.setRowData(recieved_results);
  var notice = data["notice"];

  server_query_time = data["server_query_time"];
  let no_image = results.length;
  if (no_image != size) {
    message =
      "No of " +
      data["resource"] +
      ", " +
      recieved_data +
      "/" +
      size +
      ", Search engine query time: " +
      server_query_time +
      " seconds.";
    document.getElementById("loadMoreResults").style.display = "block";
  } else {
    message =
      "No of " +
      data["resource"] +
      ", " +
      recieved_data +
      ", Search engine query time: " +
      server_query_time +
      " seconds.";
    document.getElementById("loadMoreResults").style.display = "none";
  }

  var resultsDiv = document.getElementById("results");
  //    document.getElementById('exportResults').style.display = "block";
  document.getElementById("results_grid_buttons").style.display = "block";
  resultsDiv.style.display = "block";
  $("#no_images").text(message);
  var grid;
  var columns = data["columns"];
  for (var i = 0; i < columns.length; i++) {
    columns[i].formatter = valueFormatter;
  }
  var options = {
    enableCellNavigation: true,
    enableColumnReorder: false,
    multiColumnSort: true,
    forceFitColumns: true,
  };
  $("#displaymessagemodal").modal("hide");

  window.location.hash = "#results";
  document.getElementById("load_results_buttons").style.display = "block";
  if (new_data) {
    return;
    var tr = document.getElementById("loads_results_table").tHead.children[0],
      th = document.createElement("th");
    tr.appendChild(th);
    var pagebutton = document.createElement("BUTTON");
    pagebutton.innerHTML = page;
    th.appendChild(pagebutton);
    th.appendChild(pagebutton);
    pagebutton.addEventListener("click", function () {
      alert(pagebutton.innerText);
      displayResults(data, false);
    });
  }
}

var filterParams = {
  suppressAndOrCondition: true,
  comparator: function (filterLocalDateAtMidnight, cellValue) {
    var dateAsString = cellValue;
    if (dateAsString == null) return -1;
    var dateParts = dateAsString.split("/");
    var cellDate = new Date(
      Number(dateParts[2]),
      Number(dateParts[1]) - 1,
      Number(dateParts[0])
    );

    if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) {
      return 0;
    }

    if (cellDate < filterLocalDateAtMidnight) {
      return -1;
    }

    if (cellDate > filterLocalDateAtMidnight) {
      return 1;
    }
  },
  browserDatePicker: true,
};

function get_returned_query_from_server() {
  resource = "image"; //document.getElementById('resourcseFields').value;
  var query_ = {
    resource: resource,
    query_details: query_details,
    raw_elasticsearch_query: raw_elasticsearch_query,
  };
  query_["bookmark"] = bookmark;
  query_["columns_def"] = columnDefs;
  return query_;
}

function submitQuery(reset = true) {
  if (reset == true) {
    reset_global_variables();
    $("#myGrid_2").empty();
    document.getElementById("results").style.display = "none";
    document.getElementById("results_grid_buttons").style.display = "none";
  }
  if (query_details === undefined || size == 0) {
    query = get_current_query();
    if (query == false) return;
  } else query = get_returned_query_from_server();

  send_the_request(query);
}

function send_the_request(query) {
  /*
//example of search query
searchQuery={'query': {'query_details': {'and_filtrs': [{'resource': 'image', 'name': 'Strain', 'value': 'pdx1', 'operator': 'equals', 'query_type': 'keyvalue'}], 'or_filters': [], 'case_sensitive': false}, 'main_attributes': {'or_main_attributes': []}}}
//Working code to fetch the results to avoid "CORs block"
url_2="https://idr-testing.openmicroscopy.org/searchengine/submitquery/"
 url_2 = "http://127.0.0.1:5577/api/v2/resources/image/searchannotation/";
 //url_2 = "https://idr-testing.openmicroscopy.org/searchengineapi/api/v2/resources/image/searchannotation/";
fetch(url_2,
{
    method: "POST",
    body: JSON.stringify(searchQuery),

})
.then(function(results){ return results.json(); })
.then(function(data){
      if (data["Error"] != "none") {
            alert("Error: "+data["Error"]);
            return;
           }
displayResults(  data  ) })
return;
*/

  headers = {
    "Authorization": `Bearer ${window.JWT_TOKEN }`,
  }
  console.log("headers", headers)

  //alert(submitqueryurl);
  $.ajax({
    type: "POST",
    // url: SEARCH_ENGINE_URL + "resources/submitquery/?return_columns=True",
    url: SEARCH_ENGINE_URL + "resources/image/searchannotation/",
    contentType: "application/json;charset=UTF-8",
    dataType: "json",
    data: JSON.stringify(query),
    headers: headers,
    success: function (data) {
      console.log("searchannotation data", data);
      if (data["Error"]) {
        alert(data["Error"]);
        return;
      }
      displayResults(data);
    },
    error: function (XMLHttpRequest, textStatus, errorThrown) {
      alert("Status: " + textStatus);
      alert("Error: " + errorThrown);
    },
  });
}

function set_query_fields(container) {
  let selected_resource_ = container.querySelector(".resourcseFields");
  let keys_options_ = container.querySelector(".keyFields");
  let keyFields_ = container.querySelector(".keyFields");
  let valueFields_ = container.querySelector(".valueFields");

  keys_options_.onchange = function () {
    key_value = this.value;
    set_key_values(key_value, container);
  };
  valueFields_.addEventListener("focus", (e) => {
    setAutoCompleteValues(null);
  });
  valueFields_.addEventListener("change", (e) => {
    query = get_current_query();
    $("#queryJson").val(JSON.stringify(query, undefined, 4));
  });

  optionHtml = "";
  optionOpHtml = "";

  set_resources(container);
}

function addConditionRow(key, value, condition, resource, group) {
  let tableRef = document.getElementById(group + "_group");
  let newRow = tableRef.insertRow(-1);
  // Insert cells in the row
  let keyCell = newRow.insertCell(0);
  let operatorCell = newRow.insertCell(1);
  let valueCell = newRow.insertCell(2);
  let resourceCell = newRow.insertCell(3);
  let removeCell = newRow.insertCell(4);

  // Append a text node to the cells
  let keyText = document.createTextNode(key);
  keyCell.appendChild(keyText);

  let operatorText = document.createTextNode(condition);
  operatorCell.appendChild(operatorText);

  let valueText = document.createTextNode(value);
  valueCell.appendChild(valueText);

  let resourceText = document.createTextNode(resource);
  resourceCell.appendChild(resourceText);

  var removebutton = document.createElement("BUTTON");
  removebutton.innerHTML = "X Remove";
  removebutton.setAttribute("class", "btn btn-danger btn-sm");
  removeCell.appendChild(removebutton);

  removebutton.addEventListener("click", function () {
    var row = removebutton.parentNode.parentNode;
    row.parentNode.removeChild(row);
  });
}

function toto_function(data) {
  container = document.activeElement.parentNode.parentNode;

  if (data != null) {
    $(container.querySelector(".valueFields")).autocomplete({
      source: data,
      delay: 500,
      minLen: 0,
    });
  } else {
    $(container.querySelector(".valueFields"))
      .autocomplete({
        source: setFieldValues(data),
        delay: 500,
        minLen: 0,
        select: function (event, ui) {
          ui.item.value = adjust_autocomplete_values(ui.item.value);
        },
        /*Will modification from pull request 4*/
      })
      .autocomplete("instance")._renderItem = function (ul, item) {
      // without this, html in label will be escaped
      var el = $("<div>" + item.label + "</div>");
      return $("<li>").append(el).appendTo(ul);
    };
  }
  //after selecting the item, and menu is hiding it will sned the value input out of focus,
  //so it will update the fields with the correct values
  $(container.querySelector(".valueFields")).autocomplete({
    close: function (event, ui) {
      container.querySelector(".valueFields").blur();
    },
  });
}

function adjust_autocomplete_values(value) {
  container = document.activeElement.parentNode.parentNode;
  let keys_options_ = container.querySelector(".keyFields");
  if (keys_options_.value == "Any") {
    vals = value.split(", Value:");
    attr = vals[0].split("Attribute: ")[1].trim();
    key_value = container.querySelector(".keyFields");
    if (get_resource(attr) == undefined) {
      $(key_value).append(new Option(attr, attr));
      resources_data["image"].push(attr);
    }
    key_value.value = attr;

    //  valueFields_.blur();
    return vals[1].trim();
  }
  return value;
}

/*
set autocpmlete values for key using a function to filter the available values
It solves the issue of having many available values (sometimes tens of thousnads),
it was freezing the interface */
function setAutoCompleteValues(data = null) {
  document.activeElement.addEventListener("keyup", (e) => {
    //exclude arrow keys from keyup event
    var code = e.keyCode || e.which;
    if (code == 37 || code == 38 || code == 39 || code == 40) {
      return;
    }
    toto_function(data);
  });
}

function setFieldValues(data = null) {
  let value_fields = document.activeElement; //document.getElementById('valueFields'+id);
  container = document.activeElement.parentNode.parentNode;
  key_value = container.querySelector(".keyFields").value;
  current_value = cached_key_values[key_value];
  let val = value_fields.value;
  if (data != null) {
    console.log("data has value====>>>>>>> 11");
    return data; //.filter(x => x.toLowerCase().includes(val.toLowerCase()))
  }
  if (key_value == "Any" && val.length > 2 && auto_fetch_is_running == false) {
    url =
      SEARCH_ENGINE_URL +
      "resources/" +
      encodeURIComponent("image") +
      "/searchvalues/?value=" +
      encodeURIComponent(val);

    auto_fetch_is_running = true;
    //  const request = async () => {
    //    const response = await fetch(url);
    //    const json = await response.json();
    //    console.log("JSON IS:",json);
    //    return json;

    $("body").addClass("wait");
    fetch(url).then(function (response) {
      {
        console.log("VALUE: ", val);
        response.json().then(function (data) {
          $("body").removeClass("wait");
          /*Will modification from pull request 4*/
          let results = data.data.map((result) => {
            return {
              label: `<b>${result.Value}</b> (${result.Key}) <span style="color:#bbb">${result["Number of images"]}</span>`,
              // value is parsed to set Attribute chooser and field Value
              value: `Attribute: ${result.Key}, Value:${result.Value}`,
            };
          });

          toto_function(results);
          auto_fetch_is_running = false;
          //console.log("datatata", data);
          //return data.filter(x => x.toLowerCase().includes(val.toLowerCase()))
        });
      }
    });
  }
  //for performance, when the length of the current values length is bigger than 1000, when the value is one letter, it will only return all the items which start with this letter
  //otherwise, it will return all the items which contains the value (even ther are  at the middle or at the end of the items)
  if (current_value == undefined) return [];
  if (current_value.length > 1000) {
    console.log("1: val: " + val);

    if (!val || val.length < 2) return [];
    else if (val.length === 2)
      return current_value.filter((x) =>
        x.toLowerCase().startsWith(val.toLowerCase())
      );
    else
      return current_value.filter((x) =>
        x.toLowerCase().includes(val.toLowerCase())
      );
  } else {
    return current_value.filter((x) =>
      x.toLowerCase().includes(val.toLowerCase())
    );
  }
}

function set_resources(container) {
  let __keys_options = container.querySelector(".keyFields");
  optionHtml = '<option value ="Any">Any</option>';
  for (const [key, value] of Object.entries(resources_data)) {
    if (value == null) {
      break;
    }
    value.sort();
    for (i in value) {
      optionHtml +=
        '<option value ="' + value[i] + '">' + value[i] + "</option>";
    }
  }
  __keys_options.innerHTML = optionHtml;
  key_value = __keys_options.value;
  set_key_values(key_value, container);
}

function set_tree_nodes(mode = true) {
  tree_nodes = [];
  tree_nodes.push({
    id: "Resource",
    parent: "#",
    text: "Resource",
    state: { opened: true },
  });
  for (resource in resources_data) {
    tree_nodes.push({
      id: resource,
      parent: "Resource",
      text: resource,
      state: { opened: mode },
    });

    for (i in resources_data[resource].sort()) {
      if (resources_data[resource][i].trim().length > 22)
        text = resources_data[resource][i].substr(0, 22) + "...";
      else text = resources_data[resource][i];
      tree_nodes.push({
        id: resources_data[resource][i],
        parent: resource,
        text: text, //resources_data[resource][i]
        title: text,
      });
    }
  }
}

function create_tree() {
  $("#jstree_resource_div").jstree({
    core: {
      data: tree_nodes,
    },
  });
}

function set_tree_events_handller() {
  $("#jstree_resource_div").on("changed.jstree", function (e, data) {
    console.log(data.selected);
  });
  $("#jstree_resource_div").on("hover_node.jstree", function (e, data) {
    var node = $(event.target).closest("li");
    node.prop("title", node[0].id);
  });
  /*
Query the search engine using the resourse attribute, when the user double click the attribute node
*/
  $("#jstree_resource_div").bind("dblclick.jstree", function (event) {
    var node = $(event.target).closest("li");
    var type = node.attr("rel");
    var key = node[0].id;
    $("body").addClass("wait");

    let resource = get_resource(key);
    url =
      SEARCH_ENGINE_URL +
      `resources/${encodeURIComponent(
        resource
      )}/searchvaluesusingkey/?key=${encodeURIComponent(key)}`;
    fetch(url).then(function (response) {
      {
        response.json().then(function (data) {
          display_value_search_results(data, resource);
        });
      }
    });
  });
}
$(async function () {
  $("#commonattr").change(async function () {
    if ($(this).prop("checked")) {
      query_mode = "advanced";
      open = false;
    } else {
      query_mode = "searchterms";
      open = true;
    }

    resources_data = await load_resources(query_mode);

    set_tree_nodes(open);
    $("#jstree_resource_div").jstree("destroy").empty();

    create_tree();
    set_tree_events_handller();
    update_key_fields();
  });

  // load resources_data immediately...
  resources_data = await load_resources("searchterms");

  if (resources_data.error != undefined) {
    alert(resources_data.error);
    return;
  }

  set_help_file();

  set_tree_nodes();

  create_tree();

  let _keys_options = document.querySelector("#search_form .keyFields");
  optionHtml = "";
  for (key in resources_data) {
    optionHtml += '<option value ="' + key + '">' + key + "</option>";
  }

  var resources_con = document.getElementById("resources");
  resources_con.style.display = "block";

  set_query_fields(_keys_options.parentNode.parentNode);
});
//Used to load query from local storage
// document.getElementById('load_file').onchange = function () {
// let file = document.querySelector("#load_file").files[0];
//   load_query_from_file(file);
// }

let $andClause;

$(function () {
  // clone empty form row before any changes
  // used for building form
  $("#search_form .and_clause").bind("keydown", function (e) {
    if (e.keyCode === 13) return false;
  });

  $andClause = $("#search_form .and_clause").clone();

  // Hide the X button if there's only 1 in the form
  function hideRemoveIfOnlyOneLeft() {
    let $btns = $("button.remove_row");
    if ($btns.length == 1) {
      $btns.css("visibility", "hidden");
    } else {
      $btns.css("visibility", "visible");
    }
  }

  // update JSON query
  function updateForm() {
    hideRemoveIfOnlyOneLeft();

    query = get_current_query();
    is_new_query = true;
    $("#queryJson").val(JSON.stringify(query, undefined, 4));
  }

  // OR buttons
  $("#search_form").on("click", ".addOR", function (event) {
    event.preventDefault();
    let $clause = $(this).parent();
    addOr($clause);
    updateForm();
  });

  // X buttons
  $("#search_form").on("click", ".remove_row", function (event) {
    let $row = $(this).closest(".search_or_row");
    let $clause = $row.parent();
    $row.remove();
    // If no OR rows left in this 'AND' clause...
    console.log(
      `$(".search_or_row", $clause).length`,
      $(".search_or_row", $clause).length
    );
    if ($(".search_or_row", $clause).length === 0) {
      let $and = $clause.prev();
      console.log("and", $and);
      if ($and.length == 0) {
        // in case we're removing the first row
        $and = $clause.next();
      }
      $and.remove();
      $clause.remove();
    }
    updateForm();
  });

  // AND button
  $("#addAND").on("click", function () {
    addAnd();
    updateForm();
  });

  // handle any input/select changes to update textarea
  $("#search_form").on("change", "select", updateForm);
  $("#search_form").on("keyup", "input", updateForm);

  // initial update of JSON textarea
  updateForm();
  // update form in case case_sensitive changed
  $("#case_sensitive").on("click", function (event) {
    updateForm();
  });
});

function addAnd(attribute, operator, value) {
  is_new_query = true;
  let $form = $("#search_form");
  if ($form.children().length > 0) {
    $form.append("<div>AND</div>");
  }
  let $newRow = $andClause.clone();

  $form.append($newRow);

  set_query_fields($newRow.children()[0]);

  //set key values and auto complete

  if (attribute) {
    $(".keyFields", $newRow).val(attribute);
  }
  if (operator) {
    $(".condition", $newRow).val(operator);
  }
  if (value) {
    $(".valueFields", $newRow).val(value);
  }

  $newRow.bind("keydown", function (e) {
    if (e.keyCode === 13) return false;
  });

  return $newRow;
}

function addOr($and, attribute, operator, value) {
  is_new_query = true;
  let $row = $(".search_or_row", $and).last();
  let $newRow = $row.clone();

  $row.after($newRow);
  //set key values and auto complete
  if (attribute) {
    $(".keyFields", $newRow).val(attribute);
  }
  if (operator) {
    $(".condition", $newRow).val(operator);
  }
  if (value) {
    $(".valueFields", $newRow).val(value);
  }
  // I have added this line to reset the value as it is copied with its value, this should be invistigated  later
  else $(".valueFields", $newRow).val("");
  set_query_fields($newRow[0]);
  $newRow.bind("keydown", function (e) {
    if (e.keyCode === 13) return false;
  });
}
function load_query() {
  // load JSON from textarea and build form...
  let text = $("#queryJson").val();
  let jsonData = {};
  try {
    jsonData = JSON.parse(text);
  } catch (error) {
    alert("Failed to parse JSON");
    return;
  }
  let query_details = jsonData.query_details;
  if (!query_details) {
    alert("No 'query_details' in JSON");
    return;
  }
  set_the_query(query_details);
  display_hide_remove_buttons();
}

function set_the_query(query_details) {
  let and_filters = query_details.and_filters;
  let or_filters = query_details.or_filters;
  if (!(and_filters || or_filters)) {
    alert("No 'and_filters' or 'or_filters' in 'query_details'");
    return;
  }

  // Start by clearing form...
  $("#search_form").empty();

  // handle ANDs...
  and_filters.forEach((filter) => {
    let { name, operator, value } = filter;
    addAnd(name, operator, value);
  });

  // handle ORs...
  or_filters.forEach((or_filter) => {
    let $and;
    or_filter.forEach((filter) => {
      let { name, operator, value } = filter;
      if (!$and) {
        $and = addAnd(name, operator, value);
      } else {
        addOr($and, name, operator, value);
      }
    });
  });
}

function check_value(_keys_options, attribute) {
  _keys_options.value = attribute;
  if (_keys_options.selectedIndex === -1) {
    let values = resources_data["image"];
    values.push(attribute);
    $(_keys_options).append(new Option(attribute, attribute));
  }
}

function display_hide_remove_buttons() {
  let btns = document.querySelectorAll("#remove_row");
  btns.forEach(function (btn) {
    if (btns.length == 1) {
      btn.style.visibility = "hidden";
    } else {
      btn.style.visibility = "visible";
    }
  });
}

function onRowDoubleClicked(event) {
  /* when the user double check a row inside the grid
it will get he attribute and value pair and set the query builder for using them, then submit a query to get the results
*/

  const rowNode = event.api.getRowNode(event.node.rowIndex);
  let resource = rowNode.data.Resource;
  if (resource === undefined) resource = get_resource(rowNode.data.Attribute);
  if (resource === undefined) resource = "image";
  if (resources_data.hasOwnProperty(resource)) {
    if (resources_data[resource].indexOf(rowNode.data.Attribute) == -1)
      resources_data[resource].push(rowNode.data.Attribute);
  } else resources_data[resource] = [rowNode.data.Attribute];
  query = get_current_query();
  if (
    query["query_details"]["or_filters"].length == 0 &&
    query["query_details"]["and_filters"].length == 1
  ) {
    if (query["query_details"]["and_filters"][0]["name"] === "Any") {
      $("#search_form").empty();
    }
  }

  addAnd(rowNode.data.Attribute, "equals", rowNode.data.Value);

  display_hide_remove_buttons();
  query = get_current_query();
  var querybuilderTab = document.querySelector("#tabs  #querybuilder_nav a");
  var tab = new bootstrap.Tab(querybuilderTab);
  tab.show();
  $("#queryJson").val(JSON.stringify(query, undefined, 4));
  document.getElementById("submit_").click();
}

function removeAllChildNodes(parentNode) {
  while (parentNode.firstChild) {
    parentNode.removeChild(parentNode.firstChild);
  }
}

function onSortChangedEvent(event) {
  /*
update row index after sorting
*/
  event.api.forEachNode((rowNode, index) => {
    rowNode.rowIndex = index;
  });
}

function display_value_search_results(results, resource) {
  /*
   Dipsly general search results using any value
   */
  if (results["Error"] != undefined) {
    alert(results["Error"]);
    $("body").removeClass("wait");
    return;
  }
  if (results["data"].length > 0) {
    let colNames = Object.keys(results["data"][0]);
    for (i in results["data"])
      results["data"][i]["Attribute"] = results["data"][i]["Key"];
    var searchGridOptions = {
      defaultColDef: {
        resizable: true,
        filter: true,
        animateRows: true,
      },
      enableCellTextSelection: true,
      // "columnDefs":[{"field":"Attribute","sortable":true}...]
      columnDefs: colNames.map((name) => {
        if (name.toLowerCase() == "key") {
          name = "Attribute";
        }
        return { field: name, sortable: true };
      }),

      rowData: null,
      rowSelection: "single",
      rowData: null,
      onCellDoubleClicked: onRowDoubleClicked,
      onSortChanged: onSortChangedEvent,
      onFilterChanged: onSortChangedEvent,
    };
    const searcheGridDiv = document.querySelector("#grid_key_values");
    searcheGridDiv.innerHTML = "";
    let search_ag_grid = new agGrid.Grid(searcheGridDiv, searchGridOptions);
    search_ag_grid.gridOptions.api.setRowData(results.data);
    search_ag_grid.gridOptions.api.sizeColumnsToFit();
    document.getElementById("help_message").style.display = "none";
    document.getElementById("exportsearchResults").style.display = "block";
    $("#exportsearchResults").unbind("click");
    $("#exportsearchResults").on("click", function (event) {
      search_ag_grid.gridOptions.api.exportDataAsCsv(getParams());
    });
    //results["total_number_of_images"], results["total_number_of_buckets"]
    if (resource == "all")
      $("#total_number_in_buckets").text(
        "Number of buckets: " + results.total_number_of_buckets
      );
    else {
      $("#total_number_in_buckets").text(
        "Number of buckets: " +
          results["total_number_of_buckets"] +
          ", Total number of " +
          resource +
          "s: " +
          results["total_number"]
      );
    }
  } else {
    alert("No results found");
  }
  $("body").removeClass("wait");
  var attributebrwoserTab = document.querySelector(
    "#tabs  #attributebrwoser_nav a"
  );
  var tab = new bootstrap.Tab(attributebrwoserTab);
  tab.show();
}

$("#value_field_search_only").on("click", function (event) {
  /*
  Search  using values provided by the user*/
  event.preventDefault();
  value = $("#value_field").val();
  if (value == null) {
    alert("No value is provided ..");
    return;
  }
  query = { value: $("#value_field").val(), resource: "image" };
  $("body").addClass("wait");
  let resource = "all";
  let url =
    SEARCH_ENGINE_URL +
    `resources/${encodeURIComponent(
      resource
    )}/searchvalues/?value=${encodeURIComponent(value)}`;
  fetch(url).then(function (response) {
    {
      response.json().then(function (data) {
        if (data["Error"] !== undefined) {
          $("body").removeClass("wait");
          alert(data["Error"]);
          return;
        }
        let results = [];
        ["image", "project", "screen", "plate", "well"].forEach((dtype) => {
          if (data[dtype] && data[dtype].data.length > 0) {
            const res = data[dtype].data.map((r) => {
              return { ...r, Resource: dtype };
            });
            results = results.concat(res);
          }
        });
        display_value_search_results({ data: results }, resource);
      });
    }
  });
});

set_tree_events_handller();

function update_key_fields() {
  const keyFields = document.querySelectorAll("#keyFields");

  for (i in keyFields) {
    __keys_options = keyFields[i];
    key = __keys_options.value;

    optionHtml = "";
    for (const [key, value] of Object.entries(resources_data)) {
      if (value == null) {
        __keys_options.innerHTML = optionHtml;
        break;
      }
      value.sort();
      for (i in value) {
        optionHtml +=
          '<option value ="' + value[i] + '">' + value[i] + "</option>";
      }
    }
    __keys_options.innerHTML = optionHtml;
    __keys_options.value = key;
  }
}

function searchforvalue() {}

function display_help() {
  var helptab = document.querySelector("#tabs  #help_nav a");
  var tab = new bootstrap.Tab(helptab);
  tab.show();
}

function display_hide_grid_columns() {
  //get the rows data
  rows_data = [];
  columnDefs.forEach(function (column) {
    if (
      column["field"] != "Id" &&
      column["field"] != "Name" &&
      column["field"] != "Study name"
    )
      if (column["hide"] == true)
        rows_data.push({ Name: column["field"], Hidden: false });
      else rows_data.push({ Name: column["field"], Hidden: true });
  });
  //table header
  var header = ["Column Name", "Visible"];

  //create the table on the fly using the row data
  insert_rows_values_table("table_display_hide", header, rows_data);

  //diplay the modal which contains the table
  displayMessage("Display/Hide columns", "Update");
}

function insert_rows_values_table(table_id, header, rows) {
  /* insert rows for the display/hide columns
   */
  var table = document.getElementById(table_id);
  table.innerHTML = "";
  var thead = document.createElement("thead");
  table.appendChild(thead);
  for (var i = 0; i < header.length; i++) {
    thead
      .appendChild(document.createElement("th"))
      .appendChild(document.createTextNode(header[i]));
  }
  rows.forEach(function (row_) {
    var row = table.insertRow();
    var cell = row.insertCell();
    cell.innerHTML = row_["Name"];
    var chk = document.createElement("input");
    chk.setAttribute("type", "checkbox");
    chk.checked = row_["Hidden"];
    chk.setAttribute("id", row_["Name"]);
    var cell2 = row.insertCell();
    cell2.appendChild(chk);
  });
  $("#" + table_id).addClass("table table-striped header-fixed");
}

function update_table_visability() {
  /*
check the columns table to set their visability
*/
  table = document.getElementById("table_display_hide");
  dict_hide = {};
  for (i = 0; i < table.rows.length; i++) {
    // get the row cell collection.
    var rowCells = table.rows.item(i).cells;
    //Get attribute name
    name = rowCells.item(0).innerHTML;
    //get hidden or not
    chk = rowCells.item(1).childNodes[0];

    if (chk.checked == false) dict_hide[name] = true;
    else dict_hide[name] = false;

    ag_grid.gridOptions.columnApi.setColumnsVisible([name], chk.checked);
  }
  columnDefs.forEach(function (column) {
    if (
      column["field"] != "Id" &&
      column["field"] != "Name" &&
      column["field"] != "Study name"
    )
      column["hide"] = dict_hide[column["field"]];
  });
}

function set_columns_selection(checked) {
  columnDefs.forEach(function (column) {
    if (
      column["field"] != "Id" &&
      column["field"] != "Name" &&
      column["field"] != "Study name"
    ) {
      column["hide"] = checked;

      if (checked == true)
        ag_grid.gridOptions.columnApi.setColumnsVisible(
          [column["field"]],
          false
        );
      else
        ag_grid.gridOptions.columnApi.setColumnsVisible(
          [column["field"]],
          true
        );
    }
  });
}

function set_help_file() {
  /*
creae the elemets inside thehelp div from the help file contents.
It displays the first line in each paragraph in bold.
*/

  for (i in help_contents) {
    let sub_lines = help_contents[i].split(".");
    text = "";
    for (j in sub_lines) {
      if (j == 0) text = "<b>" + sub_lines[j] + "</b>";
      else {
        text = text + ". " + sub_lines[j];
      }
    }
    var p = document.createElement("p");
    p.innerHTML = text;
    p.classList.add("text-justify");
    document.getElementById("help").appendChild(p);
  }
}
