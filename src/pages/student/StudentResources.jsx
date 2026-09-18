import { useEffect, useState } from 'react';
import {
  bookmarkResource,
  listResources,
  listSubjects,
  myBookmarks,
  unbookmarkResource,
} from '../../api';
import { ErpSelect } from '../../components/erp';
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

      <form
        className="erp-card row"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <ErpSelect
          inline
          value={filters.subjectId}
          options={subjectFilterOptions(subjects)}
          onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value }))}
        />
        <ErpSelect
          inline
          value={filters.type}
          options={resourceTypeOptions(true)}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        />
        <input
          className="erp-search"
          placeholder="Search"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          style={{ flex: 1 }}
        />
        <button className="btn">Filter</button>
      </form>

      {loading ? (
        <div className="erp-card empty">Loading resources…</div>
      ) : !items.length ? (
        <div className="erp-card empty">No resources found.</div>
      ) : (
        <div className="grid two">
          {items.map((r) => (
            <div key={r._id} className="erp-card stack">
              <span className="badge">{titleCase(r.type)}</span>
              <h3 style={{ margin: 0 }}>{r.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {r.subjectId?.name} · {r.level} · {r.topic || '—'}
              </p>
              {r.description && <p>{r.description}</p>}
              {r.fileUrl && (
                <a className="erp-link" href={mediaUrl(r.fileUrl)} target="_blank" rel="noreferrer">
                  Open file
                </a>
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
    </div>
  );
}
