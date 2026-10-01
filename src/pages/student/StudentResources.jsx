import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  bookmarkResource,
  downloadResource,
  listResources,
  listSubjects,
  myBookmarks,
  purchaseResource,
  reviewResource,
  unbookmarkResource,
} from '../../api';
import { money } from '../../utils/format';
import { ErpButton, ErpCard, ErpModal, ErpPager, ErpPageHeader, ErpSearch, ErpSelect, ErpTabs } from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { useCatalog } from '../../context/CatalogContext';
import { RATING_OPTIONS, subjectFilterOptions, titleCase } from './studentOptions';
import { mediaUrl } from '../../utils/mediaUrl';

export default function StudentResources() {
  const location = useLocation();
  const paymentsPath = location.pathname.startsWith('/parent') ? '/parent/payments' : '/student/payments';
  const { options } = useCatalog();
  const [subjects, setSubjects] = useState([]);
  const [items, setItems] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [filters, setFilters] = useState({ subjectId: '', type: '' });
  const [tab, setTab] = useState('all');
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (next = filters) => {
    setLoading(true);
    setError('');
    try {
      const [res, bm] = await Promise.all([listResources(next), myBookmarks()]);
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
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters.subjectId, filters.type]);

  const bookmarkedIds = new Set(
    bookmarks.map((b) => (b.resourceId?._id || b.resourceId || '').toString())
  );
  const shown = tab === 'saved' ? items.filter((r) => bookmarkedIds.has(r._id)) : items;
  const list = useListFilter(
    shown,
    (r) => [r.title, r.topic, r.chapter, r.subjectId?.name, r.type, r.level].filter(Boolean).join(' '),
    { resetKey: tab }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Notes, past papers, markschemes, and other files from tutors." />
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'saved', label: `Saved (${bookmarkedIds.size})` },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search resources" />
        <ErpSelect
          inline
          value={filters.type}
          options={options('resource_type', { all: 'All types' })}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        />
        <ErpSelect
          inline
          value={filters.subjectId}
          options={subjectFilterOptions(subjects)}
          onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value }))}
        />
      </div>

      {loading ? (
        <ErpCard className="empty">Loading resources…</ErpCard>
      ) : !shown.length ? (
        <ErpCard className="empty">{tab === 'saved' ? 'No saved resources.' : 'No resources found.'}</ErpCard>
      ) : list.noMatch ? (
        <ErpCard className="empty">No resources match that search.</ErpCard>
      ) : (
        <div className="tutor-card-grid">
          {list.items.map((r) => (
            <article key={r._id} className="erp-card tutor-card">
              <div className="tutor-card-top">
                <div className="tutor-card-id">
                  <h3>
                    {r.title}
                    <span className="erp-chip erp-chip-open">{titleCase(r.type)}</span>
                    {r.accessType === 'paid' && !r.purchased && (
                      <span className="erp-chip erp-chip-offline">Paid</span>
                    )}
                    {(r.purchased || r.accessType !== 'paid') && (
                      <span className="erp-chip erp-chip-online">Open</span>
                    )}
                  </h3>
                  <p className="muted">
                    {[r.subjectId?.name, r.level, r.topic, r.chapter, r.academicYear].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              </div>
              {r.description && <p style={{ margin: 0, padding: '0 1rem' }}>{r.description}</p>}
              <div className="tutor-card-stats">
                <span className="tutor-card-stat">
                  {r.accessType === 'paid' ? money(r.price, r.currency) : 'Free'}
                </span>
                {(r.reviews || []).length > 0 && (
                  <span className="tutor-card-stat tutor-card-stat-rating">
                    ★ {(r.reviews || []).length} reviews
                  </span>
                )}
              </div>
              <div className="tutor-card-foot">
                <span className="muted">
                  {r.downloadableUntil
                    ? `Until ${new Date(r.downloadableUntil).toLocaleDateString()}`
                    : 'Linked to this document'}
                </span>
                <div className="row">
                  {r.fileUrl && (
                    <a className="erp-btn-secondary" href={mediaUrl(r.fileUrl)} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  )}
                  {r.accessType === 'paid' && !r.purchased && (
                    <ErpButton
                      onClick={async () => {
                        try {
                          await purchaseResource(r._id);
                          window.location.href = paymentsPath;
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      Buy
                    </ErpButton>
                  )}
                  {(r.purchased || r.accessType !== 'paid') && r.downloadOpen && (
                    <ErpButton
                      variant="secondary"
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
                    </ErpButton>
                  )}
                  <ErpButton
                    variant="secondary"
                    onClick={() => setReview({ id: r._id, title: r.title, rating: 5, comment: '' })}
                  >
                    Review
                  </ErpButton>
                  <ErpButton
                    variant="secondary"
                    className={bookmarkedIds.has(r._id) ? 'tutor-card-fav is-on' : ''}
                    onClick={async () => {
                      try {
                        if (bookmarkedIds.has(r._id)) await unbookmarkResource(r._id);
                        else await bookmarkResource(r._id);
                        load();
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  >
                    {bookmarkedIds.has(r._id) ? '★ Saved' : '☆ Save'}
                  </ErpButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {list.total > 0 && <ErpPager {...list.pagerProps} noun="resource" />}

      <ErpModal
        open={Boolean(review)}
        title="Review this document"
        onClose={() => setReview(null)}
        footer={
          review ? (
            <ErpButton
              onClick={async () => {
                try {
                  await reviewResource(review.id, {
                    rating: Number(review.rating),
                    comment: review.comment,
                    suggestion: review.comment,
                  });
                  setReview(null);
                  setMsg('Review saved on this document.');
                  load();
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Save review
            </ErpButton>
          ) : null
        }
      >
        {review && (
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>{review.title}</p>
            <ErpSelect
              label="Rating"
              value={String(review.rating)}
              options={RATING_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
              onChange={(e) => setReview((f) => ({ ...f, rating: e.target.value }))}
            />
            <div className="field">
              <label>Comment or suggested change</label>
              <textarea
                className="erp-search"
                rows={4}
                value={review.comment}
                onChange={(e) => setReview((f) => ({ ...f, comment: e.target.value }))}
              />
            </div>
          </div>
        )}
      </ErpModal>
    </div>
  );
}
