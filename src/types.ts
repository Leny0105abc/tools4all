export type ToolId =
  | "dashboard"
  | "youtube-converter"
  | "mp4-to-mp3"
  | "name-text-converter"
  | "excel-unlocker"
  | "document-converter"
  | "image-compressor"
  | "file-split-merge"
  | "collage-creator"
  | "ocr-paperwork"
  | "cloud-storage";

export type ToolTabId = ToolId;

export interface GranularPermission {
  accessLevel: "private" | "restricted" | "public";
  allowView: boolean;
  allowEdit: boolean;
  allowDownload: boolean;
  allowShare: boolean;
  allowedUsers?: string[];
  expiresAt?: string;
}

export interface CloudFileItem {
  id: string;
  name: string;
  size: number;
  type: "video" | "audio" | "spreadsheet" | "pdf" | "document" | "image" | "other";
  mimeType: string;
  lastModified: number;
  isEncrypted: boolean;
  fileRef?: File;
  permission: GranularPermission;
}

export interface ToolCategory {
  id: string;
  name: string;
  tools: {
    id: ToolId;
    title: string;
    description: string;
    icon: string;
    badge?: string;
  }[];
}

export interface BatchFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  outputFormat?: string;
  resultBlob?: Blob;
  resultUrl?: string;
  resultName?: string;
  error?: string;
}

export interface CloudFile {
  id: string;
  name: string;
  size: number;
  updatedAt: string;
  type: "document" | "media" | "spreadsheet" | "image" | "archive";
  folderId?: string;
  permissions: {
    visibility: "private" | "internal" | "public";
    roles: {
      userEmail: string;
      role: "owner" | "editor" | "commenter" | "viewer";
    }[];
    allowDownload: boolean;
    allowShare: boolean;
    requirePassword?: boolean;
    password?: string;
    expiresAt?: string;
  };
  auditLog: {
    action: string;
    actor: string;
    timestamp: string;
  }[];
}

export interface CollageLayoutOption {
  id: string;
  name: string;
  iconName: string;
  slots: number;
  aspectRatio: "1:1" | "4:5" | "16:9" | "9:16";
}

export interface TextConversionSuggestion {
  detectedFormat: string;
  primarySuggestion: {
    title: string;
    description: string;
    transformedResult: string;
  };
  alternativeOptions: {
    id: string;
    title: string;
    description: string;
    preview: string;
  }[];
  nameTransform?: {
    isNameData: boolean;
    lastFirstToFirstLast: string;
    firstLastToLastFirst: string;
  };
}
