# Tari Blockchain Explorer API

## Development

The Express API requires a [Redis] and [Tari base node] instance.

```bash
cp .env.sample .env
# Change GRPC_URL from tari:18142 to localhost:18142.
# Change REDIS_URL from redis://redis:6379 to redis://localhost:6379.
cp .env.docker.frontend.sample .env.docker.frontend
docker-compose up -d redis
docker-compose up -d tari
npm run dev
# Use `NO_CRON=1 npm run dev` to stop the cronjobs from running.
```


## Deployment

Set your env's for the frontend in `.env.docker.frontend`
`REACT_APP_EXPLORER_API_URL=https://explorer.example.com`

```bash
docker-compose up -d
```

[Redis]:https://redis.io/
[Tari base node]:https://github.com/tari-project/tari#running-the-base-node-with-a-docker-image
