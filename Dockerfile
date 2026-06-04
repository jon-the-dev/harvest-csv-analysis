FROM python:3.15.0b2

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
