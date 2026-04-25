import { google } from 'googleapis';
import User from './models/User.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // e.g., http://localhost:5000/api/drive/auth/callback
);

export function getAuthUrl(userId) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive.readonly'
    ],
    state: userId
  });
}

export async function handleCallback(code, userId) {
  const { tokens } = await oauth2Client.getToken(code);
  await User.findByIdAndUpdate(userId, {
    googleDriveTokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date
    }
  });
  return tokens;
}

export async function getDriveClient(userId) {
  const user = await User.findById(userId);
  if (!user || !user.googleDriveTokens || !user.googleDriveTokens.accessToken) {
    throw new Error('User has not connected Google Drive');
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  client.setCredentials({
    access_token: user.googleDriveTokens.accessToken,
    refresh_token: user.googleDriveTokens.refreshToken,
    expiry_date: user.googleDriveTokens.expiryDate
  });

  // Handle automatic refresh and saving
  client.on('tokens', async (tokens) => {
    const updates = { 'googleDriveTokens.accessToken': tokens.access_token };
    if (tokens.refresh_token) {
      updates['googleDriveTokens.refreshToken'] = tokens.refresh_token;
    }
    if (tokens.expiry_date) {
      updates['googleDriveTokens.expiryDate'] = tokens.expiry_date;
    }
    await User.findByIdAndUpdate(userId, { $set: updates });
  });

  return google.drive({ version: 'v3', auth: client });
}
