import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly uploadDir = path.join(process.cwd(), 'uploads');

    constructor() {
        this.ensureDir();
    }

    private async ensureDir() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
        } catch (err) {
            this.logger.error('Could not create upload directory', err);
        }
    }

    async uploadFile(filename: string, buffer: Buffer): Promise<string> {
        const filePath = path.join(this.uploadDir, filename);
        await fs.writeFile(filePath, buffer);
        return filePath; // In simple local setup, returning path
    }

    async getFile(filePathOrName: string): Promise<Buffer> {
        // Handle both full paths (from DB) and relative filenames
        const filePath = path.isAbsolute(filePathOrName) ? filePathOrName : path.join(this.uploadDir, filePathOrName);
        return fs.readFile(filePath);
    }
}
