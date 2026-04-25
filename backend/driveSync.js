import axios from 'axios';
import DriveVideo from './models/DriveVideo.js';
import DriveFolder from './models/DriveFolder.js';

export function extractDriveFolderId(url) {
  if (!url) return null;
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url.trim(); 
}

export async function syncDriveFolder(driveFolderId) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_DRIVE_API_KEY is not configured in .env");

  const folderDoc = await DriveFolder.findById(driveFolderId);
  if (!folderDoc) throw new Error("Folder document not found");

  const rootId = folderDoc.folderId;
  const rootName = folderDoc.folderName;

  folderDoc.syncStatus = 'syncing';
  await folderDoc.save();

  try {
    const videosFound = [];

    // Recursive scan function
    // pathParts initially is [rootName] so that pathParts[0] = Course Name
    async function scanLevel(currentFolderId, pathParts) {
      let pageToken = null;
      do {
        const resp = await axios.get('https://www.googleapis.com/drive/v3/files', {
          params: {
            key: apiKey,
            q: `'${currentFolderId}' in parents and trashed=false`,
            fields: 'nextPageToken, files(id, name, mimeType, size, videoMediaMetadata, thumbnailLink)',
            pageToken: pageToken,
            pageSize: 1000
          }
        });

        const files = resp.data.files || [];
        
        let order = 0;
        for (const file of files) {
          order++;
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            await scanLevel(file.id, [...pathParts, file.name]);
          } else if (file.mimeType.startsWith('video/')) {
            const courseName = pathParts[0] || rootName;
            const subjectName = pathParts[1] || '';
            const chapterName = pathParts[2] || '';

            const durationMillis = file.videoMediaMetadata?.durationMillis || 0;
            const durationSecs = Math.floor(durationMillis / 1000);

            videosFound.push({
              driveFolderId: rootId,
              fileId: file.id,
              title: file.name,
              mimeType: file.mimeType,
              pathParts: [...pathParts],
              courseName,
              subjectName,
              chapterName,
              thumbnail: file.thumbnailLink || '',
              duration: durationSecs,
              size: parseInt(file.size) || 0,
              driveOrder: order
            });
          }
        }
        pageToken = resp.data.nextPageToken;
      } while (pageToken);
    }

    await scanLevel(rootId, [rootName]);

    // Upsert and Cleanup
    const existingVideos = await DriveVideo.find({ driveFolderId: rootId }, { fileId: 1 });
    const existingIds = new Set(existingVideos.map(v => v.fileId));
    const foundIds = new Set(videosFound.map(v => v.fileId));

    for (const v of videosFound) {
      await DriveVideo.findOneAndUpdate(
        { fileId: v.fileId },
        { $set: v },
        { upsert: true }
      );
    }

    const toDelete = [...existingIds].filter(id => !foundIds.has(id));
    if (toDelete.length > 0) {
      await DriveVideo.deleteMany({ fileId: { $in: toDelete } });
    }

    // Update folder metadata
    folderDoc.totalVideos = videosFound.length;
    folderDoc.lastSynced = new Date();
    folderDoc.syncStatus = 'done';
    folderDoc.syncError = '';
    await folderDoc.save();

  } catch (error) {
    folderDoc.syncStatus = 'error';
    folderDoc.syncError = error.response?.data?.error?.message || error.message;
    await folderDoc.save();
    throw error;
  }
}
