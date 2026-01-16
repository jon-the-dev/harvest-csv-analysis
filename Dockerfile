FROM python:3.15.0a5

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
