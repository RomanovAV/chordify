# Deploy on a VDS with Docker

Short path for an Ubuntu/Debian server.

## 1. Install Docker

Connect to the server:

```sh
ssh root@SERVER_IP
```

Install Docker and the Compose plugin:

```sh
apt update
apt install -y docker.io docker-compose-plugin git
systemctl enable --now docker
```

Check:

```sh
docker --version
docker compose version
```

## 2. Put the app on the server

Clone the repository:

```sh
git clone REPOSITORY_URL chordify
cd chordify
```

Or upload the project from your machine:

```sh
rsync -av --exclude target --exclude data --exclude .git ./ root@SERVER_IP:/root/chordify/
ssh root@SERVER_IP
cd /root/chordify
```

## 3. Start

```sh
docker compose up --build -d
```

Open:

```text
http://SERVER_IP:8080
```

Logs:

```sh
docker compose logs -f app
```

Stop:

```sh
docker compose down
```

## 4. Data

The app uses SQLite. The database is stored in the Docker volume:

```text
chordify_chordify-data
```

Do not run `docker compose down -v` unless you want to delete the database.

## 5. Update

```sh
cd /root/chordify
git pull
docker compose up --build -d
```

If you uploaded files with `rsync`, upload them again and run:

```sh
docker compose up --build -d
```

## 6. Backup SQLite

```sh
mkdir -p ~/chordify-backups
docker run --rm \
  -v chordify_chordify-data:/data \
  -v ~/chordify-backups:/backup \
  alpine sh -c 'cp /data/chordify.sqlite3 /backup/chordify-$(date +%F-%H%M%S).sqlite3'
```

## Optional: domain and HTTPS

If you want `https://YOUR_DOMAIN`, put Nginx or Caddy in front of the app and proxy traffic to:

```text
http://127.0.0.1:8080
```
