document.addEventListener("DOMContentLoaded", async () => {
  const input = document.querySelector("#fallacy-search");
  const results = document.querySelector("#search-results");
  const noResults = document.querySelector("#no-results");

  if (!input || !results) {
    return;
  }

  let fallacies = [];

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
          const badge = document.createElement("span");
          badge.className = "category";
          badge.textContent = category;
          categories.appendChild(badge);
        });

        article.appendChild(categories);
      }

      results.appendChild(article);
    });

    noResults.hidden = items.length !== 0;
  }

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      render(fallacies);
      return;
    }

    const terms = query.split(/\s+/);

    const filtered = fallacies.filter((fallacy) => {
      const searchableText = [
        fallacy.title,
        fallacy.description,
        ...(fallacy.categories || []),
        fallacy.content
      ]
        .join(" ")
        .toLowerCase();

      return terms.every((term) => searchableText.includes(term));
    });

    render(filtered);
  });
});
