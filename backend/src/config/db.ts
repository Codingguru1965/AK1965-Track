import mongoose from 'mongoose';

export const connectDB = async (): Promise<boolean> => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ak1965track';
  try {
    console.log(`[Database] Connecting to MongoDB...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] Connected successfully to MongoDB: ${mongoose.connection.host}`);
    return true;
  } catch (error: any) {
    console.warn(`[Database] MongoDB connection notice: ${error.message}`);
    console.warn(`[Database] Running in fallback mode. Offline / local requests will be preserved.`);
    return false;
  }
};
