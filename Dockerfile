FROM python:3.15.0rc3

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
