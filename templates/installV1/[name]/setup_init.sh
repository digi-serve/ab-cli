#!/bin/bash
docker run --mount type=bind,source="$(pwd)/app",target=/app --mount type=bind,source="$(pwd)/resources/scripts/unTar.sh",target=/app/unTar.sh  skipdaddy/install-ab:developer_v2 ./unTar.sh
