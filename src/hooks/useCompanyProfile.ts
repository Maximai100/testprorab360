import { useCallback, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import type { CompanyProfile } from '../types';

export const useCompanyProfile = (session: Session | null) => {
  const [profile, setProfile] = useState<CompanyProfile>({ name: '', details: '', logo: null });
  const [loading, setLoading] = useState(false);

  const mapRowToProfile = (row: any): CompanyProfile => ({
    name: row?.name || '',
    details: row?.details || '',
    logo: row?.logo_url || null,
  });

  const fetchProfile = useCallback(async (sess: Session | null = session) => {
    if (!sess?.user?.id) {
      setProfile({ name: '', details: '', logo: null });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', sess.user.id)
        .maybeSingle();
      if (error) {
        console.error('useCompanyProfile.fetchProfile error:', error);
        return;
      }
      if (data) setProfile(mapRowToProfile(data));
    } finally {
      setLoading(false);
    }
  }, [session]);

  const saveProfile = useCallback(async (data: Partial<CompanyProfile>) => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const row = {
        id: undefined as string | undefined, // let DB default/keep existing
        user_id: session.user.id,
        name: data.name ?? profile.name,
        details: data.details ?? profile.details,
        logo_url: data.logo === undefined ? profile.logo : data.logo,
        updated_at: new Date().toISOString(),
      } as any;

      const { data: upserted, error } = await supabase
        .from('company_profiles')
        .upsert(row, { onConflict: 'user_id' })
        .select('*')
        .single();
      if (error) {
        console.error('useCompanyProfile.saveProfile error:', error);
        return;
      }
      setProfile(mapRowToProfile(upserted));
    } finally {
      setLoading(false);
    }
  }, [session, profile]);

  const uploadLogo = useCallback(async (file: File) => {
    if (!session?.user?.id) return;
    const path = `${session.user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
    if (uploadError) {
      console.error('useCompanyProfile.uploadLogo error:', uploadError);
      return;
    }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    await saveProfile({ logo: publicUrl });
  }, [session, saveProfile]);

  const removeLogo = useCallback(async () => {
    await saveProfile({ logo: null });
  }, [saveProfile]);

  return {
    profile,
    setProfile,
    loading,
    fetchProfile,
    saveProfile,
    uploadLogo,
    removeLogo,
  };
};

export default useCompanyProfile;

