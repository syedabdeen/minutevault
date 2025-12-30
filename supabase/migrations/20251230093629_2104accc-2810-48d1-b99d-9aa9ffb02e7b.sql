-- Add participant_names column to meetings table for comma-separated names
ALTER TABLE public.meetings ADD COLUMN participant_names text DEFAULT NULL;

-- Add summary and action_items columns for AI-generated content
ALTER TABLE public.meetings ADD COLUMN summary text DEFAULT NULL;
ALTER TABLE public.meetings ADD COLUMN action_items jsonb DEFAULT NULL;