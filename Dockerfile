FROM python:3.15.0rc2

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
