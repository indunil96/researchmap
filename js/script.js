/**
 * Search for researchers and display their publications using direct URL approach
 */
async function searchResearcher() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) {
        alert("Please enter a researcher name or ID.");
        return;
    }

    // Clear previous results
    document.getElementById("profile").innerHTML = "Searching...";
    document.getElementById("publist").innerHTML = "";

    try {
        // First check if the query is a direct permalink
        let permalink = query;

        // If it's not in permalink format, search for the researcher
        if (!query.match(/^[a-zA-Z0-9_-]+$/)) {
            // The ResearchMap API doesn't have a direct search function,
            // so we need to use their search API differently
            const searchUrl = `https://api.researchmap.jp/researchers?name=${encodeURIComponent(query)}&count=10`;

            console.log(`Fetching researchers from: ${searchUrl}`);

            const searchResponse = await fetch(searchUrl, {
                method: 'GET',
                headers: {'Accept': 'application/json'}
            });

            if (!searchResponse.ok) {
                throw new Error(`API returned status ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();
            console.log("Search results:", searchData);

            if (!searchData.hasOwnProperty("items") || searchData.items.length === 0) {
                document.getElementById("profile").innerHTML = "No researchers found matching your query.";
                return;
            }

            // Get the first researcher's permalink
            permalink = searchData.items[0].permalink;
        }

        // Now fetch the researcher's profile
        const profileUrl = `https://api.researchmap.jp/${permalink}`;
        console.log(`Fetching profile from: ${profileUrl}`);

        const profileResponse = await fetch(profileUrl, {
            method: 'GET',
            headers: {'Accept': 'application/json'}
        });

        if (!profileResponse.ok) {
            throw new Error(`Researcher profile not found (${profileResponse.status})`);
        }

        const profileData = await profileResponse.json();
        console.log("Profile data:", profileData);

        // Display researcher profile
        let profileHTML = `<div class="researcher-profile">`;

        // Name (prefer Japanese)
        if (profileData.name) {
            const researcherName = profileData.name.ja || profileData.name.en || "Unknown Name";
            profileHTML += `<h2>${researcherName}</h2>`;
        }

        // Add researcher photo if available
        if (profileData.image_url) {
            profileHTML += `<img src="${profileData.image_url}" alt="Researcher Photo" style="max-width:150px; margin:10px 0;">`;
        }

        // Affiliation (prefer Japanese)
        if (profileData.affiliation) {
            const affiliations = profileData.affiliation.map(aff => {
                return aff.name?.ja || aff.name?.en || "Unknown Affiliation";
            }).join(", ");

            profileHTML += `<p><strong>所属:</strong> ${affiliations}</p>`;
        }

        // Add link to full profile and publications
        profileHTML += `<p><a href="https://researchmap.jp/${permalink}" target="_blank">View Full Profile on ResearchMap</a></p>`;
        profileHTML += `<p><a href="https://researchmap.jp/${permalink}/published_papers?limit=100" target="_blank">View All Publications (論文)</a></p>`;
        profileHTML += `</div>`;

        document.getElementById("profile").innerHTML = profileHTML;

        // Show loading message for publications
        document.getElementById("publist").innerHTML = "<li>Loading publications...</li>";

        // Use the direct publications URL
        fetchPublicationsDirectly(permalink);

    } catch (error) {
        console.error("Error:", error);
        document.getElementById("profile").innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    }
}

/**
 * Fetch publications directly from the published_papers endpoint
 * This ensures we get all the 論文 (both Japanese and English papers)
 */
async function fetchPublicationsDirectly(permalink, limit = 100) {
    const publicationList = document.getElementById("publist");

    try {
        // Use the direct URL suggested
        const directUrl = `https://api.researchmap.jp/${permalink}/published_papers?limit=${limit}`;
        console.log(`Fetching publications from direct URL: ${directUrl}`);

        const response = await fetch(directUrl, {
            method: 'GET',
            headers: {'Accept': 'application/json'}
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch publications (${response.status})`);
        }

        const data = await response.json();
        console.log("Publications data:", data);

        if (!data.hasOwnProperty("items") || data.items.length === 0) {
            publicationList.innerHTML = "<li>No publications found for this researcher.</li>";
            return;
        }

        // Clear any previous content
        publicationList.innerHTML = "";

        // Process and display each publication
        for (const item of data.items) {
            // Create list item
            let listItem = document.createElement('li');
            listItem.style.marginBottom = '20px';
            listItem.style.borderBottom = '1px solid #eee';
            listItem.style.paddingBottom = '15px';

            // Title section
            let titleDiv = document.createElement('div');

            // Add Japanese title with priority
            if (item.paper_title && item.paper_title.ja) {
                let jpTitle = document.createElement('strong');
                jpTitle.textContent = item.paper_title.ja;
                jpTitle.style.fontSize = '1.1em';
                jpTitle.style.color = '#000';
                titleDiv.appendChild(jpTitle);

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
            }
            // If no title in either language, use a placeholder
            else {
                let noTitle = document.createElement('em');
                noTitle.textContent = '[No title available]';
                titleDiv.appendChild(noTitle);
            }

            listItem.appendChild(titleDiv);

            // Publication info section
            let infoDiv = document.createElement('div');
            infoDiv.style.marginTop = '8px';

            // Prefer Japanese journal name, fall back to English
            let journalName = "";
            if (item.publication_name) {
                journalName = item.publication_name.ja || item.publication_name.en || "";
            }

            // Build the journal info line
            if (journalName) {
                let journalSpan = document.createElement('span');
                journalSpan.innerHTML = `<i>${journalName}</i>`;
                infoDiv.appendChild(journalSpan);

                if (item.publication_date) {
                    infoDiv.appendChild(document.createTextNode(` (${item.publication_date.slice(0, 4)})`));
                }

                if (item.published_paper_type) {
                    infoDiv.appendChild(document.createTextNode(` [${item.published_paper_type}]`));
                }
            } else if (item.publication_date) {
                infoDiv.appendChild(document.createTextNode(`Published: ${item.publication_date.slice(0, 4)}`));

                if (item.published_paper_type) {
                    infoDiv.appendChild(document.createTextNode(` [${item.published_paper_type}]`));
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
        }

        // Add a note showing the total count
        const totalNote = document.createElement('p');
        totalNote.innerHTML = `<small>Showing ${data.items.length} publications out of ${data.number_of_items} total.</small>`;
        publicationList.parentNode.insertBefore(totalNote, publicationList.nextSibling);

    } catch (error) {
        console.error("Error fetching publications:", error);
        publicationList.innerHTML = `<li style="color:red;">Error loading publications: ${error.message}</li>`;
    }
}