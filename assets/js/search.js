document.addEventListener("DOMContentLoaded", async () => {
  const input = document.querySelector("#fallacy-search");
  const results = document.querySelector("#search-results");
  const noResults = document.querySelector("#no-results");
  const status = document.querySelector("#results-status");
  const filterButtons = [...document.querySelectorAll("[data-category]")];

  if (!input || !results) {
    return;
  }

  let fallacies = [];
  let activeCategory = "all";

  try {
    const response = await fetch("/fallacies/index.json");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    fallacies = await response.json();
  } catch (error) {
    console.error("Unable to load fallacy search index:", error);
    return;
  }

  function createCategoryLink(category) {
    const link = document.createElement("a");
    link.className = "category";
    link.href = `/categories/${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}/`;
    link.textContent = category;
    return link;
  }

  function render(items) {
    results.innerHTML = "";

    items.forEach((fallacy) => {
      const article = document.createElement("article");
      article.className = "fallacy-card";

      const title = document.createElement("h2");
      const link = document.createElement("a");

      link.href = fallacy.url;
      link.textContent = fallacy.title;

      title.appendChild(link);
      article.appendChild(title);

      if (fallacy.description) {
        const description = document.createElement("p");
        description.textContent = fallacy.description;
        article.appendChild(description);
      }

      if (fallacy.categories?.length) {
        const categories = document.createElement("div");
        categories.className = "categories";

        fallacy.categories.forEach((category) => {
          categories.appendChild(createCategoryLink(category));
        });

        article.appendChild(categories);
      }

      results.appendChild(article);
    });

    noResults.hidden = items.length !== 0;
    const noun = items.length === 1 ? "fallacy" : "fallacies";
    status.textContent = `Showing ${items.length} ${noun}`;
  }

  function updateResults() {
    const query = input.value.trim().toLowerCase();
    const terms = query.split(/\s+/);

    const filtered = fallacies
      .filter((fallacy) => activeCategory === "all" || fallacy.categories?.includes(activeCategory))
      .map((fallacy) => {
      const searchableText = [
        fallacy.title,
        ...(fallacy.aliases || []),
        fallacy.description,
        ...(fallacy.categories || []),
        fallacy.content
      ]
        .join(" ")
        .toLowerCase();

        if (!query || !terms.every((term) => searchableText.includes(term))) {
          return query ? null : { fallacy, score: 0 };
        }

        const title = fallacy.title.toLowerCase();
        const aliases = (fallacy.aliases || []).map((alias) => alias.toLowerCase());
        const score = title === query ? 3 : aliases.includes(query) ? 2 : title.includes(query) ? 1 : 0;
        return { fallacy, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.fallacy.title.localeCompare(b.fallacy.title))
      .map(({ fallacy }) => fallacy);

    render(filtered);
  }

  input.addEventListener("input", updateResults);

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      filterButtons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
      updateResults();
    });
  });
});
