FROM python:3.16.0a1

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
