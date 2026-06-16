/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BirthdayCard {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  imageUrl?: string; // Stored as local storage base64, custom upload, or design preset id
  presetColor?: string; // Fallback or background styling style
  createdAt: number;
  authorId: string;
  authorName: string;
  authorEmail: string;
}

export interface UploadedVideo {
  id: string;
  name: string;
  size: number;
  url: string; // ObjectURL or base64
  uploadDate: number;
}

export interface ProcessingStage {
  label: string;
  percentage: number;
}
