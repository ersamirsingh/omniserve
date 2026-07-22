
import mongoose from 'mongoose';

const connectToMongoDB = async (): Promise<void> => {
   if(!process.env.MONGO_URI) {
      throw new Error("MongoDB environment variables are missing");
   }
   await mongoose.connect(process.env.MONGO_URI as string, {
      maxPoolSize: 100,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
   });
   console.log('MongoDB connected');

   if (process.env.AUTO_FIX_MONGO_INDEXES === 'true') {
      try {
         const usersCollection = mongoose.connection.collection('users');
         const indexes = await usersCollection.indexes();
         const emailIndex = indexes.find(idx => idx.name === 'email_1');
         if (emailIndex && !emailIndex.partialFilterExpression) {
            console.log('Dropping legacy unique email index to recreate with partial filter...');
            await usersCollection.dropIndex('email_1');
            console.log('Legacy unique email index dropped successfully.');
         }
      } catch (err: any) {
         console.error('Failed to update email unique index:', err.message);
      }
   }
};

export default connectToMongoDB;
