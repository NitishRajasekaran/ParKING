import mongoose from 'mongoose';

/**
 * Checks if the current MongoDB deployment supports multi-document transactions.
 * Transactions require a replica set or sharded cluster.
 * Standalone mongod instances (e.g. default local MongoDB service) do not support transactions or retryable writes.
 */
export const supportsTransactions = () => {
  const desc = mongoose.connection.client?.topology?.description;
  if (!desc) return false;
  // Multi-document transactions require a replica set or sharded cluster.
  // Standalone instances (e.g. Single topology without setName) do not support transactions.
  const isReplicaSet = Boolean(desc.setName) || desc.type === 'ReplicaSetWithPrimary' || desc.type === 'ReplicaSetNoPrimary';
  const isSharded = desc.type === 'Sharded';
  return isReplicaSet || isSharded;
};

/**
 * Runs the given function inside a transaction if transactions are supported by the MongoDB deployment.
 * If running on a standalone MongoDB deployment without replica sets,
 * it runs the function directly with session = null.
 */
export const withTransaction = async (workFn) => {
  if (!supportsTransactions()) {
    return await workFn(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await workFn(session);
    });
    return result;
  } catch (err) {
    // Graceful fallback if driver throws retryable writes error on unsupported topologies
    if (err.message && err.message.includes('does not support retryable writes')) {
      return await workFn(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
};
