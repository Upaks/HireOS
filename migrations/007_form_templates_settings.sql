-- Add form-level settings to form_templates (success message, expiry, attachments, etc.)
ALTER TABLE "public"."form_templates"
  ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}';

COMMENT ON COLUMN "public"."form_templates"."settings" IS 'Form-level options: allowAttachments, allowComments, successMessage, redirectUrl, expiryDate, submissionLimit, notifyOnSubmit';
