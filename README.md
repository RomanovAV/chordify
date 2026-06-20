# ChordStorer

Personal guitar songbook with syllable-positioned chords.

## Docker Compose

The application uses SQLite, so the database is stored as a file in the app container's `/app/data` directory and persisted through a named Docker volume.

Create local credentials:

```sh
cp .env.example .env
```

Edit `.env` and set a strong `CHORDSTORER_PASSWORD`.

```sh
docker compose up --build
```

Open the app at http://localhost:8080 and sign in with the credentials from `.env`.

To stop the service:

```sh
docker compose down
```

To remove the persisted SQLite database as well:

```sh
docker compose down -v
```

For VDS deployment instructions, see [DEPLOY.md](DEPLOY.md).
