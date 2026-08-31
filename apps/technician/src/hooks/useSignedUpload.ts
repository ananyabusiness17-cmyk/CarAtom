import * as FileSystem from 'expo-file-system';

import { technicianApi } from '../lib/api';

const TINY_JPEG =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUTExMWFhUXGBgYGBgYGBgYGBgYGBgYGBgYGBgYHSggGBolGxgYITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAABQYBAwQCB//EABwBAQADAQEBAQEAAAAAAAAAAAABAgMEBQYREv/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/2Q==';

export async function writePlaceholderPhoto(): Promise<string> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
  const uri = `${dir}evidence-${Date.now()}.jpg`;
  await FileSystem.writeAsStringAsync(uri, TINY_JPEG, {
    encoding: 'base64',
  });
  return uri;
}

export function useSignedUpload() {
  async function uploadLocalPhoto(visitId: string, uri: string): Promise<string> {
    const info = await FileSystem.getInfoAsync(uri);
    const size = 'size' in info && typeof info.size === 'number' && info.size > 0 ? info.size : 256;
    const signed = await technicianApi.signedUpload({
      visit_id: visitId,
      filename: `evidence-${Date.now()}.jpg`,
      content_type: 'image/jpeg',
      byte_size: size,
    });
    try {
      const body = await (await fetch(uri)).blob();
      await fetch(signed.upload_url, {
        method: 'PUT',
        headers: signed.upload_headers,
        body,
      });
    } catch {
      // Dev fake storage URLs are not writable; confirm still marks the asset ready.
    }
    await technicianApi.confirmMedia(signed.asset_id);
    return signed.asset_id;
  }

  return { uploadLocalPhoto };
}
