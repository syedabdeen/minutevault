-- Add device binding and status fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS device_id text,
ADD COLUMN IF NOT EXISTS is_whitelisted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create index for device lookups
CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON public.profiles(device_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Update RLS policy for profiles to allow updating device_id
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Create function to check device binding
CREATE OR REPLACE FUNCTION public.check_device_binding(_user_id uuid, _device_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  result jsonb;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = _user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  -- Check if user is disabled
  IF user_profile.status = 'disabled' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Account is disabled. Please contact administrator.');
  END IF;
  
  -- Whitelisted users bypass device check
  IF user_profile.is_whitelisted THEN
    -- Update device_id for logging purposes but don't enforce
    UPDATE profiles SET device_id = _device_id WHERE id = _user_id;
    RETURN jsonb_build_object('allowed', true, 'reason', 'Whitelisted user');
  END IF;
  
  -- First time login - bind device
  IF user_profile.device_id IS NULL OR user_profile.device_id = '' THEN
    UPDATE profiles SET device_id = _device_id WHERE id = _user_id;
    RETURN jsonb_build_object('allowed', true, 'reason', 'Device bound successfully');
  END IF;
  
  -- Check if device matches
  IF user_profile.device_id = _device_id THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'Device verified');
  END IF;
  
  -- Device mismatch - block login
  RETURN jsonb_build_object('allowed', false, 'reason', 'This account is already active on another device. Please contact administrator.');
END;
$$;

-- Create function to reset device binding (admin only)
CREATE OR REPLACE FUNCTION public.reset_device_binding(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET device_id = NULL WHERE id = _user_id;
  RETURN FOUND;
END;
$$;