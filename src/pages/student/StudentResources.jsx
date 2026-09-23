import { useEffect, useState } from 'react';
import {
  bookmarkResource,
  downloadResource,
  listResources,
  listSubjects,
  myBookmarks,
  purchaseResource,
  unbookmarkResource,
} from '../../api';
import { money } from '../../utils/format';
import { ErpButton, ErpPager, ErpSearch, ErpSelect, ErpTabs } from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import {
  resourceTypeOptions,
  subjectFilterOptions,
  titleCase,
} from './studentOptions';
import { mediaUrl } from '../../utils/mediaUrl';

export default function StudentResources() {
  const [subjects, setSubjects] = useState([]);
  const [items, setItems] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [filters, setFilters] = useState({ subjectId: '', type: '', search: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [res, bm] = await Promise.all([listResources(filters), myBookmarks()]);
      setItems(res.items || []);
      setBookmarks(bm || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listSubjects()
      .then((d) => setSubjects(d.items || []))
      .catch(() => {});
    load();
  }, []);

  const list = useListFilter(items, (r) =>
    [r.title, r.topic, r.subjectId?.name, r.type, r.level].filter(Boolean).join(' ')
  );
  const bookmarkedIds = new Set(
    bookmarks.map((b) => (b.resourceId?._id || b.resourceId || '').toString())
  );

  return (
    <div className="page stack">
      <div>
        <h1 style={{ margin: 0 }}>Learning resources</h1>
        <p className="muted" style={{ margin: '0.25rem 0 0' }}>
          Notes, past papers, markschemes, and more
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={filters.type || 'all'}
          onChange={(value) => setFilters((f) => ({ ...f, type: value === 'all' ? '' : value }))}
          tabs={resourceTypeOptions(true).map((o) => ({
            value: o.value || 'all',
            label: o.label,
          }))}
        />
        <ErpSearch
          value={filters.search}
          onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          placeholder="Search resources"
        />
        <ErpSelect
          inline
          value={filters.subjectId}
          options={subjectFilterOptions(subjects)}
          onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value }))}
        />
        <div className="avail-bar-actions">
          <ErpButton type="button" onClick={load}>
            Apply
          </ErpButton>
        </div>
      </div>

      {loading ? (
        <div className="erp-card empty">Loading resources…</div>
      ) : !items.length ? (
        <div className="erp-card empty">No resources found.</div>
      ) : list.noMatch ? (
        <div className="erp-card empty">No resources match that search.</div>
      ) : (
        <div className="grid two">
          {list.items.map((r) => (
            <div key={r._id} className="erp-card stack">
              <span className="badge">{titleCase(r.type)}</span>
              <h3 style={{ margin: 0 }}>{r.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {r.subjectId?.name} · {r.level} · {r.topic || '—'}
              </p>
              {r.description && <p>{r.description}</p>}
              <p className="muted">
                {r.accessType === 'paid' ? money(r.price, r.currency) : 'Free'}
                {r.downloadableUntil && ` · until ${new Date(r.downloadableUntil).toLocaleDateString()}`}
              </p>
              {r.fileUrl && (
                <a className="erp-link" href={mediaUrl(r.fileUrl)} target="_blank" rel="noreferrer">
                  Open file
                </a>
              )}
              {r.accessType === 'paid' && !r.purchased && (
                <button
                  className="btn"
                  type="button"
                  onClick={async () => {
                    try {
                      await purchaseResource(r._id);
                      window.location.href = '/student/payments';
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Buy
                </button>
              )}
              {(r.purchased || r.accessType !== 'paid') && r.downloadOpen && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={async () => {
                    try {
                      const d = await downloadResource(r._id);
                      window.open(mediaUrl(d.fileUrl), '_blank', 'noopener');
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Download
                </button>
              )}
              {bookmarkedIds.has(r._id) ? (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={async () => {
                    try {
                      await unbookmarkResource(r._id);
                      load();
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Remove bookmark
                </button>
              ) : (
                <button
                  className="btn"
                  type="button"
                  onClick={async () => {
                    try {
                      await bookmarkResource(r._id);
                      load();
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Bookmark
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {list.total > 0 && <ErpPager {...list.pagerProps} noun="resource" />}
    </div>
  );
}
