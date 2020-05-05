#!/usr/bin/env bash

PROTOS_PATH="$(cd "$(dirname "$0")/../protos" && pwd)"
BASE_NODE_PATH="${PROTOS_PATH}/base_node/"
echo "Downloading base node proto -> ${BASE_NODE_PATH}"
curl --silent https://raw.githubusercontent.com/tari-project/tari/development/applications/tari_base_node/proto/base_node.proto -o "${BASE_NODE_PATH}/base_node.proto"
