
from pyannote.audio.pipelines.utils.hook import ProgressHook

from pyannote.audio import Pipeline
import pandas as pd
pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token="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")
# send pipeline to GPU (when available)
import torch
pipeline.to(torch.device("cuda"))
# apply pretrained pipeline
with ProgressHook() as hook:
    diarization = pipeline("test.wav", hook=hook)
# print the result
with open("audio.rttm", "w") as rttm:
    diarization.write_rttm(rttm)

for turn, _, speaker in diarization.itertracks(yield_label=True):
    print(f"start={turn.start:.1f}s stop={turn.end:.1f}s speaker_{speaker}")