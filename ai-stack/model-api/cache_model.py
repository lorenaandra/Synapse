from transformers import AutoModel, AutoTokenizer

AutoTokenizer.from_pretrained("roberta-base")
AutoModel.from_pretrained("roberta-base")
print("RoBERTa cached.")
