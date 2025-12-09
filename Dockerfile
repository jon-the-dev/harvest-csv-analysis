FROM python:3.15.0a2

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
