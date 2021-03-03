#!/bin/bash
docker stack deploy -c docker-compose.yml <%= stack %>
./logs.js