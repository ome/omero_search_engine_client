<script>
  import { BASE_URL } from '../searchengine.js';
  import { selectedImageStore, queryStore } from '../searchQueryStore.js';
  import { selectedContainerStore } from '../containerStore.js';

  let selectedObject = null;

  // We reload right panel when selected object changes
  selectedImageStore.subscribe((image) => {
    let obj = { ...image, type: 'image' };
    selectedObject = obj;
  });
  selectedContainerStore.subscribe((container) => {
    if (container?.ignoreRightPanel) {
      return;
    }
    selectedObject = container;
  });

  function titleCase(str) {
    return str.slice(0, 1).toUpperCase() + str.slice(1);
  }
</script>

{#if selectedObject}
  <div class="details">
    <h3>{selectedObject.name}</h3>
    <h4>
      {titleCase(selectedObject.type)} ID: {selectedObject.id}
      {#if selectedObject.type == 'image'}
        <a
          class="viewer_link"
          href="{BASE_URL}webclient/img_detail/{selectedObject.id}"
          target="_blank"
        >
          Full Viewer
        </a>
      {/if}
    </h4>
  </div>

  {#if selectedObject.key_values}
   <div class="scrollable">
    <div class="annotations">
        <div class="map_ann">
          <table>
            <tbody>
              {#each selectedObject.key_values as kvp}
                {@const key = kvp.key || kvp.name}
                {@const value = kvp.value}
                <tr class="tablerow">
                  <td>{key}</td>
                  <td>
                    {#if selectedObject.type == 'image'}
                      <!-- Link to this image with filter by KVP: ?key=Gene+Symbol&value=pax7&operator=equals -->
                      <!-- but actual link click just adds filter -->
                      <a
                        class="kvp_link"
                        on:click|preventDefault={() =>
                          queryStore.addFilter({
                            key: key,
                            value: value,
                            dtype: 'image',
                            operator: 'equals'
                          })}
                        title="Filter by this key-value pair"
                        href="{window.location.origin +
                          window.location
                            .pathname}?key={key}&value={value}&operator=equals&show=image-{selectedObject.id}"
                      >
                        {value}
                      </a>
                    {:else}
                      <!-- No link for containers yet -->
                      {value}
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
    </div>
  </div>
  {/if}
{/if}

<style>
  .viewer_link {
    border: solid #aaa 1px;
    display: block;
    border-radius: 5px;
    text-decoration: none;
    padding: 1px 3px;
    float: right;
    font-size: 13px;
    color: inherit;
  }
  .kvp_link {
    color: inherit;
    text-decoration: none;
  }
  .kvp_link:hover {
    text-decoration: underline;
  }
  a:visited {
    color: inherit;
  }
  .details {
    flex: auto 0 0;
    padding-bottom: 10px;
  }
  .scrollable {
    flex: auto 1 1;
    overflow: auto;
  }
  .annotations {
    color: hsl(210, 10%, 30%);
    font-size: 12px;
    background-color: hsl(220, 20%, 95%);
    display: flex;
    flex-direction: column;
    z-index: 0;
    height: 100px;
  }
  .annotations table {
    width: 100%;
  }
  .annotations h2 {
    font-size: 16px;
    color: hsl(210, 10%, 30%);
    inset: 0;
    flex: auto 0 0;
    margin: 10px;
    text-align: left;
  }
  .annotations th h2 {
    font-size: 15px;
    margin: 0;
  }

  .tablerow {
    background: hsl(220, 20%, 95%);
    border: solid #ddd 1px;
  }
  .map_ann td,
  .map_ann th {
    padding: 3px 5px;
    background-color: hsl(220, 20%, 95%);
    width: 50%;
    max-width: 100px;
    overflow-wrap: break-word;
    overflow: hidden;
  }
  .map_ann {
    padding: 0;
    margin: 0;
  }
  .map_ann table {
    margin: 0;
    border-collapse: collapse;
  }
</style>
