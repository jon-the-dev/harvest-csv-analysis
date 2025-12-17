FROM python:3.15.0a3

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
