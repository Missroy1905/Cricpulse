FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir
COPY . .
EXPOSE 8080
CMD exec gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 120 main:app