FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer libreoffice-impress libreoffice-math libreoffice-calc fonts-noto-cjk fonts-crosextra-carlito fonts-liberation fonts-stix && rm -rf /var/lib/apt/lists/* && useradd -u 1000 -m office && mkdir /work && chown office:office /work
WORKDIR /app
COPY server.py /app/server.py
USER office
ENV HOME=/work OFFICE_WORKDIR=/work/jobs
EXPOSE 8080
CMD ["python3","/app/server.py"]
