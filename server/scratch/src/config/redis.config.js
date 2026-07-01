import { createClient } from 'redis';
let redisClient;
const connectRedis = async () => {
    if (redisClient?.isOpen) {
        return redisClient;
    }
    if (!redisClient) {
        if (!process.env.REDIS_PASSWORD || !process.env.REDIS_HOST || !process.env.REDIS_PORT) {
            throw new Error('Redis environment variables are missing');
        }
        redisClient = createClient({
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD,
            socket: {
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT),
            },
        });
        redisClient.on('error', err => {
            console.error('Redis Error:', err);
        });
    }
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('Redis connected');
    }
    return redisClient;
};
export default connectRedis;
