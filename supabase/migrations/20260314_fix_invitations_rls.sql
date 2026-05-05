-- Fix permission denied for table users
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON clinic_invitations;
CREATE POLICY "Users can view invitations sent to their email" 
ON clinic_invitations FOR SELECT 
TO authenticated 
USING (
    email = (auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "Users can accept/reject invitations" ON clinic_invitations;
CREATE POLICY "Users can accept/reject invitations" 
ON clinic_invitations FOR UPDATE 
TO authenticated 
USING (
    email = (auth.jwt() ->> 'email')
)
WITH CHECK (
    email = (auth.jwt() ->> 'email')
);
