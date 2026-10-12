import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { storageService } from '../storage/storage.service.js';
import { logAuditEvent } from './audit.service.js';
import { config } from '../config/index.js';

export class RetentionWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  public start() {
    if (this.timer) return;
    console.log(`Starting document retention worker (polling every ${config.retentionCheckIntervalMs / 1000}s)...`);
    this.timer = setInterval(() => {
      this.processExpiredDocuments().catch((err) => {
        console.error('Error during retention worker run:', err);
      });
    }, config.retentionCheckIntervalMs);

    // Initial run after short delay
    setTimeout(() => {
      this.processExpiredDocuments().catch(() => {});
    }, 5000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async processExpiredDocuments() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const res = await query(`
        SELECT id, order_id, storage_key, original_filename, auto_delete_at
        FROM document_metadata
        WHERE auto_delete_at <= CURRENT_TIMESTAMP AND is_deleted = FALSE
        LIMIT 50;
      `);

      if (res.rows.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`[RetentionWorker] Found ${res.rows.length} expired document(s) scheduled for secure deletion.`);

      for (const doc of res.rows) {
        const jobId = uuidv4();
        try {
          // Record pending job
          await query(`
            INSERT INTO file_deletion_jobs (id, document_id, scheduled_for, status)
            VALUES ($1, $2, $3, 'PENDING')
          `, [jobId, doc.id, doc.auto_delete_at]);

          // Physically delete from private storage
          await storageService.deletePhysicalFile(doc.storage_key);

          // Mark metadata as deleted
          await query(`
            UPDATE document_metadata
            SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [doc.id]);

          // Mark job completed
          await query(`
            UPDATE file_deletion_jobs
            SET status = 'COMPLETED', executed_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [jobId]);

          // Audit log
          await logAuditEvent({
            actorRole: 'SYSTEM',
            action: 'DOCUMENT_AUTO_DELETED',
            targetType: 'DOCUMENT',
            targetId: doc.id,
            details: {
              orderId: doc.order_id,
              originalFilename: doc.original_filename,
              reason: 'Retention window expired'
            }
          });

          console.log(`[RetentionWorker] Securely deleted expired document: ${doc.id} (${doc.original_filename})`);
        } catch (docErr: any) {
          console.error(`[RetentionWorker] Failed to delete document ${doc.id}:`, docErr.message);
          await query(`
            UPDATE file_deletion_jobs
            SET status = 'FAILED', error_message = $2
            WHERE id = $1
          `, [jobId, docErr.message]);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const retentionWorker = new RetentionWorker();
