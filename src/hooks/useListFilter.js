import { useEffect, useMemo, useState } from 'react';

export const LIST_PAGE_SIZE = 12;

export function useListFilter(items, getHaystack, { pageSize = LIST_PAGE_SIZE, resetKey } = {}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const source = items || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter((item) => String(getHaystack(item) || '').toLowerCase().includes(q));
  }, [source, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [search, resetKey]);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const safePage = Math.min(page, pages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    search,
    setSearch,
    page: safePage,
    setPage,
    pages,
    total: filtered.length,
    sourceCount: source.length,
    items: paged,
    filtered,
    noMatch: source.length > 0 && filtered.length === 0,
    pagerProps: {
      page: safePage,
      pages,
      total: filtered.length,
      onPrev: () => setPage((p) => Math.max(1, p - 1)),
      onNext: () => setPage((p) => Math.min(pages, p + 1)),
    },
  };
}
