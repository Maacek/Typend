import { Controller, Post, UseInterceptors, UploadedFiles, UseGuards, Request, Body, Get, Param, Res } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { BatchesService } from './batches.service';

@Controller('batches')
export class BatchesController {
    constructor(private batchesService: BatchesService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post('upload')
    @UseInterceptors(FilesInterceptor('files', 50))
    async uploadBatch(
        @UploadedFiles() files: Express.Multer.File[],
        @Request() req: any,
        @Body('name') name?: string,
    ) {
        console.log('User from request:', JSON.stringify(req.user));
        return this.batchesService.createBatch(req.user.workspaceId, files, name);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getBatches(@Request() req: any) {
        return this.batchesService.findAll(req.user.workspaceId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id/results')
    async getBatchResults(@Param('id') batchId: string, @Request() req: any) {
        return this.batchesService.getBatchResults(batchId, req.user.workspaceId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id/export/csv')
    async exportCsv(
        @Param('id') batchId: string,
        @Request() req: any,
        @Res() res: Response,
    ) {
        const csv = await this.batchesService.exportToCsv(batchId, req.user.workspaceId);
        const filename = `batch-${batchId}-${Date.now()}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    }

    // Share management endpoints
    @UseGuards(AuthGuard('jwt'))
    @Post(':id/share')
    async generateShareLink(
        @Param('id') batchId: string,
        @Request() req: any,
        @Body('customSlug') customSlug?: string,
    ) {
        return this.batchesService.generateShareToken(batchId, req.user.workspaceId, customSlug);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/share/revoke')
    async revokeShareLink(
        @Param('id') batchId: string,
        @Request() req: any,
    ) {
        return this.batchesService.revokeShareToken(batchId, req.user.workspaceId);
    }

    // Public access (no auth required)
    @Get('share/:identifier')
    async getSharedBatch(@Param('identifier') identifier: string) {
        return this.batchesService.getBatchByShareToken(identifier);
    }
}
