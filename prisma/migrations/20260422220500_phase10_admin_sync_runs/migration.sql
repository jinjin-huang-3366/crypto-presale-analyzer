-- CreateTable
CREATE TABLE "IngestionSyncRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "inserted_count" INTEGER NOT NULL,
    "updated_count" INTEGER NOT NULL,
    "total_processed" INTEGER NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestionSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestionSyncRun_synced_at_idx" ON "IngestionSyncRun"("synced_at");
