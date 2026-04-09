FROM python:3.15.0a8

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
