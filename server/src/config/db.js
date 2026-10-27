import mongoose from 'mongoose';

/**
 * Connect to MongoDB. Throws if the connection cannot be established so the
 * process can fail fast instead of serving requests without a database.
 */
export async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy server/.env.example to server/.env and configure it.');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });

  mongoose.connection.on('error', (error) => {
    console.error('[mongo] connection error:', error.message);
  });

  console.log(`[mongo] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
