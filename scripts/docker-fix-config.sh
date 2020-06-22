#!/bin/bash

echo "Checking ~/.tari/config.toml for grpc_enabled and grpc_address"
if [[ ! -f ~/.tari/config.toml ]]; then
  echo "There is no config.toml - creating."
  tari_base_node --init --create-id
  echo "Updating grpc_enabled = true"
  sed -i  's/grpc_enabled = false/grpc_enabled = true/' ~/.tari/config.toml
  echo "Updating grpc_address = 0.0.0.0:18142"
  sed -i  's/grpc_address = "127.0.0.1:18142"/grpc_address = "0.0.0.0:18142"/' ~/.tari/config.toml
else
  echo "Config file already exists, exiting."
fi

