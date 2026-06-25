FROM python:3.15.0b3

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
