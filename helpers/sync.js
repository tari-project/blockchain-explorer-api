const { client: redis, REDIS_STORE_KEYS } = require("./redis");
const { range } = require("./array");
const protos = require("../protos");
const sleep = require("./sleep");
const {
  getBlocksByHeight,
  getChainMetadata,
  getBlockHeight,
  getConstants,
} = require("../models/base_node");
const { broadcastDebounceSeconds } = require("../config");
const LOCKS = {
  blocks: false,
  difficulties: false,
  constants: false,
};

const CHUNK_SIZE = 1000;

// Don't spam the websocket clients on initial sync
const WS_DEBOUNCE_TIMEOUT = broadcastDebounceSeconds * 1000;
let webSocketDebounce = 0;

const difficultyHeight = async () => {
  return +((await redis.get(REDIS_STORE_KEYS.DIFFICULTY_CURRENT_HEIGHT)) || 0);
};

const setTransactionsCount = async (blockData) => {
  const {
    block: {
      header: {
        height,
        timestamp: { seconds },
      },
      body: { kernels },
    },
  } = blockData;
  const transactions = kernels.length;
  const totalFee = kernels.map((k) => +k.fee).reduce((acc, b) => acc + b, 0);
  const timestamp = +seconds * 1000;
  const member = [height, timestamp, transactions, totalFee].join(":");
  await redis.zremrangebyscore(
    REDIS_STORE_KEYS.TRANSACTIONS_BY_TIMESTAMP,
    timestamp,
    timestamp
  );
  await redis.zadd(
    REDIS_STORE_KEYS.TRANSACTIONS_BY_TIMESTAMP,
    timestamp,
    member
  );
  await redis.incrby(REDIS_STORE_KEYS.TRANSACTIONS_TOTAL, transactions);
};

const syncDifficulties = async () => {
  if (LOCKS.difficulties) {
    console.log("syncDifficulties locked");
    return;
  }
  LOCKS.difficulties = true;
  try {
    let currentCacheDifficultyHeight = await difficultyHeight();
    // Get the tip
    const currentChainTip = await protos.baseNode.GetChainTip();
    console.debug(
      "Syncing Difficulties - Cache Height:",
      currentCacheDifficultyHeight,
      "Chain Height:",
      currentChainTip
    );
    let currentBlockHeight = currentCacheDifficultyHeight;

    while (currentCacheDifficultyHeight < currentChainTip) {
      // Fetch all the difficulties for the range
      const startHeight = currentCacheDifficultyHeight;
      const endHeight = Math.min(
        currentCacheDifficultyHeight + CHUNK_SIZE,
        currentChainTip
      );

      console.debug(
        "Fetching difficulty heights",
        startHeight,
        " - ",
        endHeight,
        " / ",
        currentChainTip
      );

      const difficulties = await protos.baseNode.GetNetworkDifficulty({
        from_tip: 0,
        start_height: startHeight,
        end_height: endHeight,
      });

      for (const i in difficulties) {
        let {
          difficulty,
          estimated_hash_rate: estimatedHashRate,
          height,
        } = difficulties[i];
        difficulty = +difficulty;
        estimatedHashRate = +estimatedHashRate;
        const blockHeight = +height;
        const member = [blockHeight, difficulty, estimatedHashRate].join(":");

        await redis.zremrangebyscore(
          REDIS_STORE_KEYS.DIFFICULTIES_BY_HEIGHT,
          blockHeight,
          blockHeight
        );
        await redis.zadd(
          REDIS_STORE_KEYS.DIFFICULTIES_BY_HEIGHT,
          blockHeight,
          member
        );
        if (blockHeight > currentBlockHeight) {
          currentBlockHeight = blockHeight;
        }
      }

      await redis.set(
        REDIS_STORE_KEYS.DIFFICULTY_CURRENT_HEIGHT,
        currentBlockHeight
      );
      console.debug("Setting new difficulty height", currentBlockHeight);
      await sleep(1000);
      currentCacheDifficultyHeight = currentBlockHeight;
    }
  } catch (e) {
    console.error("Error syncDifficulties", e);
  } finally {
    LOCKS.difficulties = false;
  }
};

const syncBlocks = async (sockets, overrideBlockHeight) => {
  if (LOCKS.blocks) {
    console.log("syncBlocks locked");
    return;
  }
  LOCKS.blocks = true;
  try {
    // If we override we are re-syncing from a certain point to keep up to date with the chain
    const useOverride = overrideBlockHeight !== undefined;
    let currentCacheBlockHeight = useOverride
      ? +overrideBlockHeight
      : await getBlockHeight();
    const constants = await getConstants();
    // Get the tip
    const currentChainTip = await protos.baseNode.GetChainTip();
    console.debug(
      useOverride ? `Overriding sync from height: ${overrideBlockHeight}` : "",
      "Syncing Blocks - Cache Height:",
      currentCacheBlockHeight,
      "Chain Height:",
      currentChainTip
    );
    let currentBlockHeight = currentCacheBlockHeight;
    let broadcastBlock;
    while (currentCacheBlockHeight < currentChainTip) {
      // Fetch all the blocks for the range
      const heights = range(
        currentCacheBlockHeight,
        Math.min(CHUNK_SIZE, currentChainTip - currentCacheBlockHeight) + 1,
        true
      );

      console.debug(
        "Fetching block heights",
        Math.min(...heights),
        " - ",
        Math.max(...heights),
        " / ",
        currentChainTip
      );
      const blocks = await protos.baseNode.GetBlocks(heights);
      const { tmpCurrentBlockHeight, tmpBroadcastBlock } = await _processBlocks(
        blocks,
        currentBlockHeight,
        constants,
        useOverride
      );
      currentBlockHeight = tmpCurrentBlockHeight;
      broadcastBlock = tmpBroadcastBlock;
      if (!useOverride) {
        // Only set our cache height for non re-sync operations
        await redis.set(
          REDIS_STORE_KEYS.BLOCK_CURRENT_HEIGHT,
          currentBlockHeight
        );
      }

      console.debug("Setting new block height", currentBlockHeight);
      // Broadcast the latest block to all the websocket clients
      if (!useOverride) {
        const now = new Date().getTime();
        if (broadcastBlock && now > webSocketDebounce + WS_DEBOUNCE_TIMEOUT) {
          webSocketDebounce = now;
          sockets.broadcast({
            type: "newBlock",
            data: broadcastBlock,
          });
          sockets.broadcast({
            type: "metadata",
            data: await getChainMetadata(),
          });
        }
      }

      await sleep(1000);
      currentCacheBlockHeight = currentBlockHeight;
    }
  } catch (e) {
    console.error("Error syncBlocks", e);
  } finally {
    LOCKS.blocks = false;
  }
};

/**
 * Calculates the mining time / weight / filledPercent of the block
 * Stores the block in redis
 * Returns the latest block height and broadcast block
 * @param blocks
 * @param currentBlockHeight
 * @param constants
 * @returns {Promise<{tmpCurrentBlockHeight: *, tmpBroadcastBlock: *}>}
 * @private
 */
const _processBlocks = async (
  blocks,
  currentBlockHeight,
  constants,
  useOverride
) => {
  blocks.sort(
    (a, b) =>
      +a.block.header.timestamp.seconds - +b.block.header.timestamp.seconds
  );
  let tmpBroadcastBlock;
  for (const i in blocks) {
    const blockData = blocks[i];
    const {
      block: {
        body: { inputs, outputs, kernels },
        header: {
          hash,
          height,
          timestamp: { seconds },
        },
      },
    } = blockData;
    const blockHeight = +height;
    const milliseconds = +seconds * 1000;
    // Pull the previous block to calculate the _miningTime
    let miningTime = 0;
    if (blockHeight > 0) {
      let prevBlock;
      if (i > 0) {
        prevBlock = blocks[i - 1];
      } else {
        prevBlock = (
          await getBlocksByHeight(blockHeight - 1, blockHeight - 1)
        ).pop();
      }
      if (prevBlock) {
        const prevBlockSeconds = +prevBlock.block.header.timestamp.seconds;
        miningTime = +seconds - prevBlockSeconds;
      }
    }
    blockData.block._miningTime = miningTime;

    const weight =
      inputs.length * +constants.block_weight_inputs +
      outputs.length * +constants.block_weight_outputs +
      kernels.length * +constants.block_weight_kernels;
    blockData.block._weight = weight;
    blockData.block._filledPercent =
      weight / +constants.max_block_transaction_weight;

    const blockDataString = JSON.stringify(blockData);
    await redis.hset(REDIS_STORE_KEYS.BLOCKS_BY_HASH, hash, blockDataString);
    if (useOverride) {
      await redis.zremrangebyscore(
        REDIS_STORE_KEYS.BLOCKS_BY_HEIGHT,
        blockHeight,
        blockHeight
      );
      await redis.zremrangebyscore(
        REDIS_STORE_KEYS.BLOCKS_BY_TIME,
        milliseconds,
        milliseconds
      );
    }
    await redis.zadd(REDIS_STORE_KEYS.BLOCKS_BY_HEIGHT, blockHeight, hash);
    await redis.zadd(REDIS_STORE_KEYS.BLOCKS_BY_TIME, milliseconds, hash);
    await setTransactionsCount(blockData);

    if (blockHeight > currentBlockHeight) {
      tmpBroadcastBlock = blockData;
      currentBlockHeight = blockHeight;
    }
  }
  return {
    tmpBroadcastBlock,
    tmpCurrentBlockHeight: currentBlockHeight,
  };
};

const syncConstants = async () => {
  if (LOCKS.constants) {
    console.log("syncConstants Locked");
    return;
  }
  LOCKS.constants = true;
  let constants = {};
  try {
    console.debug("Syncing constants");
    constants = await protos.baseNode.GetConstants();
    await redis.set(REDIS_STORE_KEYS.CONSTANTS, JSON.stringify(constants));
  } catch (e) {
    console.error("Error syncConstants", e);
  } finally {
    LOCKS.constants = false;
  }

  return constants;
};

module.exports = {
  syncBlocks,
  syncDifficulties,
  syncConstants,
  LOCKS,
};
