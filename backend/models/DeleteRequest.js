import mongoose from 'mongoose';

const deleteRequestSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:    { type: String },
  itemId:      { type: String, required: true },  // MongoDB _id of the target document
  itemType:    { type: String, enum: ['video', 'course', 'thought', 'playlist'], required: true },
  itemName:    { type: String },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  resolvedAt:  { type: Date },
});

export default mongoose.model('DeleteRequest', deleteRequestSchema);
