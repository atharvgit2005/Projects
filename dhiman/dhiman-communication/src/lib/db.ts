import mongoose from "mongoose";
import { assertEnv, env } from "@/lib/env";

declare global {
  var mongooseConnection:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = global.mongooseConnection ?? { conn: null, promise: null };

export async function connectToDatabase() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(assertEnv(env.mongodbUri, "MONGODB_URI"), {
        bufferCommands: false,
      })
      .then(async (instance) => {
        await instance.connection.asPromise();
        return instance;
      });
  }

  cached.conn = await cached.promise;
  global.mongooseConnection = cached;
  return cached.conn;
}
