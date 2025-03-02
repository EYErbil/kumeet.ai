import whisper
model = whisper.load_model("turbo")
result = model.transcribe("q-mit.wav")
print(result["text"])