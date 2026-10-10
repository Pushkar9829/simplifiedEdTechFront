import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listChildren } from '../api';
import { useAuth } from './AuthContext';
import { errorMessage } from '../utils/errors';

const STORAGE_KEY = 'ibdp_parent_child';
const ParentChildContext = createContext(null);

const childIdOf = (link) => String(link?.studentUserId?._id || link?.studentUserId || '');

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeStored(id) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function ParentChildProvider({ children: content }) {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const [searchParams] = useSearchParams();
  const queryChild = searchParams.get('child') || '';
  const [links, setLinks] = useState([]);
  const [selectedChildId, setSelected] = useState(() => readStored());
  const [loading, setLoading] = useState(isParent);
  const [error, setError] = useState('');
  const appliedQuery = useRef('');

  const refreshChildren = useCallback(async () => {
    if (!isParent) {
      setLinks([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    try {
      const data = await listChildren();
      const list = Array.isArray(data) ? data : data?.items || [];
      setLinks(list);
      setError('');
      return list;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [isParent]);

  useEffect(() => {
    refreshChildren();
  }, [refreshChildren]);

  // Keep the selection valid: ?child= wins, then the stored/current id, then the first child.
  useEffect(() => {
    if (!links.length) return;
    const ids = links.map(childIdOf);
    let next = selectedChildId;
    if (queryChild && queryChild !== appliedQuery.current && ids.includes(queryChild)) {
      appliedQuery.current = queryChild;
      next = queryChild;
    }
    if (!ids.includes(next)) next = ids[0];
    if (next !== selectedChildId) {
      setSelected(next);
      writeStored(next);
    }
  }, [links, queryChild, selectedChildId]);

  const setSelectedChildId = useCallback((id) => {
    const next = id ? String(id) : '';
    setSelected(next);
    writeStored(next);
  }, []);

  const value = useMemo(() => {
    const ids = links.map(childIdOf);
    const validId = ids.includes(selectedChildId) ? selectedChildId : null;
    const selectedChild = validId ? links[ids.indexOf(validId)] : null;
    return {
      enabled: isParent,
      children: links,
      selectedChildId: validId,
      selectedChild,
      selectedStudent: selectedChild?.studentUserId || null,
      setSelectedChildId,
      refreshChildren,
      loading,
      error,
    };
  }, [links, selectedChildId, isParent, setSelectedChildId, refreshChildren, loading, error]);

  return <ParentChildContext.Provider value={value}>{content}</ParentChildContext.Provider>;
}

const FALLBACK = {
  enabled: false,
  children: [],
  selectedChildId: null,
  selectedChild: null,
  selectedStudent: null,
  setSelectedChildId: () => {},
  refreshChildren: async () => [],
  loading: false,
  error: '',
};

export function useParentChild() {
  return useContext(ParentChildContext) || FALLBACK;
}

export function childLabel(link) {
  const s = link?.studentUserId || {};
  return s.name || s.refCode || s.phone || 'Child';
}
