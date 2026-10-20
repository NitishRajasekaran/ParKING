import mongoose from "mongoose";

const sanitizeMongoUri = (uri) => {
    if (!uri) return '';
    try {
        const parsed = new URL(uri);
        if (parsed.password) parsed.password = '****';
        if (parsed.username) parsed.username = '****';
        return parsed.toString();
    } catch {
        return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    }
};

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }
        await mongoose.connect(uri);
        const client = mongoose.connection.getClient();
        const topology = client?.topology?.description?.type || 'unknown';
        const retryWrites = client?.options?.retryWrites;
        console.log(`MongoDB connected: ${sanitizeMongoUri(uri)} (topology: ${topology}, retryWrites: ${retryWrites})`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

export default connectDB;