import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Video from './models/Video.js';

dotenv.config();

const extractVideoId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const videos = await Video.find();
    let updated = 0;

    for (const video of videos) {
      if (!video.youtubeVideoId && video.link) {
        const extracted = extractVideoId(video.link);
        if (extracted) {
          video.youtubeVideoId = extracted;
          await video.save();
          updated++;
        }
      }
    }

    console.log(`Migration complete. Updated ${updated} videos.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
