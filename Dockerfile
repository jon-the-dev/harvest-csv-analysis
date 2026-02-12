FROM python:3.15.0a6

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
