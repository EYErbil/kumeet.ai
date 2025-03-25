FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for postgres
RUN apt-get update && apt-get install -y \
    postgresql-client \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the wait script
COPY wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Copy the rest of the application
COPY . .

# Create the wait-for-db script
RUN echo '#!/bin/bash\n\
echo "Waiting for PostgreSQL to start..."\n\
until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do\n\
  echo "PostgreSQL not ready yet - sleeping for 1 second"\n\
  sleep 1\n\
done\n\
echo "PostgreSQL is up and running!"\n\
\n\
echo "Initializing database..."\n\
python models/models.py\n\
\n\
echo "Starting application..."\n\
exec "$@"\n\
' > /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Set the entrypoint to our script
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Default command to run when the container starts
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]