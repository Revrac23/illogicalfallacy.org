document.addEventListener("DOMContentLoaded", () => {
  const library = document.querySelector(".fallacy-index[data-search-index]");
  if (!library) {
    return;
  }

  const input = library.querySelector("#fallacy-search");
  const results = library.querySelector("#search-results");
  const noResults = library.querySelector("#no-results");
  const status = library.querySelector("#results-status");
  const reset = library.querySelector("#reset-filters");
  const filters = [...library.querySelectorAll(".filter-list [data-category]")];
  let activeCategory = "";
  let indexStatus = "Loading full-text search…";

  function normalize(text) {
    return text.normalize("NFKC").toLowerCase()
      .replace(/['’‘ʼ]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  const cards = [...results.children].map((element) => {
    const link = element.querySelector("h2 a");
    const categoryLinks = [...element.querySelectorAll(".categories [data-category]")];
    const title = normalize(link.textContent);
    const aliases = JSON.parse(element.dataset.aliases).map(normalize);
    return {
      element,
      url: link.href,
      title,
      aliases,
      categories: categoryLinks.map((link) => link.dataset.category),
      basicText: normalize([
        link.textContent,
        ...aliases,
        element.querySelector("p")?.textContent,
        ...categoryLinks.map((link) => link.textContent)
      ].join(" ")),
      fullText: ""
    };
  });

  function score(card, query, terms, compactQuery) {
    if (!query) return 0;
    if (card.title === query) return 5;
    if (card.aliases.includes(query)) return 4;
    if (card.title.replaceAll(" ", "") === compactQuery) return 3;
    if (card.aliases.some((alias) => alias.replaceAll(" ", "") === compactQuery)) return 2;
    if (card.title.includes(query)) return 1;
    return terms.every((term) => card.basicText.includes(term) || card.fullText.includes(term)) ? 0 : -1;
  }

  function updateResults() {
    const query = normalize(input.value);
    const terms = query.split(" ");
    const compactQuery = query.replaceAll(" ", "");
    const focused = document.activeElement;
    const matches = [];
    cards.forEach((card) => {
      const rank = activeCategory && !card.categories.includes(activeCategory)
        ? -1 : score(card, query, terms, compactQuery);
      if (rank < 0 && card.element.contains(focused)) {
        input.focus({ preventScroll: true });
      }
      card.element.hidden = rank < 0;
      if (rank >= 0) {
        matches.push({ element: card.element, rank });
      }
    });

    // Stable sorting preserves the rendered alphabetical order for ties.
    matches.sort((a, b) => b.rank - a.rank);
    let next = results.firstElementChild;
    for (const { element } of matches) {
      if (element === next) {
        next = next.nextElementSibling;
      } else {
        results.insertBefore(element, next);
      }
    }
    if (focused !== document.activeElement && results.contains(focused) && !focused.closest("[hidden]")) {
      focused.focus({ preventScroll: true });
    }

    noResults.hidden = matches.length !== 0;
    const noun = matches.length === 1 ? "fallacy" : "fallacies";
    status.textContent = [`Showing ${matches.length} ${noun}.`, indexStatus].filter(Boolean).join(" ");

    for (const filter of filters) {
      const active = filter.dataset.category === activeCategory;
      filter.classList.toggle("is-active", active);
      if (active) {
        filter.setAttribute("aria-current", "true");
      } else {
        filter.removeAttribute("aria-current");
      }
    }
  }

  function readLocation() {
    const params = new URLSearchParams(location.search);
    input.value = params.get("q") || "";
    const category = params.get("category");
    activeCategory = filters.some((filter) => filter.dataset.category === category) ? category : "";
    updateResults();
  }

  function updateLocation(method) {
    const url = new URL(location.href);
    const query = input.value.trim();
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    if (activeCategory) url.searchParams.set("category", activeCategory);
    else url.searchParams.delete("category");

    if (url.href !== location.href) {
      history[method](null, "", url);
    }
    updateResults();
  }

  input.addEventListener("input", () => updateLocation("replaceState"));
  for (const filter of filters) {
    filter.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      activeCategory = filter.dataset.category;
      updateLocation("pushState");
    });
  }

  reset.addEventListener("click", () => {
    input.value = "";
    activeCategory = "";
    updateLocation("pushState");
  });
  window.addEventListener("popstate", readLocation);
  input.closest(".search").hidden = false;
  readLocation();

  async function loadIndex() {
    try {
      const response = await fetch(library.dataset.searchIndex);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const index = await response.json();
      const contentByUrl = new Map(index.map(({ url, content }) => [
        new URL(url, response.url).href, normalize(content)
      ]));
      if (!cards.every((card) => contentByUrl.has(card.url))) {
        throw new Error("Incomplete fallacy search index");
      }
      for (const card of cards) {
        card.fullText = contentByUrl.get(card.url);
      }
      indexStatus = "";
    } catch {
      indexStatus = "Full-text search is unavailable. Basic search is still available.";
    }
    updateResults();
  }

  loadIndex();
});
