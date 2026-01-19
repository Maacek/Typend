-- AlterTable
ALTER TABLE "AnalysisResult" ADD COLUMN     "azureConfidence" DOUBLE PRECISION,
ADD COLUMN     "azureText" TEXT,
ADD COLUMN     "consensusScore" DOUBLE PRECISION,
ADD COLUMN     "googleConfidence" DOUBLE PRECISION,
ADD COLUMN     "googleText" TEXT,
ADD COLUMN     "ocrProvider" TEXT;
