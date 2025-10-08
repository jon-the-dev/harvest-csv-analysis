FROM python:3.14.0

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
