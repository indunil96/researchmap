/**
 * Make publication list of a researchmap permalink at ul#publist.
 * @param {string} permalink - A researchmap permalink of a researcher.
 * @param {string} ulid - Id of HTML <ul> tag.
 * @param {int} limit - Maximum number of retrieved items.
 * @param {string} from_date - Starting publication date e.g. 2016 or 2016-01-01.
 * @param {string} to_date - Ending publication date e.g. 2016-01-01.
 */
function publist(permalink, ulid='publist', limit=1000, from_date='', to_date=''){
    let publicationList = document.querySelector(`ul#${ulid}`);  // target html element

    // Show loading state
    publicationList.innerHTML = '<li>Loading publications...</li>';

    const baseurl = 'https://api.researchmap.jp';
    const achievement_type = 'published_papers';
    const myHeaders = new Headers({'Accept': 'application/json'});
    let query_params = {};
    if (limit) { query_params["limit"] = limit; }
    if (from_date) { query_params["from_date"] = from_date; }
    if (to_date) { query_params["to_date"] = to_date; }
    const qs = new URLSearchParams(query_params);
    const url = `${baseurl}/${permalink}/${achievement_type}?${qs}`;

    console.log("Fetching from URL:", url);

    fetch(url, {method: 'GET', headers: myHeaders})
        .then((response) => {
            console.log(`Status: ${response.status}; ${response.url}`);
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log("Received data:", data);

            if (!data.hasOwnProperty("items") || data.items.length === 0) {
                throw new Error('No publications found');
            }

            // Clear loading message
            publicationList.innerHTML = '';

            // Debug: log the first few items to console
            console.log("First 3 items:", data.items.slice(0, 3));

            // Keep track of how many items we're processing
            let totalItems = data.items.length;
            let processedItems = 0;
            let displayedItems = 0;

            for (const item of data.items) {
                processedItems++;
                console.log(`Processing item ${processedItems}/${totalItems}:`, item);

                // Accept ALL publication types, not just scientific journals
                // Remove requirement for DOI

                // Create list item
                let listItem = document.createElement('li');
                listItem.style.marginBottom = '20px';
                listItem.style.borderBottom = '1px solid #eee';
                listItem.style.paddingBottom = '15px';

                // Paper title section
                let titleDiv = document.createElement('div');

                // Flag to track if we've added any title
                let titleAdded = false;

                // Add Japanese title with priority
                if (item.paper_title && item.paper_title.ja) {
                    let jpTitle = document.createElement('strong');
                    jpTitle.textContent = item.paper_title.ja;
                    jpTitle.style.fontSize = '1.1em';
                    jpTitle.style.color = '#000';
                    titleDiv.appendChild(jpTitle);
                    titleAdded = true;

                    // Add English title as secondary if available
                    if (item.paper_title.en) {
                        titleDiv.appendChild(document.createElement('br'));
                        let enTitle = document.createElement('span');
                        enTitle.textContent = item.paper_title.en;
                        enTitle.style.fontStyle = 'italic';
                        enTitle.style.fontSize = '0.95em';
                        enTitle.style.color = '#444';
                        titleDiv.appendChild(enTitle);
                    }
                }
                // If no Japanese title, use English
                else if (item.paper_title && item.paper_title.en) {
                    let enTitle = document.createElement('strong');
                    enTitle.textContent = item.paper_title.en;
                    enTitle.style.fontSize = '1.1em';
                    titleDiv.appendChild(enTitle);
                    titleAdded = true;
                }
                // If no title in either language, use a placeholder
                else {
                    let noTitle = document.createElement('em');
                    noTitle.textContent = '[No title available]';
                    titleDiv.appendChild(noTitle);
                    titleAdded = true;
                }

                // Only add this item if we managed to add a title
                if (titleAdded) {
                    listItem.appendChild(titleDiv);

                    // Journal and publication info
                    let infoDiv = document.createElement('div');
                    infoDiv.style.marginTop = '8px';

                    // Prefer Japanese journal name, fall back to English
                    let journalName = "";
                    if (item.publication_name) {
                        journalName = item.publication_name.ja || item.publication_name.en || "";
                    }

                    // Publication year
                    let pubYear = "";
                    if (item.publication_date) {
                        pubYear = item.publication_date.slice(0, 4);
                    }

                    // Publication type
                    let pubType = "";
                    if (item.published_paper_type) {
                        pubType = item.published_paper_type;
                    }

                    // Build the journal info line
                    if (journalName) {
                        let journalSpan = document.createElement('span');
                        journalSpan.innerHTML = `<i>${journalName}</i>`;
                        infoDiv.appendChild(journalSpan);

                        if (pubYear) {
                            infoDiv.appendChild(document.createTextNode(` (${pubYear})`));
                        }

                        if (pubType) {
                            infoDiv.appendChild(document.createTextNode(` [${pubType}]`));
                        }
                    } else if (pubYear) {
                        infoDiv.appendChild(document.createTextNode(`Published: ${pubYear}`));

                        if (pubType) {
                            infoDiv.appendChild(document.createTextNode(` [${pubType}]`));
                        }
                    }

                    listItem.appendChild(infoDiv);

                    // Add DOI if available
                    if (item.identifiers && item.identifiers.doi && item.identifiers.doi.length > 0) {
                        let doiDiv = document.createElement('div');
                        doiDiv.style.marginTop = '6px';

                        let doistr = item.identifiers.doi[0];
                        let doiLink = document.createElement('a');
                        doiLink.href = `https://doi.org/${doistr}`;
                        doiLink.textContent = doistr;
                        doiLink.target = '_blank';

                        doiDiv.appendChild(document.createTextNode('DOI: '));
                        doiDiv.appendChild(doiLink);

                        listItem.appendChild(doiDiv);
                    }

                    // Add to list
                    publicationList.appendChild(listItem);
                    displayedItems++;
                }
            }

            console.log(`Displayed ${displayedItems} out of ${totalItems} items.`);

            // If no publications were found or displayed
            if (publicationList.children.length === 0) {
                publicationList.innerHTML = '<li>No publications found matching the criteria.</li>';
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            publicationList.innerHTML = `<li style="color: red;">Error loading publications: ${error.message}</li>`;
        });
}