FROM python:3.13.7.7

WORKDIR /app

COPY app/* /app/

ENTRYPOINT ["python", "app"]
