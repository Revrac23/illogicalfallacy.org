"""Check a fresh production build against the site's source content."""

import json
import re
import sys
import tomllib
import unittest
from collections import Counter
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

import yaml


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(sys.argv.pop(1)).resolve()
BASE_URL = tomllib.loads((ROOT / "hugo.toml").read_text())["baseURL"]


def metadata(path):
    return yaml.safe_load(path.read_text().split("---", 2)[1])


def html_at(url):
    path = OUTPUT / url.lstrip("/")
    if url.endswith("/"):
        path /= "index.html"
    return path.read_text()


def plain(html):
    return " ".join(unescape(re.sub(r"<[^>]*>", "", html)).split())


class Links(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.references = []
        self.ids = set()
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.references.extend(attrs[key] for key in ("href", "src") if attrs.get(key))
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "a" and "name" in attrs:
            self.ids.add(attrs["name"])


FALLACIES = {
    f"/fallacies/{path.stem}/": metadata(path)
    for path in (ROOT / "content/fallacies").glob("*.md")
    if not path.name.startswith("_")
}
CATEGORIES = {
    f"/categories/{path.parent.name}/": metadata(path)
    for path in (ROOT / "content/categories").glob("*/_index.md")
}


class SiteChecks(unittest.TestCase):
    def test_category_index(self):
        html = html_at("/categories/")
        cards = re.findall(r"<a class=category-card href=([^ >]+)>(.*?)</a>", html, re.S)
        self.assertEqual(len(CATEGORIES), 6)
        self.assertEqual(len(cards), 6)
        self.assertEqual({url for url, _ in cards}, set(CATEGORIES))
        self.assertNotIn("Read about this fallacy", html)
        for url, card in cards:
            category = CATEGORIES[url]
            count = sum(category["title"] in entry["categories"] for entry in FALLACIES.values())
            label = "fallacy" if count == 1 else "fallacies"
            with self.subTest(url=url):
                self.assertIn(f'<h2>{category["title"]}</h2>', card)
                self.assertIn(category["description"], plain(card))
                self.assertEqual(plain(card.split("class=category-count>", 1)[1]), f"{count} {label}")

    def test_category_terms_list_fallacies(self):
        for url, category in CATEGORIES.items():
            with self.subTest(url=url):
                html = html_at(url)
                self.assertIn(category["title"], plain(re.search(r"<h1>(.*?)</h1>", html)[1]))
                self.assertIn(category["description"], plain(html))
                expected = {
                    link for link, entry in FALLACIES.items() if category["title"] in entry["categories"]
                }
                links = re.findall(r"<h2><a href=([^ >]+)>", html)
                self.assertCountEqual(links, expected)

    def test_diagram_opening_labels(self):
        for slug, label in (("false-cause", "A HAPPENS"), ("appeal-to-authority", "EXPERT")):
            with self.subTest(slug=slug):
                html = html_at(f"/fallacies/{slug}/")
                code = re.search(r"<pre[^>]*><code[^>]*>(.*?)</code>", html, re.S)
                self.assertIsNotNone(code)
                self.assertEqual(unescape(code[1]).splitlines()[0].strip(), label)

    def test_404_has_branded_recovery(self):
        path = OUTPUT / "404.html"
        self.assertTrue(path.is_file(), "Hugo did not generate 404.html")
        html = path.read_text()
        self.assertIn("Illogical Fallacy", plain(html))
        self.assertIn("404", plain(re.search(r"<h1>(.*?)</h1>", html)[1]))
        main = re.search(r"<main\b.*?</main>", html)[0]
        self.assertTrue({"/", "/fallacies/", "/categories/"} <= set(Links(main).references))

    def test_generated_internal_links(self):
        pages = {path: Links(path.read_text()) for path in OUTPUT.rglob("*.html")}
        failures = []
        for path, page in pages.items():
            source = path.relative_to(OUTPUT).as_posix()
            if source.endswith("index.html"):
                source = source.removesuffix("index.html")
            for reference in page.references:
                target = urlsplit(urljoin(urljoin(BASE_URL, source), reference))
                if target.scheme not in ("http", "https") or target.netloc != urlsplit(BASE_URL).netloc:
                    continue
                destination = OUTPUT / unquote(target.path).lstrip("/")
                if destination.is_dir():
                    destination /= "index.html"
                if not destination.is_file() or (
                    target.fragment and destination in pages
                    and unquote(target.fragment) not in pages[destination].ids
                ):
                    failures.append(f"{path.relative_to(OUTPUT)} → {reference}")
        self.assertFalse(failures, "\n".join(failures))

    def test_related_links_match_source_slugs(self):
        for url, entry in FALLACIES.items():
            with self.subTest(url=url):
                section = re.search(r"<section class=related-fallacies>(.*?)</section>", html_at(url))
                links = Links(section[1]).references if section else []
                expected = [f"/fallacies/{slug}/" for slug in (entry.get("related") or [])]
                self.assertEqual(links, expected)
                self.assertFalse(set(expected) - FALLACIES.keys())

    def test_search_index_matches_fallacy_pages(self):
        index = json.loads((OUTPUT / "fallacies/index.json").read_text())
        self.assertEqual(Counter(row["url"] for row in index), Counter(FALLACIES.keys()))
        for row in index:
            url = row["url"]
            with self.subTest(url=url):
                entry = FALLACIES[url]
                self.assertEqual(row["title"], entry["title"])
                self.assertEqual(row["description"], entry["description"])
                self.assertEqual(row["categories"], entry["categories"])
                self.assertEqual(row["aliases"], entry.get("alsoKnownAs", []))
                article = re.search(r"<article class=fallacy-content>(.*?)</article>", html_at(url), re.S)
                self.assertTrue(row["content"].strip())
                self.assertEqual(unescape(row["content"]).split(), plain(re.sub(
                    r"</?(?:h[1-6]|p|div|li|ul|ol|pre|blockquote|hr|br)\b[^>]*>", " ", article[1]
                )).split())


if __name__ == "__main__":
    unittest.main()
