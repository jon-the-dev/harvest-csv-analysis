FROM python:3.15.0a7

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
