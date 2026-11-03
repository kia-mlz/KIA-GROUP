-- Additive indexes for admin contact inbox sorting / unread filters.
CREATE INDEX IF NOT EXISTS "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "ContactMessage_readAt_idx" ON "ContactMessage"("readAt");
