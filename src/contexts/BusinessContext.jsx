// src/contexts/BusinessContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const BusinessContext = createContext({});

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};

export const BusinessProvider = ({ children }) => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [userAccess, setUserAccess] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user's businesses
  // BP-003 FIX: don't call switchBusiness() here — it closes over stale `businesses` state.
  // Instead, do the selection logic inline after setBusinesses so we work with fresh data.
  const loadBusinesses = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_business_access')
        .select(`
          *,
          business:businesses(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const accessList = data || [];
      setBusinesses(accessList);

      // Auto-select: try localStorage preference first, then first in list
      const savedId = localStorage.getItem('currentBusinessId');
      const preferred = savedId
        ? accessList.find(b => b.business.id === savedId)
        : null;
      const toSelect = preferred ?? accessList[0] ?? null;

      if (toSelect) {
        setCurrentBusiness(toSelect.business);
        setUserAccess(toSelect);
        localStorage.setItem('currentBusinessId', toSelect.business.id);
      } else {
        setCurrentBusiness(null);
        setUserAccess(null);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBusinesses([]);
      setCurrentBusiness(null);
      setUserAccess(null);
      setLoading(false);
      return;
    }
    loadBusinesses();
  }, [user, loadBusinesses]);

  // BP-003 FIX: switchBusiness now receives the live accessList directly so it
  // never has to read from the businesses state variable (which may be stale).
  const switchBusiness = useCallback((businessId) => {
    setBusinesses(prev => {
      const access = prev.find(b => b.business.id === businessId);
      if (access) {
        setCurrentBusiness(access.business);
        setUserAccess(access);
        localStorage.setItem('currentBusinessId', businessId);
      }
      return prev; // no change to the list itself
    });
  }, []);

  const createBusiness = async (businessData) => {
    const { data, error } = await supabase
      .from('businesses')
      .insert([{ ...businessData, created_by: user.id }])
      .select()
      .single();

    if (error) throw error;

    // Grant the creator admin access
    await supabase.from('user_business_access').insert([{
      user_id: user.id,
      business_id: data.id,
      permission_level: 'admin',
    }]);

    await loadBusinesses();
    return data;
  };

  const updateBusiness = async (businessId, updates) => {
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', businessId)
      .select()
      .single();

    if (error) throw error;

    // Reflect changes in current context without a full reload
    if (currentBusiness?.id === businessId) {
      setCurrentBusiness(data);
    }
    await loadBusinesses();
    return data;
  };

  const updateUserAccess = async (accessId, permissionLevel) => {
    const { error } = await supabase
      .from('user_business_access')
      .update({ permission_level: permissionLevel })
      .eq('id', accessId);

    if (error) throw error;
    await loadBusinesses();
  };

  const removeUserAccess = async (accessId) => {
    const { error } = await supabase
      .from('user_business_access')
      .delete()
      .eq('id', accessId);

    if (error) throw error;
    await loadBusinesses();
  };

  // BP-012: inviteUser is not implemented (needs email service).
  // Kept as a stub so callers don't crash on import.
  const inviteUser = async (_businessId, _email, _permissionLevel) => {
    throw new Error('Invite functionality not yet implemented — needs email service integration');
  };

  // ---------------------------------------------------------------------------
  // Permission helpers — used throughout pages/components
  // ---------------------------------------------------------------------------
  const canAdmin = () => userAccess?.permission_level === 'admin';

  const canEdit = () =>
    ['admin', 'editor', 'accountant'].includes(userAccess?.permission_level);

  const canView = () => !!userAccess;

  const value = {
    businesses,
    currentBusiness,
    userAccess,
    loading,
    switchBusiness,
    createBusiness,
    updateBusiness,
    inviteUser,
    updateUserAccess,
    removeUserAccess,
    refreshBusinesses: loadBusinesses,
    // Permission helpers
    canAdmin,
    canEdit,
    canView,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};
