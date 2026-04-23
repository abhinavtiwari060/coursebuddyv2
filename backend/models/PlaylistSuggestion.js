import mongoose from 'mongoose';

const playlistSuggestionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  thumbnail: { type: String, required: true },
  playlist_url: { type: String, required: true },
  category: { type: String, default: 'General' },
  created_by_admin: { type: Boolean, default: true },
  hidden_by_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export default mongoose.model('PlaylistSuggestion', playlistSuggestionSchema);
