const DEFAULT_QUERY = "office";
const MAX_RESULTS = 10;
const MAX_CAST = 5;
const NOT_AVAILABLE = "Not available";
const RATE_LIMIT_MESSAGE =
    "TVmaze is limiting requests right now. Please wait a few seconds and try again.";

const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const button = document.querySelector("#search-form button");
const statusMessage = document.getElementById("status");
const gallery = document.getElementById("gallery");

function statusCheck(response) {
    if (response.status === 429) {
        throw new Error(RATE_LIMIT_MESSAGE);
    }
    if (!response.ok) {
        throw new Error(`TVmaze returned an error (status ${response.status}). Please try again.`);
    }
    return response;
}

function showMessage(text) {
    statusMessage.textContent = text;
}

function stripHtml(html) {
    if (!html) {
        return "";
    }
    return html.replace(/<[^>]*>/g, "").trim();
}

function addDetail(card, label, value) {
    const paragraph = document.createElement("p");
    paragraph.className = "card-detail";

    const labelElement = document.createElement("strong");
    labelElement.textContent = `${label}: `;

    const valueElement = document.createElement("span");
    valueElement.textContent = value;

    paragraph.appendChild(labelElement);
    paragraph.appendChild(valueElement);
    card.appendChild(paragraph);
    return valueElement;
}

function createPoster(show, name) {
    const box = document.createElement("div");
    box.className = "poster-box";

    if (show.image && show.image.medium) {
        const img = document.createElement("img");
        img.src = show.image.medium;
        img.alt = `Poster for the TV show ${name}`;
        img.addEventListener("error", () => {
            img.remove();
            box.textContent = "Poster not available";
        });
        box.appendChild(img);
    } else {
        box.textContent = "Poster not available";
    }

    return box;
}

function loadCast(showId, castElement) {
    fetch(`https://api.tvmaze.com/shows/${showId}/cast`)
        .then(statusCheck)
        .then((response) => response.json())
        .then((cast) => {
            const names = [];
            for (let i = 0; i < cast.length && names.length < MAX_CAST; i++) {
                if (cast[i].person && cast[i].person.name) {
                    names.push(cast[i].person.name);
                }
            }

            if (names.length > 0) {
                castElement.textContent = names.join(", ");
            } else {
                castElement.textContent = NOT_AVAILABLE;
            }
        })
        .catch((error) => {
            if (error.message === RATE_LIMIT_MESSAGE) {
                castElement.textContent = "Not available (TVmaze rate limit reached, try again shortly)";
            } else {
                castElement.textContent = NOT_AVAILABLE;
            }
        });
}

function createCard(show) {
    const name = show.name || "Untitled show";

    const card = document.createElement("article");
    card.className = "card";

    card.appendChild(createPoster(show, name));

    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = name;
    card.appendChild(title);

    const summary = document.createElement("p");
    summary.className = "card-summary";
    const summaryText = stripHtml(show.summary);
    if (summaryText === "") {
        summary.textContent = `Summary: ${NOT_AVAILABLE}`;
    } else if (summaryText.length > 250) {
        summary.textContent = summaryText.slice(0, 250) + "...";
    } else {
        summary.textContent = summaryText;
    }
    card.appendChild(summary);

    addDetail(card, "Premiered", show.premiered || NOT_AVAILABLE);

    let updatedText = NOT_AVAILABLE;
    if (show.updated) {
        updatedText = new Date(show.updated * 1000).toLocaleString();
    }
    addDetail(card, "Last updated", updatedText);

    let genresText = NOT_AVAILABLE;
    if (show.genres && show.genres.length > 0) {
        genresText = show.genres.join(", ");
    }
    addDetail(card, "Genres", genresText);

    let ratingText = NOT_AVAILABLE;
    if (show.rating && show.rating.average) {
        ratingText = `${show.rating.average} / 10`;
    }
    addDetail(card, "Rating", ratingText);

    const castElement = addDetail(card, "Main cast", "Loading...");

    if (show.url) {
        const link = document.createElement("a");
        link.className = "card-link";
        link.href = show.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = `View ${name} on TVmaze`;
        card.appendChild(link);
    }

    loadCast(show.id, castElement);

    return card;
}

function searchShows(query) {
    gallery.textContent = "";

    if (query === "") {
        showMessage("Please enter a show title or keyword to search.");
        return;
    }

    showMessage(`Searching for "${query}"...`);
    button.disabled = true;

    fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`)
        .then(statusCheck)
        .then((response) => response.json())
        .then((results) => {
            if (results.length === 0) {
                showMessage(`No shows found for "${query}". Try a different title or keyword.`);
                return;
            }

            let count = results.length;
            if (count > MAX_RESULTS) {
                count = MAX_RESULTS;
            }

            showMessage(`Showing ${count} result(s) for "${query}".`);
            for (let i = 0; i < count; i++) {
                gallery.appendChild(createCard(results[i].show));
            }
        })
        .catch((error) => {
            gallery.textContent = "";
            showMessage(`Could not load shows. ${error.message}`);
        })
        .finally(() => {
            button.disabled = false;
        });
}

function onSubmit(event) {
    event.preventDefault();
    searchShows(input.value.trim());
}

form.addEventListener("submit", onSubmit);

input.value = DEFAULT_QUERY;
searchShows(DEFAULT_QUERY);