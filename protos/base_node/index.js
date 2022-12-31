const responsify = require("../../helpers/responsify");
const md5 = require("md5");
const fs = require("fs");
const path = require("path");
const { protoRemoteUrls } = require("../../config");

const GRPC_DEADLINE = parseInt(process.env.GRPC_DEADLINE || "60000")

const defaultHeightOrBlockGroupRequest = {
  from_tip: 30,
  start_height: 0,
  end_height: 0,
};

module.exports = (client) => {
  return {
    _onError: async function (e, reject) {
      console.error("grpc error", e);
      return reject(e);
    },
    _checkVersion: async function (saveNewVersion) {
      const versions = {};

      for (const i in protoRemoteUrls) {
        const url = protoRemoteUrls[i];
        const response = await fetch(url);
        const remoteProto = await response.text();
        const remoteMd5 = md5(remoteProto);
        const filename = url.split("/").pop();
        const localPath = path.join(__dirname, `/${filename}`);
        const localProto = fs.readFileSync(localPath);
        const localMd5 = md5(localProto);
        if (localMd5 !== remoteMd5) {
          console.log(`There is a new version of the proto file "${filename}"`);
          if (saveNewVersion) {
            console.log(`Overwriting proto file "${filename} with latest`);
            fs.writeFileSync(localPath, remoteProto);
          }
        }
        versions[filename] = { remoteMd5, localMd5 };
      }

      return versions;
    },
    GetChainTip: async function () {
      const chainTip = await this.ListHeaders({ num_headers: 1 });
      const { height } = chainTip.pop().header;
      return +height;
    },
    GetBlocks: async (heights) => {
      return responsify(client.GetBlocks({ heights }), true, true);
    },
    ListHeaders: async function (listHeadersRequest) {
      const options = {
        from_height: null,
        num_headers: null,
        sorting: 0,
        ...listHeadersRequest,
      };
      return responsify(client.ListHeaders(options), true, true);
    },
    GetBlockTiming: async function (heightRequest) {
      const options = {
        ...defaultHeightOrBlockGroupRequest,
        ...heightRequest,
      };
      return new Promise((resolve, reject) => {
        client.GetBlockTiming(options, (error, response) => {
          if (error) {
            return this._onError(error, reject);
          }
          resolve(response);
        });
      });
    },
    SearchKernels: async (signatures) => {
      const sigs = signatures.map((s) => {
        return { public_nonce: s.publicNonce, signature: s.signature };
      });
      return responsify(client.SearchKernels({ signatures: sigs }), true, true);
    },
    GetConstants: async function (blockHeight) {
      return new Promise((resolve, reject) => {
        client.GetConstants(blockHeight, { deadline: Date.now() + GRPC_DEADLINE }, (error, response) => {
          if (error) {
            console.log('ERROR GetConstants', error)
            return this._onError(error, reject);
          }
          resolve(response);
        });
      });
    },
    GetBlockSize: async function (blockGroupRequest) {
      const options = {
        ...defaultHeightOrBlockGroupRequest,
        ...blockGroupRequest,
      };
      return new Promise((resolve, reject) => {
        client.GetBlockSize(options, (error, response) => {
          if (error) {
            return this._onError(error, reject);
          }
          resolve(response);
        });
      });
    },
    GetBlockFees: async function (blockGroupRequest) {
      const options = {
        ...defaultHeightOrBlockGroupRequest,
        ...blockGroupRequest,
      };
      return new Promise((resolve, reject) => {
        client.GetBlockFees(options, (error, response) => {
          if (error) {
            return this._onError(error, reject);
          }
          resolve(response);
        });
      });
    },
    GetVersion: async function () {
      return new Promise((resolve, reject) => {
        client.GetVersion(undefined, (error, response) => {
          if (error) {
            return this._onError(error, reject);
          }
          resolve(response);
        });
      });
    },
    GetTokensInCirculation: async function (heights) {
      return responsify(client.GetTokensInCirculation({ heights }), true, true);
    },
    GetNetworkDifficulty: async function (heightRequest) {
      const options = {
        ...defaultHeightOrBlockGroupRequest,
        ...heightRequest,
      };
      return responsify(client.GetNetworkDifficulty(options), true, true);
    },
  };
};
