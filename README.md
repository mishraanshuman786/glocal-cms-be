# Run database migrations successfully
Your Dockerfile has a separate migrator target.

It executes:
```
npm run db:migrate:prod
```

We will run that image as a temporary comtainer:
Execute:
```
docker run \
      --name glocal-cms-migration-20261107 \
      --env-file /root/glocal-cms-backend/.env.production \
      --add-host=host.docker.internal:host-gateway \
      ghcr.io/mishraanshuman786/glocal-cms-be:migrator
```

What happens here?
Option	Purpose
--name	Gives the migration container a recognizable name
--env-file	Loads production environment variables
--add-host	Allows the container to reach PostgreSQL on the VPS
:migrator	Selects the migration Docker image

The migration command will execute and its output will appear directly in your VPS terminal.

# Verify migration logs
Even after the command finishes, the stopped migration container remains available for inspection.

## 1. View Migration logs:
```
docker logs glocal-cms-migration-20261107
```

## 2. Check the migration exit code:
```
docker inspect glocal-cms-migration-20261107 \
  --format='Exit Code: {{.State.ExitCode}}'
```

## 3. Check migration container status
```
docker ps -a | grep glocal-cms-migration
```

## 4. Once successful, you can clean it up:
```
docker rm glocal-cms-migration-20261107
```

## 5. Start the glocal cms backend
```
docker run -d \
  --name glocal-cms-backend \
  --restart unless-stopped \
  --env-file /root/glocal-cms-backend/.env.production \
  --add-host=host.docker.internal:host-gateway \
  -p 127.0.0.1:3002:3001 \
  ghcr.io/mishraanshuman786/glocal-cms-be:latest
```

Notice:
- Container port: 3001
- VPS host port: 3002
- Find My Theka remains on its existing port 3001.
- Glocal CMS will be accessible locally on the VPS at 127.0.0.1:3002.

## 6. check the application resposne:
```
curl -i http://127.0.0.1:3002/api/v1
```