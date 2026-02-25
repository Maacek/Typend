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

        try {
            // Primary: Attempt to read from local disk (works for API Server and local dev)
            return await fs.readFile(filePath);
        } catch (error) {
            // Fallback: If running as a distributed worker, it won't find the file locally.
            // We fetch it from the API Server via HTTP using the API_URL environment variable.
            if (error.code === 'ENOENT') {
                if (!process.env.API_URL) {
                    this.logger.error(`File not found locally (${filePath}), and API_URL is not set. If running as a Worker on Railway, you MUST set API_URL pointing to the main API server (e.g. https://your-app.up.railway.app)`);
                    throw error;
                }

                this.logger.log(`File not found locally, fetching over HTTP from API_URL: ${process.env.API_URL}`);
                const filename = path.basename(filePath);

                // Clean the API URL (remove /api/v1 suffix if present to get the base domain)
                let baseUrl = process.env.API_URL;
                if (baseUrl.endsWith('/api/v1')) {
                    baseUrl = baseUrl.replace('/api/v1', '');
                } else if (baseUrl.endsWith('/api/v1/')) {
                    baseUrl = baseUrl.replace('/api/v1/', '');
                }

                // Ensure no trailing slash on baseurl
                if (baseUrl.endsWith('/')) {
                    baseUrl = baseUrl.slice(0, -1);
                }

                const fileUrl = `${baseUrl}/uploads/${filename}`;
                this.logger.log(`Downloading: ${fileUrl}`);

                try {
                    const response = await fetch(fileUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    return Buffer.from(arrayBuffer);
                } catch (fetchError) {
                    this.logger.error(`Failed to fetch file over HTTP: ${fetchError.message}`);
                    throw error; // Throw original ENOENT to keep stack trace clean
                }
            }
            throw error;
        }
    }
}
