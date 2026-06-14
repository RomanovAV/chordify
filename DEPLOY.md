# Deploy to a VDS with Docker

This guide assumes a fresh Ubuntu/Debian VDS and a domain or server IP address.

## 1. Connect to the server

```sh
ssh root@SERVER_IP
```

Create a regular deploy user if the server does not have one yet:

```sh
adduser deploy
usermod -aG sudo deploy
```

Reconnect as that user:

```sh
ssh deploy@SERVER_IP
```

## 2. Install Docker

```sh
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Allow the deploy user to run Docker:

```sh
sudo usermod -aG docker deploy
```

Log out and log back in, then check:

```sh
docker --version
docker compose version
```

## 3. Upload the project

Clone the repository on the server:

```sh
git clone REPOSITORY_URL chordify
cd chordify
```

Or upload the project from your local machine:

```sh
rsync -av --exclude target --exclude data --exclude .git ./ deploy@SERVER_IP:/home/deploy/chordify/
```

Then on the server:

```sh
cd /home/deploy/chordify
```

## 4. Start the application

```sh
docker compose up --build -d
```

Check the container:

```sh
docker compose ps
docker compose logs -f app
```

The application listens on port `8080`:

```text
http://SERVER_IP:8080
```

SQLite data is stored in the Docker named volume `chordify_chordify-data`.

## 5. Open the firewall

If you access the app directly by IP and port:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
sudo ufw enable
```

For production it is usually better to expose only ports `80` and `443`, and put Nginx/Caddy in front of the app.

## 6. Optional: Nginx reverse proxy

Install Nginx:

```sh
sudo apt install -y nginx
```

Create a site config:

```sh
sudo nano /etc/nginx/sites-available/chordify
```

Example config:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```sh
sudo ln -s /etc/nginx/sites-available/chordify /etc/nginx/sites-enabled/chordify
sudo nginx -t
sudo systemctl reload nginx
```

Then allow HTTP:

```sh
sudo ufw allow 'Nginx Full'
```

## 7. Optional: HTTPS with Certbot

Point your domain DNS `A` record to the VDS IP first.

```sh
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

Certbot will update the Nginx config and set up automatic certificate renewal.

## 8. Update the application

If the project was cloned with Git:

```sh
cd /home/deploy/chordify
git pull
docker compose up --build -d
```

If the project was uploaded with `rsync`, upload the new files again and run:

```sh
cd /home/deploy/chordify
docker compose up --build -d
```

## 9. Back up the SQLite database

Create a backup directory:

```sh
mkdir -p ~/backups/chordify
```

Copy the SQLite database from the Docker volume:

```sh
docker run --rm \
  -v chordify_chordify-data:/data \
  -v ~/backups/chordify:/backup \
  alpine sh -c 'cp /data/chordify.sqlite3 /backup/chordify-$(date +%F-%H%M%S).sqlite3'
```

List backups:

```sh
ls -lh ~/backups/chordify
```

## 10. Restore a backup

Stop the app:

```sh
cd /home/deploy/chordify
docker compose down
```

Restore the selected backup:

```sh
docker run --rm \
  -v chordify_chordify-data:/data \
  -v ~/backups/chordify:/backup \
  alpine sh -c 'cp /backup/BACKUP_FILE.sqlite3 /data/chordify.sqlite3'
```

Start the app again:

```sh
docker compose up -d
```

## Useful commands

```sh
docker compose ps
docker compose logs -f app
docker compose restart app
docker compose down
docker compose up --build -d
```
