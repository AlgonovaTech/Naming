import { google } from "googleapis";
import { config } from "./config";

// Google Drive folder ID for creative uploads
const DRIVE_FOLDER_ID = "1zr7kc1lhTe1kZodP6hHZ4T2F77yHEsfM";

function getAuth() {
  return new google.auth.JWT({
    email: config.googleServiceAccountEmail,
    key: config.googlePrivateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

function getDriveClient() {
  const auth = getAuth();
  return google.drive({ version: "v3", auth });
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  thumbnailLink: string;
}

/**
 * Upload a file to Google Drive and make it publicly viewable
 * Returns URLs that can be used in Google Sheets =IMAGE() formula
 */
export async function uploadToDrive(
  base64Data: string,
  mimeType: string,
  filename: string
): Promise<DriveUploadResult> {
  const drive = getDriveClient();
  
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, "base64");
  
  // Create a unique filename with timestamp
  const timestamp = Date.now();
  const uniqueFilename = `${timestamp}_${filename}`;
  
  // Upload file to Google Drive
  const fileMetadata = {
    name: uniqueFilename,
    parents: [DRIVE_FOLDER_ID],
  };
  
  const media = {
    mimeType,
    body: require("stream").Readable.from(buffer),
  };
  
  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink, thumbnailLink",
  });
  
  const fileId = file.data.id!;
  
  // Make the file publicly viewable
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });
  
  // Get the direct image URL that works with Google Sheets =IMAGE()
  // Format: https://drive.google.com/uc?export=view&id=FILE_ID
  const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
  
  return {
    fileId,
    webViewLink: file.data.webViewLink || directUrl,
    thumbnailLink: directUrl,
  };
}

