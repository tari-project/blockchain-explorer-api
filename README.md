# Tari Blockchain Explorer API

## Development

The express api requires a redis and tari_base_node instance.

```bash
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
