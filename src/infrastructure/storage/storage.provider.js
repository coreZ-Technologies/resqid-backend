<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
/**
 * Storage Provider Interface
 * Defines the contract for all object-storage adapter implementations.
 */
export class StorageProvider {
<<<<<<< HEAD
=======
<<<<<<< HEAD
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
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
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
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
