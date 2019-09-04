#!/bin/bash
docker run -it --mount type=bind,source="$(pwd)/app",target=/app --mount type=bind,source="$(pwd)/scripts/install.sh",target=/app/install.sh  skipdaddy/install-ab:developer_v2 ./install.sh
