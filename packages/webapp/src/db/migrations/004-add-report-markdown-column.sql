-- Migration: Add report_markdown column for storing generated benchmark reports
ALTER TABLE results ADD COLUMN report_markdown TEXT;
