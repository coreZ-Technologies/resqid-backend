// infrastructure/storage/storage.provider.js — RESQID
//
// Abstract storage provider interface.
// All storage adapters (S3, R2, MinIO, etc.) implement this contract.

export class StorageProvider {
  /**
   * Upload a file to storage.
   * @param {Buffer|Stream} file - File data
   * @param {string} key - Storage key/path
   * @param {Object} [options] - { contentType, metadata, cacheControl }
   * @returns {Promise<{success: boolean, key: string, location: string}>}
   */
  async upload(file, key, options = {}) {
    throw new Error('StorageProvider.upload() not implemented');
  }

  /**
   * Download a file from storage.
   * @param {string} key - Storage key/path
   * @returns {Promise<Buffer>}
   */
  async download(key) {
    throw new Error('StorageProvider.download() not implemented');
  }

  /**
   * Delete a file from storage.
   * @param {string} key - Storage key/path
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error('StorageProvider.delete() not implemented');
  }

  /**
   * Get public or pre-signed URL for a file.
   * @param {string} key - Storage key/path
   * @param {number} [expiresIn=3600] - Seconds until URL expires
   * @returns {Promise<string>}
   */
  async getUrl(key, expiresIn = 3600) {
    throw new Error('StorageProvider.getUrl() not implemented');
  }

  /**
   * Check if a file exists in storage.
   * @param {string} key - Storage key/path
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new Error('StorageProvider.exists() not implemented');
  }

  /**
   * List files with a prefix.
   * @param {string} prefix - Key prefix to list
   * @param {Object} [options] - { limit }
   * @returns {Promise<Array<{key: string, size: number, lastModified: Date, etag: string}>>}
   */
  async list(prefix, options = {}) {
    throw new Error('StorageProvider.list() not implemented');
  }

  /**
   * Get a pre-signed URL for direct upload (client-side upload).
   * @param {string} key - Storage key/path
   * @param {Object} [options] - { contentType, expiresIn, cacheControl }
   * @returns {Promise<{uploadUrl: string, publicUrl: string, key: string, expiresIn: number}>}
   */
  async getPresignedUploadUrl(key, options = {}) {
    throw new Error('StorageProvider.getPresignedUploadUrl() not implemented');
  }

  /**
   * Upload a stream to storage.
   * @param {Stream} stream - Readable stream
   * @param {string} key - Storage key/path
   * @param {Object} [options] - { contentType }
   * @returns {Promise<{success: boolean, key: string, location: string}>}
   */
  async uploadStream(stream, key, options = {}) {
    throw new Error('StorageProvider.uploadStream() not implemented');
  }

  /**
   * Health check for the storage provider.
   * @returns {Promise<{status: string, error?: string}>}
   */
  async healthCheck() {
    throw new Error('StorageProvider.healthCheck() not implemented');
  }
}

export default StorageProvider;
