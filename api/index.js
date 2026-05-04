import app from "../src/app.js";
import { connectDB } from "../src/loaders/mongoose.js";

let dbReadyPromise;

async function ensureDbConnected() {
  if (!dbReadyPromise) {
    dbReadyPromise = connectDB().catch((error) => {
      dbReadyPromise = undefined;
      throw error;
    });
  }

  await dbReadyPromise;
}

export default async function handler(req, res) {
  await ensureDbConnected();
  return app(req, res);
}
