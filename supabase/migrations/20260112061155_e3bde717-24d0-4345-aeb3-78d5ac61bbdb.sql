-- Phase 1: Add user_id to meetings table and fix security

-- 1.1 Add user_id column to meetings table
ALTER TABLE public.meetings 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 1.2 Drop existing overly permissive policies on meetings
DROP POLICY IF EXISTS "Anyone can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Anyone can delete meetings" ON public.meetings;
DROP POLICY IF EXISTS "Anyone can update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Anyone can view meetings" ON public.meetings;

-- 1.3 Create secure RLS policies for meetings (user owns their meetings)
CREATE POLICY "Users can view own meetings" 
ON public.meetings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meetings" 
ON public.meetings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings" 
ON public.meetings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings" 
ON public.meetings 
FOR DELETE 
USING (auth.uid() = user_id);

-- 1.4 Drop existing overly permissive policies on transcripts
DROP POLICY IF EXISTS "Anyone can create transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Anyone can view transcripts" ON public.transcripts;

-- 1.5 Create secure RLS policies for transcripts (through meeting ownership)
CREATE POLICY "Users can view own transcripts" 
ON public.transcripts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = transcripts.meeting_id 
    AND meetings.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create transcripts for own meetings" 
ON public.transcripts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = transcripts.meeting_id 
    AND meetings.user_id = auth.uid()
  )
);

-- 1.6 Create user_settings table for persisting preferences
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name text,
  company_address text,
  company_phone text,
  company_email text,
  company_website text,
  company_logo_url text,
  region text DEFAULT 'India',
  language text DEFAULT 'English',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings
CREATE POLICY "Users can view own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at on user_settings
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();