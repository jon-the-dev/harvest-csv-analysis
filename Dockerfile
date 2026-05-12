FROM python:3.15.0b1

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
