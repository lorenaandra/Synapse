import os
import time
import logging
import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer
from model import BiGRUCNNClassifier
from evidence import retrieve_evidence

LABELS = ["SUPPORTS", "REFUTES", "NOT ENOUGH INFO"]
MAX_LEN_CLAIM_ONLY = 128
MAX_LEN_CLAIM_EVIDENCE = 256

app = FastAPI(title="Claim Classifier API")

LOG_PATH = os.environ.get("LOG_PATH", "/app/logs/classifier.log")
log_dir = os.path.dirname(LOG_PATH)
if log_dir:
    os.makedirs(log_dir, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

device = torch.device(
    "cuda" if torch.cuda.is_available() else
    "mps" if torch.backends.mps.is_available() else
    "cpu"
)

MODEL_PATH = os.environ.get("MODEL_PATH", "/models/stage2_epoch1_valf10.9477.pth")

tokenizer = AutoTokenizer.from_pretrained("roberta-base")
model = BiGRUCNNClassifier()
checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
model.load_state_dict(checkpoint, strict=False)
model.to(device)
model.eval()

logger.info(f"Model loaded from: {MODEL_PATH} on {device}")


@app.middleware("http")
async def log_requests(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info(
        f"{request.client.host if request.client else '-'} | "
        f"{request.method} {request.url.path} -> {response.status_code} "
        f"({duration_ms:.1f}ms)"
    )
    return response


class PredictRequest(BaseModel):
    text: str


def _classify(text: str, text_pair: str = None, max_length: int = MAX_LEN_CLAIM_ONLY) -> dict:
    encoded = tokenizer(
        text=text,
        text_pair=text_pair,
        truncation=True,
        padding="max_length",
        max_length=max_length,
        return_tensors="pt"
    )

    input_ids = encoded["input_ids"].to(device)
    attention_mask = encoded["attention_mask"].to(device)

    with torch.no_grad():
        logits = model(input_ids=input_ids, attention_mask=attention_mask)
        probs = torch.softmax(logits, dim=-1)[0]

    pred_id = int(torch.argmax(probs).item())
    return {
        "label": LABELS[pred_id],
        "confidence": float(probs[pred_id]),
        "probabilities": {
            LABELS[i]: float(probs[i].item())
            for i in range(len(LABELS))
        }
    }


@app.post("/predict")
def predict(req: PredictRequest):
    logger.info(f"CLAIM RECEIVED: {req.text!r}")

    result = _classify(req.text, max_length=MAX_LEN_CLAIM_ONLY)

    logger.info(
        f"RESULT: label={result['label']} | "
        f"confidence={result['confidence']:.4f} | "
        f"probs={result['probabilities']}"
    )

    return result


@app.post("/predict_with_evidence")
def predict_with_evidence(req: PredictRequest):
    logger.info(f"CLAIM RECEIVED (with evidence): {req.text!r}")

    evidence = retrieve_evidence(req.text)

    if evidence["found"]:
        result = _classify(
            req.text,
            text_pair=evidence["evidence_text"],
            max_length=MAX_LEN_CLAIM_EVIDENCE,
        )
        result["evidence_used"] = evidence["evidence_text"]
        result["sources"] = evidence["sources"]
    else:
        logger.info("No suitable evidence found on Wikipedia, falling back to claim-only inference")
        result = _classify(req.text, max_length=MAX_LEN_CLAIM_ONLY)
        result["evidence_used"] = None
        result["sources"] = []

    logger.info(
        f"RESULT: label={result['label']} | "
        f"confidence={result['confidence']:.4f} | "
        f"evidence_found={evidence['found']} | "
        f"probs={result['probabilities']}"
    )

    return result


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/v1/models")
def list_models():
    return {"object": "list", "data": [{"id": "claim-classifier", "object": "model"}]}
