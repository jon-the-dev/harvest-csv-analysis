FROM python:3.14.1

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
