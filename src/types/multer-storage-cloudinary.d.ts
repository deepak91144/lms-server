declare module 'multer-storage-cloudinary' {
  import { StorageEngine } from 'multer';
  import { ConfigOptions } from 'cloudinary';

  interface Options {
    cloudinary: any;
    params?: any;
  }

  export class CloudinaryStorage implements StorageEngine {
    constructor(options: Options);
    _handleFile(req: any, file: any, cb: any): void;
    _removeFile(req: any, file: any, cb: any): void;
  }
}
