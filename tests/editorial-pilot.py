"""Build the site with Hugo on PATH and check the editorial pilot's HTML."""

from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest

ROOT = Path(__file__).resolve().parents[1]
SEP = "https://plato.stanford.edu/entries/fallacies/"


class EditorialPilot(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        output = TemporaryDirectory()
        cls.addClassCleanup(output.cleanup)
        cls.site = Path(output.name)
        subprocess.run(
            ["hugo", "--noBuildLock", "--destination", output.name],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )

    def test_articles(self):
        cases = [
            ("appeal-to-authority", "relevance", "appeal-to-expertise",
             "The labels overlap", "structural engineer"),
            ("appeal-to-expertise", "relevance", "appeal-to-authority",
             "The labels overlap", "humidity logs"),
            ("burden-of-proof", "presumption", "shifting-the-burden-of-proof",
             "responsibility to support a claim", "delivery records"),
            ("shifting-the-burden-of-proof", "presumption", "burden-of-proof",
             "unfairly transfer that responsibility", "utility bills"),
        ]
        for slug, category, companion, distinction, example in cases:
            with self.subTest(slug=slug):
                page = (self.site / "fallacies" / slug / "index.html").read_text()
                article = page.split('<article class="fallacy-content">')[1].split("</article>")[0]
                self.assertIn('href="/categories/' + category + '/"', page)
                self.assertIn('href="/fallacies/' + companion + '/"', article)
                related = page.split('<section class="related-fallacies">')[1].split("</section>")[0]
                self.assertIn('href="/fallacies/' + companion + '/"', related)
                if category == "presumption":
                    self.assertIn('href="/fallacies/appeal-to-ignorance/"', related)
                if slug == "burden-of-proof":
                    self.assertIn("Reasoning principle", page)
                self.assertIn(distinction, article)
                legitimate = article.split('<h2 id="legitimate-example">')[1].split("<h2")[0]
                self.assertIn(example, legitimate)
                section = "CorFal" if slug == "appeal-to-authority" else "DiaAppFal"
                self.assertIn(f'href="{SEP}#{section}"', article)

    def test_about_and_corrections(self):
        page = (self.site / "about" / "index.html").read_text()
        self.assertIn('<h1>About &amp; Corrections</h1>', page)
        self.assertIn('<h2 id="corrections">Corrections</h2>', page)
        self.assertIn('href="https://github.com/Revrac23/illogicalfallacy.org/issues"', page)
        footer = (self.site / "index.html").read_text().split("<footer")[1]
        self.assertIn('href="/about/"', footer)


if __name__ == "__main__":
    unittest.main()
