FROM quay.io/krakaw/tari_base_node:latest

WORKDIR /root/.tari
COPY ./scripts/docker-fix-config.sh /usr/bin
COPY ./protos/base_node/base_node.proto /root/
RUN curl -L -o /tmp/grpcurl.tgz 'https://github.com/fullstorydev/grpcurl/releases/download/v1.6.0/grpcurl_1.6.0_linux_x86_64.tar.gz' && \
    tar -xzf /tmp/grpcurl.tgz -C /usr/bin && rm /tmp/grpcurl.tgz

HEALTHCHECK --interval=10s --timeout=5s --start-period=35s --retries=3 CMD grpcurl -plaintext -import-path /root  -proto /root/base_node.proto localhost:18142 tari.base_node.BaseNode.GetVersion || exit 1
CMD bash -c "/usr/bin/docker-fix-config.sh && /usr/bin/start.sh"

