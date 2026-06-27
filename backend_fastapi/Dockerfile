FROM mirror.gcr.io/library/python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
ENV PIP_ROOT_USER_ACTION=ignore
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Setup non-root user for security
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
