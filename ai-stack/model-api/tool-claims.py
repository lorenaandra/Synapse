"""
title: Claim Classifier Tool
author: you
version: 1.5.2
description: >
    Classifies factual claims as SUPPORTS, REFUTES, or NOT ENOUGH INFO,
    backed by Wikipedia evidence when available.
requirements: requests
"""

import requests
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Callable, Any


class Tools:
    class Valves(BaseModel):
        api_url: str = Field(
            default="http://claim-classifier-api:8000/predict_with_evidence",
            description="URL of the FastAPI classifier service",
        )
        timeout: int = Field(default=30, description="Request timeout in seconds")

    def __init__(self):
        self.valves = self.Valves()
        self.citation = False

    async def claim_classifier(
        self,
        claim: str,
        __user__: dict = {},
        __event_emitter__: Callable[[dict], Any] = None,
    ) -> str:
        """
        Classify a factual claim as SUPPORTS, REFUTES, or NOT ENOUGH INFO.
        Call this whenever the user asks you to verify, fact-check, or assess
        the truth of a statement.
        Args:
            claim: The exact factual claim to classify, extracted from the user message.
        """

        async def emit_status(description: str, done: bool, is_error: bool = False):
            if __event_emitter__:
                await __event_emitter__(
                    {
                        "type": "status",
                        "data": {
                            "description": description,
                            "done": done,
                            "hidden": False,
                            **({"status": "error"} if is_error and done else {}),
                        },
                    }
                )

        async def emit_citation(content: str, title: str, url: str):
            if __event_emitter__:
                await __event_emitter__(
                    {
                        "type": "citation",
                        "data": {
                            "document": [content],
                            "metadata": [
                                {
                                    "date_accessed": datetime.now().isoformat(),
                                    "source": title,
                                    "url": url,
                                }
                            ],
                            "source": {"name": title, "url": url},
                        },
                    }
                )

        short_claim = claim[:72] + "…" if len(claim) > 72 else claim
        await emit_status(f'🔍 "{short_claim}"', done=False)

        await emit_status("📡 Retrieving evidence & running inference…", done=False)
        try:
            response = requests.post(
                self.valves.api_url,
                json={"text": claim},
                timeout=self.valves.timeout,
            )
            response.raise_for_status()
            result = response.json()
        except requests.exceptions.ConnectionError as e:
            await emit_status("❌ Connection failed", done=True, is_error=True)
            return f"⚠️ Could not connect to classifier at {self.valves.api_url}: {e}"
        except requests.exceptions.Timeout:
            await emit_status(
                f"❌ Timed out after {self.valves.timeout}s", done=True, is_error=True
            )
            return f"⚠️ Classifier timed out after {self.valves.timeout}s"
        except Exception as e:
            await emit_status(f"❌ Error: {e}", done=True, is_error=True)
            return f"⚠️ Classifier error: {type(e).__name__}: {e}"

        label = result.get("label", "UNKNOWN")
        conf = result.get("confidence", 0.0)
        probs = result.get("probabilities", {})
        evidence_used = result.get("evidence_used")
        sources = result.get("sources") or []

        if evidence_used and sources:
            await emit_status("📚 Fetching Wikipedia evidence…", done=False)
            for src in sources:
                await emit_citation(
                    content=src.get("sentence", evidence_used),
                    title=src["title"],
                    url=src["url"],
                )

        label_emoji = {"SUPPORTS": "✅", "REFUTES": "❌", "NOT ENOUGH INFO": "⚠️"}.get(
            label, "🔎"
        )
        evidence_note = "evidence-backed" if evidence_used else "no Wikipedia evidence"
        await emit_status(
            f"{label_emoji} {label} — {conf:.1%} confidence ({evidence_note})",
            done=True,
        )

        output = (
            f"**Claim Classification Result**\n\n"
            f"| Field | Value |\n"
            f"|---|---|\n"
            f"| Label | **{label}** |\n"
            f"| Confidence | {conf:.1%} |\n"
            f"| SUPPORTS | {probs.get('SUPPORTS', 0):.3f} |\n"
            f"| REFUTES | {probs.get('REFUTES', 0):.3f} |\n"
            f"| NOT ENOUGH INFO | {probs.get('NOT ENOUGH INFO', 0):.3f} |"
        )

        if evidence_used:
            output += f"\n\n**Wikipedia evidence used:**\n> {evidence_used}"
        else:
            output += "\n\n⚠️ No suitable Wikipedia evidence found — classified from claim text alone."

        return output
