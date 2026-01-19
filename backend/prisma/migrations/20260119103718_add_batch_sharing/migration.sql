/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `Batch` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shareSlug]` on the table `Batch` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareSlug" TEXT,
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Batch_shareToken_key" ON "Batch"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_shareSlug_key" ON "Batch"("shareSlug");
