#!/bin/bash

# You can optionally use an environment variable for the host/port.
HOST="http://localhost:3000"

# Call the execute mandate endpoint.
curl -X POST "http://localhost:3000/api/mandate/execute" \
  -H "Content-Type: application/json" \

# curl -X POST "$HOST/api/mandate/notification" -H "Content-Type: application/json"

