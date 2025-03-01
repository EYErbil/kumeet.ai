import whisper
model = whisper.load_model("turbo")
result = model.transcribe("tr.opus")
print(result["text"])