# To built image:
# docker build -t my-backend-image .

# To start:
# docker run -d -p 8000:8000 my-backend-image

FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
