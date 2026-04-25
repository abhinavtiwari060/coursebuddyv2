import axios from 'axios';
import DriveVideo from './models/DriveVideo.js';
import DriveFolder from './models/DriveFolder.js';

export function extractDriveFolderId(url) {
  if (!url) return null;
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url.trim(); 
}

import User from './models/User.js';

export async function syncDriveFolder(driveFolderId, userId = null) {
  let apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  let accessToken = null;

  if (userId) {
    const user = await User.findById(userId);
    if (user?.googleDriveTokens?.accessToken) {
      accessToken = user.googleDriveTokens.accessToken;
      apiKey = null; // Disable API key if we have oauth token
    }
  }

  if (!apiKey && !accessToken) throw new Error("No Google Drive API Key or User Token found");

  const folderDoc = await DriveFolder.findById(driveFolderId);
  if (!folderDoc) throw new Error("Folder document not found");

  const rootId = folderDoc.folderId;
  const rootName = folderDoc.folderName;

  folderDoc.syncStatus = 'syncing';
  await folderDoc.save();

  try {
    const videosFound = [];

    // Recursive scan function
    async function scanLevel(currentFolderId, pathParts) {
      console.log(`[DRIVE_SYNC] Scanning folder: ${pathParts.join('/')} (ID: ${currentFolderId})`);
      let pageToken = null;
      do {
        const config = {
          params: {
            q: `'${currentFolderId}' in parents and trashed=false`,
            fields: 'nextPageToken, files(id, name, mimeType, size, videoMediaMetadata, thumbnailLink, createdTime)',
            pageToken: pageToken,
            pageSize: 1000,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
          }
        };
        if (apiKey) config.params.key = apiKey;
        if (accessToken) {
          config.headers = { Authorization: `Bearer ${accessToken}` };
        }

        const resp = await axios.get('https://www.googleapis.com/drive/v3/files', config);

        const files = resp.data.files || [];
        console.log(`[DRIVE_SYNC] Found ${files.length} items in current folder`);
        
        if (files.length === 0 && currentFolderId === rootId) {
          console.warn(`[DRIVE_SYNC] WARNING: Root folder is empty. This usually indicates a PERMISSION ISSUE. Ensure the folder is set to 'Anyone with the link can view'.`);
        }
        
        let order = 0;
        for (const file of files) {
          order++;
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            await scanLevel(file.id, [...pathParts, file.name]);
          } else if (file.mimeType.startsWith('video/') || file.mimeType.startsWith('image/')) {
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
              parentFolderId: currentFolderId,
              thumbnail: file.thumbnailLink || '',
              duration: durationSecs,
              size: parseInt(file.size) || 0,
              driveOrder: order,
              createdAtDrive: file.createdTime
            });
          }
        }
        pageToken = resp.data.nextPageToken;
      } while (pageToken);
    }

    await scanLevel(rootId, [rootName]);

    console.log(`[DRIVE_SYNC] Recursion complete. Total assets found: ${videosFound.length}`);

    // Upsert and Cleanup
    const existingVideos = await DriveVideo.find({ driveFolderId: rootId }, { fileId: 1 });
    const existingIds = new Set(existingVideos.map(v => v.fileId));
    const foundIds = new Set(videosFound.map(v => v.fileId));

    console.log(`[DRIVE_SYNC] Synchronizing with database...`);
    for (const v of videosFound) {
      await DriveVideo.findOneAndUpdate(
        { fileId: v.fileId },
        { $set: v },
        { upsert: true }
      );
    }

    const toDelete = [...existingIds].filter(id => !foundIds.has(id));
    if (toDelete.length > 0) {
      console.log(`[DRIVE_SYNC] Removing ${toDelete.length} obsolete items`);
      await DriveVideo.deleteMany({ fileId: { $in: toDelete } });
    }

    // Update folder metadata
    folderDoc.totalVideos = videosFound.length; // We keep totalVideos name but it includes images now
    folderDoc.lastSynced = new Date();
    folderDoc.syncStatus = 'done';
    folderDoc.syncError = '';
    await folderDoc.save();
    console.log(`[DRIVE_SYNC] Sync successful for: ${rootName}`);

  } catch (error) {
    console.error(`[DRIVE_SYNC] CRITICAL FAILURE:`, error.response?.data || error.message);
    folderDoc.syncStatus = 'error';
    folderDoc.syncError = error.response?.data?.error?.message || error.message;
    await folderDoc.save();
    throw error;
  }
}
