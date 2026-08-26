"""
Live evidence retrieval for the claim+evidence inference path.

Mirrors how training evidence was built (Model/Dataset/Fever_Prep.ipynb):
FEVER pairs each claim with a single sentence pulled from a Wikipedia
article. At training/inference time there's no gold article/sentence id,
so this module replicates that pipeline live: search Wikipedia for
candidate articles, pull their plain text, and rank sentences by lexical
overlap with the claim.

NER strategy (in priority order):
  1. spaCy en_core_web_sm/md  — named entities (PERSON, ORG, GPE, LOC, WORK_OF_ART, …)
  2. spaCy noun chunks         — catches lowercase concept terms ("dark matter", "photosynthesis")
  3. Regex heuristic fallback  — capitalised noun phrases, used only if spaCy unavailable
"""

import logging
import re
import time
from typing import Dict, List, Optional, Set

import requests

logger = logging.getLogger(__name__)

# load spacy once at import time
try:
    import spacy

    for _model_name in ("en_core_web_md", "en_core_web_sm"):
        try:
            _nlp = spacy.load(_model_name, exclude=["lemmatizer", "textcat", "attribute_ruler"])
            logger.info(f"spaCy model loaded: {_model_name}")
            _SPACY_AVAILABLE = True
            break
        except OSError:
            continue
    else:
        _nlp = None
        _SPACY_AVAILABLE = False
        logger.warning(
            "No spaCy model found. Install with: "
            "pip install spacy && python -m spacy download en_core_web_sm"
        )
except ImportError:
    _nlp = None
    _SPACY_AVAILABLE = False
    logger.warning("spaCy not installed; falling back to regex NER.")


WIKI_API_URL = "https://en.wikipedia.org/w/api.php"
USER_AGENT = "FakeNewsClaimClassifier/1.0 (evidence-retrieval; contact: local-dev)"


_USEFUL_ENT_LABELS = {
    "PERSON", "NORP", "FAC", "ORG", "GPE", "LOC",
    "PRODUCT", "EVENT", "WORK_OF_ART", "LAW", "LANGUAGE",
}

_STOPWORDS: Set[str] = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "in", "on", "at", "of", "to", "for", "and", "or", "but", "with",
    "as", "by", "that", "this", "it", "its", "has", "have", "had",
    "not", "no", "do", "does", "did", "will", "would", "can", "could",
    "his", "her", "their", "they", "he", "she", "you", "i", "we",
}

_SECTION_HEADER_RE = re.compile(r"^\s*=+.*=+\s*$")
_SENTENCE_SPLIT_RE = re.compile(r'(?<=[.!?])\s+(?=[A-Z0-9"\'])')
_WORD_RE = re.compile(r"[a-z0-9]+")
# regex fallback
_ENTITY_RE = re.compile(r"[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*")

MAX_EXTRACT_CHARS = 20_000

# minimum page_weight — pages ranked 5+ still contribute at 30% weight
_MIN_PAGE_WEIGHT = 0.30


def _tokenize(text: str) -> List[str]:
    return [w for w in _WORD_RE.findall(text.lower()) if w not in _STOPWORDS]


def _sentence_fingerprint(sentence: str) -> str:
    """Normalised token set for near-duplicate detection."""
    return " ".join(sorted(_tokenize(sentence)))


# NER

def _extract_entities_spacy(claim: str) -> List[str]:
    """
    Use spaCy to pull named entities + noun chunks from the claim.

    Priority:
      - Named entities with useful labels come first (sorted longest-first so
        "New York City" beats "New York" as the lead search query).
      - Noun chunks are appended as a secondary pool — they catch concept terms
        like "dark matter" or "photosynthesis" that NER skips entirely.

    duplicates (case-insensitive) are removed while preserving order.
    """
    doc = _nlp(claim)

    seen: Set[str] = set()
    entities: List[str] = []

    def _add(text: str):
        key = text.lower().strip()
        if not key or key in _STOPWORDS or key in seen:
            return
        seen.add(key)
        entities.append(text.strip().rstrip(".,;:!?"))

    # 1. named entities (preferred — directly searchable on Wikipedia)
    named = [
        ent.text for ent in doc.ents
        if ent.label_ in _USEFUL_ENT_LABELS and len(ent.text.strip()) > 1
    ]
    named.sort(key=len, reverse=True)
    for e in named:
        _add(e)

    # 2. noun chunks fallback (catches lowercase concepts NER misses).
    try:
        chunks = [
            chunk.text for chunk in doc.noun_chunks
            if len(chunk.text.split()) >= 2  # single-word chunks are too general
        ]
        chunks.sort(key=len, reverse=True)
        for c in chunks:
            _add(c)
    except Exception as e:
        logger.debug(f"noun_chunks unavailable ({e}); skipping chunk extraction")

    return entities


def _extract_entities_regex(claim: str) -> List[str]:
    """Regex fallback when spaCy is unavailable."""
    entities = []
    seen: Set[str] = set()
    for match in _ENTITY_RE.findall(claim):
        phrase = match.strip().rstrip(".,;:!?")
        words = phrase.split()
        if not phrase or (len(words) == 1 and words[0].lower() in _STOPWORDS):
            continue
        key = phrase.lower()
        if key not in seen:
            seen.add(key)
            entities.append(phrase)
    entities.sort(key=len, reverse=True)
    return entities


def _extract_entities(claim: str) -> List[str]:
    if _SPACY_AVAILABLE and _nlp is not None:
        return _extract_entities_spacy(claim)
    return _extract_entities_regex(claim)


# wikipedia retrieval

def _get_with_retry(params: dict, timeout: int, max_retries: int = 3):
    """
    GET against the Wikipedia API with retry/backoff on 429 and 5xx.

    Respects the Retry-After header when present (Wikipedia sends this on
    429s); otherwise backs off with 1s, 2s, 4s. Without this, bursts of
    requests (e.g. testing several claims back-to-back) silently degrade
    every subsequent call to the claim-only fallback path, which looks
    like a retrieval-quality problem but is actually just rate limiting.
    """
    delay = 1.0
    last_exc = None
    for attempt in range(max_retries + 1):
        try:
            resp = requests.get(
                WIKI_API_URL, params=params, headers={"User-Agent": USER_AGENT}, timeout=timeout
            )
            if resp.status_code == 429 or resp.status_code >= 500:
                if attempt == max_retries:
                    resp.raise_for_status()
                wait = float(resp.headers.get("Retry-After", delay))
                logger.warning(
                    f"Wikipedia API {resp.status_code}, retrying in {wait:.1f}s "
                    f"(attempt {attempt + 1}/{max_retries})"
                )
                time.sleep(wait)
                delay *= 2
                continue
            resp.raise_for_status()
            return resp
        except requests.exceptions.RequestException as e:
            last_exc = e
            if attempt == max_retries:
                raise
            logger.warning(f"Wikipedia API request failed ({e}), retrying in {delay:.1f}s")
            time.sleep(delay)
            delay *= 2
    raise last_exc


def _search_candidate_titles(query: str, limit: int, timeout: int) -> List[str]:
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "format": "json",
        "srlimit": limit,
    }
    resp = _get_with_retry(params, timeout=timeout)
    hits = resp.json().get("query", {}).get("search", [])
    return [hit["title"] for hit in hits]


def _gather_titles(claim: str, max_pages: int, timeout: int) -> List[str]:
    titles: List[str] = []
    seen: Set[str] = set()

    def _add(query: str, limit: int):
        try:
            for title in _search_candidate_titles(query, limit=limit, timeout=timeout):
                if title not in seen:
                    seen.add(title)
                    titles.append(title)
        except Exception as e:
            logger.warning(f"Wikipedia search failed for query={query!r}: {e}")

    # each entity gets its own top-1 search - we fetch the entity's
    # own Wikipedia "home" page rather than a list article that mentions it
    # in passing.
    for entity in _extract_entities(claim):
        if len(titles) >= max_pages:
            break
        _add(entity, limit=1)

    # top up with a whole-claim query if we still have budget
    if len(titles) < max_pages:
        _add(claim, limit=max_pages - len(titles))

    return titles[:max_pages]


def _fetch_plain_text(title: str, timeout: int) -> str:
    params = {
        "action": "query",
        "prop": "extracts",
        "explaintext": 1,
        "titles": title,
        "format": "json",
    }
    resp = _get_with_retry(params, timeout=timeout)
    pages = resp.json().get("query", {}).get("pages", {})
    for page in pages.values():
        return (page.get("extract") or "")[:MAX_EXTRACT_CHARS]
    return ""


def _split_sentences(text: str) -> List[str]:
    lines = [
        line for line in text.replace("\r", "").split("\n")
        if line.strip() and not _SECTION_HEADER_RE.match(line)
    ]
    joined = " ".join(lines)
    sentences = _SENTENCE_SPLIT_RE.split(joined)
    return [s.strip() for s in sentences if len(s.strip()) > 20]


def _build_idf(sentences: List[str]) -> Dict[str, float]:
    """
    Compute inverse-document-frequency weights over a corpus of sentences.
    Rare tokens get high weight; tokens that appear in most sentences get low weight.
    This is what makes "catalans" outweigh "holocaust" in a Holocaust article —
    "holocaust" appears in almost every sentence, so it's a poor discriminator.
    """
    import math
    n = len(sentences)
    if n == 0:
        return {}
    df: Dict[str, int] = {}
    for sent in sentences:
        for tok in set(_tokenize(sent)):
            df[tok] = df.get(tok, 0) + 1
    return {tok: math.log((n + 1) / (freq + 1)) + 1.0 for tok, freq in df.items()}


def _score_sentence(claim_tokens: Set[str], sentence: str, idf: Dict[str, float] = None) -> float:
    """
    IDF-weighted coverage score.

    Plain overlap/|claim| fails for claims like "Catalans died during the
    Holocaust" — any Holocaust sentence hits 2/3 tokens and wins even though
    it says nothing about Catalans.

    With IDF weights, rare tokens ("catalans") contribute much more than
    common ones ("died", "holocaust"), so sentences that actually mention
    the specific subject of the claim rank higher.
    """
    sentence_tokens = set(_tokenize(sentence))
    if not sentence_tokens or not claim_tokens:
        return 0.0
    if not idf:
        overlap = claim_tokens & sentence_tokens
        return len(overlap) / len(claim_tokens)
    total_weight = sum(idf.get(t, 1.0) for t in claim_tokens)
    if total_weight == 0:
        return 0.0
    covered_weight = sum(idf.get(t, 1.0) for t in claim_tokens & sentence_tokens)
    return covered_weight / total_weight


# public API

def retrieve_evidence(
    claim: str,
    max_pages: int = 3,
    max_sentences: int = 3,
    min_score: float = 0.35,
    timeout: int = 5,
) -> Dict:
    """
    Search Wikipedia for sentence(s) relevant to `claim`.

    Returns:
        {
            "found": bool,
            "evidence_text": str,   # top sentences joined with a space; "" if none
            "sources": [{"title", "url", "sentence", "score"}, ...]
        }
    """
    claim_tokens: Set[str] = set(_tokenize(claim))
    if not claim_tokens:
        return {"found": False, "evidence_text": "", "sources": []}

    titles = _gather_titles(claim, max_pages=max_pages, timeout=timeout)
    if not titles:
        return {"found": False, "evidence_text": "", "sources": []}

    # fetch all page texts first so we can build a corpus-level IDF.
    # IDF computed over retrieved sentences makes rare claim tokens (e.g.
    # "catalans") worth far more than high-frequency ones ("holocaust", "died").
    page_sentences: List[tuple] = []  # (page_rank, title, [sentences])
    for page_rank, title in enumerate(titles):
        try:
            text = _fetch_plain_text(title, timeout=timeout)
        except Exception as e:
            logger.warning(f"Wikipedia extract fetch failed for title={title!r}: {e}")
            continue
        sents = _split_sentences(text)
        page_sentences.append((page_rank, title, sents))

    all_sentences = [s for _, _, sents in page_sentences for s in sents]
    idf = _build_idf(all_sentences)

    scored = []
    seen_fingerprints: Set[str] = set()

    for page_rank, title, sents in page_sentences:
        page_weight = max(_MIN_PAGE_WEIGHT, 1.0 - 0.1 * page_rank)

        for sentence in sents:
            score = _score_sentence(claim_tokens, sentence, idf) * page_weight
            if score < min_score:
                continue

            fp = _sentence_fingerprint(sentence)
            if fp in seen_fingerprints:
                continue
            seen_fingerprints.add(fp)

            scored.append((score, title, sentence))

    if not scored:
        return {"found": False, "evidence_text": "", "sources": []}

    scored.sort(key=lambda item: (-item[0], len(item[2])))
    top = scored[:max_sentences]

    evidence_text = " ".join(sentence for _, _, sentence in top)
    sources = [
        {
            "title": title,
            "sentence": sentence,
            "url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
            "score": round(score, 3),
        }
        for score, title, sentence in top
    ]

    return {"found": True, "evidence_text": evidence_text, "sources": sources}
