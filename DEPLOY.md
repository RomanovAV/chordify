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

## 3. Set credentials

```sh
cp .env.example .env
nano .env
```

Set a strong `CHORDIFY_PASSWORD`.

## 4. Start the app

```sh
docker compose up --build -d
```

The app listens only on `127.0.0.1:8080` inside the VDS. Caddy will expose it to the internet over HTTPS.

For local testing through SSH:

```sh
ssh -L 8080:127.0.0.1:8080 root@SERVER_IP
```

Then open `http://localhost:8080` on your machine and sign in with the credentials from `.env`.

## 5. Open it from the internet

Point your domain DNS `A` record to `SERVER_IP`.

Install Caddy:

```sh
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy
```

Create the site config:

```sh
nano /etc/caddy/Caddyfile
```

Use this config:

```caddyfile
YOUR_DOMAIN {
    reverse_proxy 127.0.0.1:8080
}
```

Reload Caddy:

```sh
caddy fmt --overwrite /etc/caddy/Caddyfile
systemctl reload caddy
```

If `ufw` is enabled, open HTTP and HTTPS:

```sh
ufw allow 80/tcp
ufw allow 443/tcp
```

Open:

```text
https://YOUR_DOMAIN
```

Caddy will request and renew the HTTPS certificate automatically.

Logs:

```sh
docker compose logs -f app
```

Stop:

```sh
docker compose down
```

## 6. Data

The app uses SQLite. The database is stored in the Docker volume:

```text
chordify_chordify-data
```

Do not run `docker compose down -v` unless you want to delete the database.

## 7. Update

```sh
cd /root/chordify
git pull
docker compose up --build -d
```

If you uploaded files with `rsync`, upload them again and run:

```sh
docker compose up --build -d
```

## 8. Backup SQLite

```sh
mkdir -p ~/chordify-backups
docker run --rm \
  -v chordify_chordify-data:/data \
  -v ~/chordify-backups:/backup \
  alpine sh -c 'cp /data/chordify.sqlite3 /backup/chordify-$(date +%F-%H%M%S).sqlite3'
```
