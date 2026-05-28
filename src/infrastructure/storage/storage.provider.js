<<<<<<< HEAD
=======
<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
/**
 * Storage Provider Interface
 * Defines the contract for all object-storage adapter implementations.
 */
export class StorageProvider {
<<<<<<< HEAD
=======
<<<<<<< HEAD
    async upload(file, key, options = {}) {
      throw new Error('StorageProvider.upload() is not implemented.');
    }
  
    async download(key) {
      throw new Error('StorageProvider.download() is not implemented.');
    }
  
    async delete(key) {
      throw new Error('StorageProvider.delete() is not implemented.');
    }
  
    async getUrl(key, expiresIn = 3600) {
      throw new Error('StorageProvider.getUrl() is not implemented.');
    }
  
    async exists(key) {
      throw new Error('StorageProvider.exists() is not implemented.');
    }
  
    async list(prefix, options = {}) {
      throw new Error('StorageProvider.list() is not implemented.');
    }
  
    async getPresignedUploadUrl(key, options = {}) {
      throw new Error('StorageProvider.getPresignedUploadUrl() is not implemented.');
    }
  }
  
  export default StorageProvider;
  
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  async upload(file, key, options = {}) {
    throw new Error('StorageProvider.upload() is not implemented.');
  }

  async download(key) {
    throw new Error('StorageProvider.download() is not implemented.');
  }

  async delete(key) {
    throw new Error('StorageProvider.delete() is not implemented.');
  }

  async getUrl(key, expiresIn = 3600) {
    throw new Error('StorageProvider.getUrl() is not implemented.');
  }

  async exists(key) {
    throw new Error('StorageProvider.exists() is not implemented.');
  }

  async list(prefix, options = {}) {
    throw new Error('StorageProvider.list() is not implemented.');
  }

  async getPresignedUploadUrl(key, options = {}) {
    throw new Error('StorageProvider.getPresignedUploadUrl() is not implemented.');
  }
}

export default StorageProvider;
<<<<<<< HEAD
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
