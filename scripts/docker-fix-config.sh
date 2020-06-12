#!/bin/bash

if [[ ! -f ~/.tari/config.toml ]]; then
  tari_base_node --init --create-id
  sed -i  's/grpc_enabled = false/grpc_enabled = true/' ~/.tari/config.toml
  sed -i  's/grpc_address = "127.0.0.1:18142"/grpc_address = "0.0.0.0:18142"/' ~/.tari/config.toml
fi

