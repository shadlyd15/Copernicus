FROM python:3

WORKDIR /app

COPY ./src/main.py /app/main.py
COPY ./src/requirements.txt /app/requirements.txt

RUN pip install -r requirements.txt

EXPOSE 5000
ENTRYPOINT [ "python" ]
CMD [ "main.py" ]
