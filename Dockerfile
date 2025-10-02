FROM python:3.14.0rc3

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
