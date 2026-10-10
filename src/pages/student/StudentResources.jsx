import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { errorMessage } from '../../utils/errors';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpEmptyState,
  ErpLoadingState,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpTabs,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { useCatalog } from '../../context/CatalogContext';
import { RATING_OPTIONS, subjectFilterOptions, titleCase } from './studentOptions';
import { formatDay } from './studentTime';
import { FavButton, LinkButton } from './studentUi';
import './student.css';
import { mediaUrl } from '../../utils/mediaUrl';

const PAGE_SIZE = 24;

export default function StudentResources() {
  const location = useLocation();
  const navigate = useNavigate();
  const paymentsPath = location.pathname.startsWith('/parent') ? '/parent/payments' : '/student/payments';
  const { options } = useCatalog();
  const [subjects, setSubjects] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [bookmarks, setBookmarks] = useState([]);
  const [filters, setFilters] = useState({ subjectId: '', type: '' });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [pendingInvoice, setPendingInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const reqId = useRef(0);

  const begin = () => {
    setError('');
    setMsg('');
    setPendingInvoice(null);
  };

  const loadBookmarks = async () => {
    const bm = await myBookmarks();
    setBookmarks(Array.isArray(bm) ? bm : bm?.items || []);
  };

  const load = async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const [res] = await Promise.all([
        listResources({ ...filters, search: query, page, limit: PAGE_SIZE }),
        loadBookmarks(),
      ]);
      if (id !== reqId.current) return;
      setItems(res.items || []);
      setTotal(res.total ?? (res.items || []).length);
    } catch (err) {
      if (id === reqId.current) setError(errorMessage(err));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  };

  useEffect(() => {
    listSubjects()
      .then((d) => setSubjects(d.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [filters.subjectId, filters.type, query]);

  useEffect(() => {
    load();
  }, [filters.subjectId, filters.type, query, page]);

  const bookmarkedIds = new Set(bookmarks.map((b) => String(b.resourceId?._id || b.resourceId || '')));

  const saved = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookmarks
      .map((b) => b.resourceId)
      .filter((r) => r && r._id)
      .filter((r) => !filters.subjectId || String(r.subjectId?._id || r.subjectId) === filters.subjectId)
      .filter((r) => !filters.type || r.type === filters.type)
      .filter(
        (r) =>
          !q ||
          [r.title, r.topic, r.chapter, r.subjectId?.name, r.type, r.level].filter(Boolean).join(' ').toLowerCase().includes(q)
      );
  }, [bookmarks, search, filters.subjectId, filters.type]);

  const shown = tab === 'saved' ? saved : items;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const refreshAfterChange = () => (tab === 'saved' ? loadBookmarks().catch(() => {}) : load());

  const buy = async (r) => {
    begin();
    setBusyId(r._id);
    try {
      const res = await purchaseResource(r._id);
      const pay = res?.payment;
      if (res?.existing || (pay && pay.status !== 'paid')) {
        setPendingInvoice({ title: r.title, payment: pay });
      } else {
        navigate(paymentsPath, {
          state: { msg: `Invoice created for ${r.title}.`, paymentId: pay?._id },
        });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  const typeIcon = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('video')) return 'video';
    if (t.includes('paper') || t.includes('scheme')) return 'clipboard-check';
    if (t.includes('note')) return 'book-open';
    return 'file-text';
  };

  return (
    <div className="page stack st-page">
      <ErpPageHeader subtitle="Notes, past papers, markschemes and other study files from tutors." />
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}
      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}
      {pendingInvoice && (
        <ErpBanner
          variant="warning"
          title={`Invoice pending for ${pendingInvoice.title}`}
          actions={
            <LinkButton to={paymentsPath} state={{ paymentId: pendingInvoice.payment?._id }} size="sm" icon="credit-card">
              Pay
            </LinkButton>
          }
          onDismiss={() => setPendingInvoice(null)}
        >
          {pendingInvoice.payment
            ? `${money(pendingInvoice.payment.amount, pendingInvoice.payment.currency)} to unlock this file.`
            : 'Pay the invoice to unlock this file.'}
        </ErpBanner>
      )}

      <ErpTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: 'Library', count: total },
          { value: 'saved', label: 'Saved', count: bookmarkedIds.size },
        ]}
      />

      <div className="st-filter-bar">
        <ErpSearch value={search} onChange={setSearch} placeholder="Search title, topic or chapter" />
        <ErpSelect
          inline
          aria-label="Type"
          value={filters.type}
          options={options('resource_type', { all: 'All types' })}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        />
        <ErpSelect
          inline
          aria-label="Subject"
          value={filters.subjectId}
          options={subjectFilterOptions(subjects)}
          onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value }))}
        />
      </div>

      {loading && tab === 'all' ? (
        <ErpLoadingState message="Loading resources…" />
      ) : !shown.length ? (
        <div className="erp-card">
          <ErpEmptyState
            icon={tab === 'saved' ? 'heart' : 'folder'}
            title={
              tab === 'saved' ? 'No saved resources' : query ? 'No resources match that search' : 'No resources found'
            }
            description={
              tab === 'saved'
                ? 'Save files from the library to find them quickly here.'
                : 'Try a different subject or type.'
            }
            action={
              tab === 'saved' ? (
                <ErpButton variant="secondary" onClick={() => setTab('all')}>
                  Browse library
                </ErpButton>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="st-resource-grid">
          {shown.map((r) => {
            const locked = r.accessType === 'paid' && !r.purchased;
            const saved = bookmarkedIds.has(r._id);
            const reviews = (r.reviews || []).length;
            return (
              <article key={r._id} className="erp-card st-resource">
                <div className="st-resource-body">
                  <div className="st-resource-top">
                    <span className={`st-leading-icon${locked ? ' is-neutral' : ''}`}>
                      <Icon name={locked ? 'lock' : typeIcon(r.type)} size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="st-resource-title">{r.title}</h3>
                      <div className="st-badges" style={{ marginTop: '0.375rem' }}>
                        <span className="erp-tag">{titleCase(r.type)}</span>
                        {locked ? (
                          <ErpBadge tone="warning">Paid</ErpBadge>
                        ) : r.accessType === 'paid' ? (
                          <ErpBadge tone="success" icon="check">
                            Purchased
                          </ErpBadge>
                        ) : (
                          <ErpBadge tone="success">Free</ErpBadge>
                        )}
                      </div>
                    </div>
                    <FavButton
                      on={saved}
                      label={saved ? 'Remove from saved' : 'Save resource'}
                      onClick={async () => {
                        begin();
                        try {
                          if (saved) await unbookmarkResource(r._id);
                          else await bookmarkResource(r._id);
                          await loadBookmarks();
                        } catch (err) {
                          setError(errorMessage(err));
                        }
                      }}
                    />
                  </div>
                  <p className="st-item-meta">
                    {[r.subjectId?.name, r.level, r.topic, r.chapter, r.academicYear].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {r.description && <p className="st-item-desc">{r.description}</p>}
                  <p className="st-item-meta">
                    {reviews > 0 && (
                      <span>
                        <Icon name="star" size={14} />
                        {reviews} review{reviews === 1 ? '' : 's'}
                      </span>
                    )}
                    <span>
                      <Icon name="clock" size={14} />
                      {r.downloadableUntil ? `Available until ${formatDay(r.downloadableUntil)}` : 'Linked to this document'}
                    </span>
                  </p>
                </div>
                <div className="st-resource-foot">
                  <span className="st-price-value">{r.accessType === 'paid' ? money(r.price, r.currency) : 'Free'}</span>
                  <div className="row">
                    <ErpButton
                      variant="ghost"
                      size="sm"
                      icon="pencil"
                      onClick={() => {
                        begin();
                        setReview({ id: r._id, title: r.title, rating: 5, comment: '' });
                      }}
                    >
                      Review
                    </ErpButton>
                    {r.fileUrl && (
                      <a className="erp-btn-secondary erp-btn-sm" href={mediaUrl(r.fileUrl)} target="_blank" rel="noreferrer">
                        <Icon name="eye" size={15} />
                        Open
                      </a>
                    )}
                    {locked && (
                      <ErpButton size="sm" loading={busyId === r._id} onClick={() => buy(r)}>
                        {busyId === r._id ? 'Working…' : 'Buy'}
                      </ErpButton>
                    )}
                    {!locked && r.downloadOpen && (
                      <ErpButton
                        size="sm"
                        variant={r.fileUrl ? 'secondary' : 'primary'}
                        icon="download"
                        onClick={async () => {
                          begin();
                          try {
                            const d = await downloadResource(r._id);
                            window.open(mediaUrl(d.fileUrl), '_blank', 'noopener');
                          } catch (err) {
                            setError(errorMessage(err));
                          }
                        }}
                      >
                        Download
                      </ErpButton>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {tab === 'all' && total > 0 && (
        <div className="erp-card erp-card-flush">
          <ErpPager
            page={page}
            pages={pages}
            total={total}
            noun="resource"
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(pages, p + 1))}
          />
        </div>
      )}

      <ErpModal
        open={Boolean(review)}
        title="Review this document"
        onClose={() => setReview(null)}
        footer={
          review ? (
            <>
              <ErpButton variant="secondary" onClick={() => setReview(null)}>
                Cancel
              </ErpButton>
              <ErpButton
                onClick={async () => {
                  begin();
                  try {
                    await reviewResource(review.id, {
                      rating: Number(review.rating),
                      comment: review.comment,
                      suggestion: review.comment,
                    });
                    setReview(null);
                    setMsg('Review saved on this document.');
                    refreshAfterChange();
                  } catch (err) {
                    setError(errorMessage(err));
                  }
                }}
              >
                Save review
              </ErpButton>
            </>
          ) : null
        }
      >
        {review && (
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              {review.title}
            </p>
            <ErpSelect
              label="Rating"
              value={String(review.rating)}
              options={RATING_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
              onChange={(e) => setReview((f) => ({ ...f, rating: e.target.value }))}
            />
            <ErpTextarea
              label="Comment or suggested change"
              rows={4}
              value={review.comment}
              onChange={(e) => setReview((f) => ({ ...f, comment: e.target.value }))}
            />
          </div>
        )}
      </ErpModal>
    </div>
  );
}
