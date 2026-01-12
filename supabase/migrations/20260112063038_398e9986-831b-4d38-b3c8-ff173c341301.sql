-- Add admin update policy for profiles table (fixes whitelist toggle)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create whitelist_requests table
CREATE TABLE public.whitelist_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    admin_response text,
    responded_by uuid,
    responded_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whitelist_requests ENABLE ROW LEVEL SECURITY;

-- Users can create own requests
CREATE POLICY "Users can create own requests"
ON public.whitelist_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view own requests
CREATE POLICY "Users can view own requests"
ON public.whitelist_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.whitelist_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all requests
CREATE POLICY "Admins can update all requests"
ON public.whitelist_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));