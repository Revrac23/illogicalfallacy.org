# Illogical Fallacy

**[illogicalfallacy.org](https://illogicalfallacy.org)**

A practical guide to logical fallacies, flawed reasoning, and the ways arguments can go wrong.

## About

Illogical Fallacy is an open-source reference for understanding common errors in reasoning.

The goal is to make fallacies easier to recognize and understand without relying on overly academic explanations. Each fallacy focuses on what the reasoning error is, how it works, and how it appears in real arguments.

The site currently organizes fallacies into several broad categories:

* **Ambiguity** — errors caused by unclear, vague, or shifting meanings
* **Causal Reasoning** — mistakes involving cause and effect
* **Presumption** — arguments that assume what they need to establish
* **Probability** — errors involving probability, statistics, or likelihood
* **Relevance** — arguments that rely on information unrelated to the conclusion
* **Weak Induction** — arguments where the evidence does not adequately support the conclusion

Visit the live site at **[illogicalfallacy.org](https://illogicalfallacy.org)**.

## Why This Exists

Logical fallacies aren't simply lists of "bad arguments." They are recurring patterns of reasoning that can make an argument appear stronger than it actually is.

Understanding these patterns can help with:

* Evaluating claims and arguments
* Identifying unsupported conclusions
* Recognizing misleading rhetoric
* Improving critical thinking
* Constructing stronger arguments
* Separating disagreement from faulty reasoning

The project aims to explain these concepts in plain language while maintaining enough precision to be useful as a reference.

## Project Structure

This is a [Hugo](https://gohugo.io/) static site.

```text
.
├── archetypes/       # Hugo content templates
├── assets/           # Assets processed by Hugo
├── content/          # Fallacy and site content
│   ├── fallacies/
│   └── categories/
├── layouts/          # Hugo templates
├── static/            # Static files
├── public/            # Generated site (not normally committed)
├── hugo.toml         # Hugo configuration
├── netlify.toml      # Netlify build configuration
└── README.md
```

The content itself lives primarily under `content/`. Hugo uses the directory structure and front matter in these files to build the corresponding pages.

## Running Locally

### Requirements

* [Hugo](https://gohugo.io/)
* Git

Check your Hugo installation:

```bash
hugo version
```

Clone the repository:

```bash
git clone https://github.com/Revrac23/illogicalfallacy.org.git
cd illogicalfallacy.org
```

Start the development server:

```bash
hugo server
```

Then open:

```text
http://localhost:1313/
```

Hugo will watch the project for changes and automatically rebuild the site during development.

### Build the Site

To generate a production build:

```bash
hugo --minify
```

The generated site will be placed in:

```text
public/
```

## Adding a Fallacy

Fallacies are written as Markdown files under the `content/fallacies/` directory.

For example:

```text
content/
└── fallacies/
    ├── ad-hominem.md
    ├── appeal-to-authority.md
    ├── straw-man.md
    └── ...
```

A typical fallacy page contains front matter followed by the explanation:

```markdown
---
title: "Ad Hominem"
description: "Rejecting an argument by attacking the person making it."
categories:
  - Relevance
---

## Definition

An ad hominem argument attacks the person making an argument
rather than addressing the argument itself.

## Example

> You shouldn't listen to her opinion about economics.
> She doesn't even have a college degree.

## Why It Fails

The qualifications or characteristics of the person making an
argument do not, by themselves, determine whether the argument
is correct.
```

The exact front matter and structure should follow the conventions already used by the existing fallacy pages.

## Categories

Fallacies are organized into categories to make related reasoning errors easier to discover.

Current categories include:

| Category         | Description                                            |
| ---------------- | ------------------------------------------------------ |
| Ambiguity        | Errors involving unclear or shifting meanings          |
| Causal Reasoning | Errors involving cause and effect                      |
| Presumption      | Arguments based on unsupported assumptions             |
| Probability      | Errors involving probability and likelihood            |
| Relevance        | Arguments that rely on irrelevant information          |
| Weak Induction   | Arguments where evidence provides insufficient support |

Categories are represented as Hugo sections/taxonomies and have their own pages on the site.

### Pull Requests

1. Fork the repository.
2. Create a branch for your change.
3. Make your changes.
4. Test the site locally with Hugo.
5. Verify that the generated pages render correctly.
6. Open a pull request describing the change.

For content contributions, please explain why the proposed fallacy or change is useful and include supporting references when appropriate.

## Deployment

The site is deployed through [Netlify](https://www.netlify.com/) from the GitHub repository.

Changes pushed to the main branch trigger a new site build.

The production build uses Hugo and publishes the generated `public/` directory.

The Hugo version should remain consistent between local development and the Netlify build environment. Netlify supports specifying the Hugo version through the `HUGO_VERSION` environment variable.

## Technology

* [Hugo](https://gohugo.io/) — Static site generation
* [HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) — Page structure
* [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) — Styling
* [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) — Client-side functionality where needed
* [Markdown](https://www.markdownguide.org/) — Content
* [GitHub](https://github.com/) — Source control
* [Netlify](https://www.netlify.com/) — Hosting and deployment

## License

This project is open source.

See the repository's license file for the terms under which the source code and content may be used, modified, and distributed.

## Disclaimer

The site is intended as an educational reference for reasoning and critical thinking.

Identifying a fallacy does not, by itself, establish that a conclusion is false. An argument can contain faulty reasoning and still reach a true conclusion; conversely, a valid argument can reach an undesirable or incorrect conclusion if its premises are false.

The purpose of identifying fallacies is to evaluate **how a conclusion is supported**, not simply whether we agree with the conclusion.

---

**Website:** [illogicalfallacy.org](https://illogicalfallacy.org)

**Source:** [github.com/Revrac23/illogicalfallacy.org](https://github.com/Revrac23/illogicalfallacy.org)

