import torch
import torch.nn as nn
from transformers import AutoModel


class BiGRUCNNClassifier(nn.Module):

    def __init__(self, roberta_name="roberta-base", hidden_size=128, num_labels=3):
        super().__init__()
        # STEP 1: load RoBERTa as the encoder
        self.roberta = AutoModel.from_pretrained(roberta_name)

        # STEP 2: BiGRU
        # roberta output: 768 dimensional embeddings
        self.gru = nn.GRU(
            input_size=768,
            hidden_size=hidden_size,
            batch_first=True,
            bidirectional=True
        )

        # STEP 3: CNN
        self.conv1 = nn.Conv1d(
            in_channels=2*hidden_size,
            out_channels=hidden_size,
            kernel_size=3,
            padding=1
        )

        # STEP 4: Max-pooling
        self.pool = nn.AdaptiveMaxPool1d(1)

        # STEP 5: Fully Connected Layer
        self.classifier = nn.Linear(128, num_labels)


    def forward(self, input_ids, attention_mask):
        # STEP 1: RoBERTa embeddings
        outputs = self.roberta(input_ids=input_ids, attention_mask=attention_mask)
        token_embeds = outputs.last_hidden_state

        # STEP 2: BiGRU -> [B, T, 2*hidden_size]
        gru_out, _ = self.gru(token_embeds)

        # STEP 3: CNN -> [B, 128, T]
        x = gru_out.permute(0, 2, 1) # din [B, T, 2*hidden_size] in [B, 2*hidden_size, T]
        x = torch.relu(self.conv1(x))
        x = self.pool(x).squeeze(2) # [B, 128]

        # STEP 4: FC
        logits = self.classifier(x)
        return logits
