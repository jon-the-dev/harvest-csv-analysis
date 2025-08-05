FROM python:3.13

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
