FROM python:3.15.0b4

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
