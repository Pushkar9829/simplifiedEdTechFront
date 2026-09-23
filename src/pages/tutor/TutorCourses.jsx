import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteCourse, listMyCourses, publishCourse } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpList,
  ErpListItem,
  ErpOverflow,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { money } from '../../utils/format';
import { titleCase } from './tutorOptions';

export default function TutorCourses() {
  const phone = useIsPhone();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const [tab, setTab] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const r = await listMyCourses();
      setItems(Array.isArray(r) ? r : r?.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = tab === 'all' ? items : items.filter((c) => c.status === tab);
  const list = useListFilter(
    visible,
    (c) => [c.title, c.description, c.subjectId?.name, c.status].filter(Boolean).join(' '),
    { resetKey: tab }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Turn lesson plans into a course students can enroll in." />
      {error && <div className="error-banner">{error}</div>}
      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search courses" />
        <div className="avail-bar-actions">
          <Link to="/tutor/courses/new" className="erp-btn-primary">
            Launch course
          </Link>
        </div>
      </div>
      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading courses…</div>
        ) : !visible.length ? (
          <div className="empty">
            No courses yet. <Link to="/tutor/courses/new">Launch your first course</Link>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No courses match that search.</div>
        ) : phone ? (
          <div style={{ padding: '0.65rem' }}>
            <ErpList>
              {list.items.map((c) => (
                <ErpListItem
                  key={c._id}
                  title={c.title}
                  meta={`${c.subjectId?.name || 'Course'} · ${c.price ? money(c.price, c.currency) : 'Free'}`}
                  status={c.status}
                  statusLabel={titleCase(c.status)}
                  to={`/tutor/courses/${c._id}`}
                  actions={
                    <ErpOverflow
                      items={[
                        { label: 'View', to: `/tutor/courses/${c._id}` },
                        { label: 'Edit', to: `/tutor/courses/${c._id}/edit` },
                        c.status !== 'published' && {
                          label: 'Publish',
                          onClick: async () => {
                            try {
                              await publishCourse(c._id);
                              load();
                            } catch (err) {
                              setError(err.message);
                            }
                          },
                        },
                        { label: 'Delete', danger: true, onClick: () => setPending(c) },
                      ]}
                    />
                  }
                />
              ))}
            </ErpList>
          </div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Price</th>
                  <th>Plans</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.title}</strong>
                      {c.description && <div className="muted">{c.description}</div>}
                    </td>
                    <td>{c.subjectId?.name || '—'}</td>
                    <td>{c.price ? money(c.price, c.currency) : 'Free'}</td>
                    <td>{c.lessonPlanIds?.length || 0}</td>
                    <td>
                      <ErpStatusBadge status={c.status}>{titleCase(c.status)}</ErpStatusBadge>
                    </td>
                    <td className="row">
                      <Link to={`/tutor/courses/${c._id}`} className="erp-btn-secondary">
                        View
                      </Link>
                      {c.status !== 'published' && (
                        <ErpButton
                          variant="secondary"
                          onClick={async () => {
                            try {
                              await publishCourse(c._id);
                              load();
                            } catch (err) {
                              setError(err.message);
                            }
                          }}
                        >
                          Publish
                        </ErpButton>
                      )}
                      <Link to={`/tutor/courses/${c._id}/edit`} className="erp-btn-secondary">
                        Edit
                      </Link>
                      <ErpButton variant="danger" onClick={() => setPending(c)}>
                        Delete
                      </ErpButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="course" />}
      </ErpCard>
      <ErpConfirm
        open={Boolean(pending)}
        title="Delete course"
        message={pending ? `Delete “${pending.title}”?` : ''}
        confirmLabel="Delete"
        danger
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          try {
            await deleteCourse(pending._id);
            setPending(null);
            load();
          } catch (err) {
            setError(err.message);
            setPending(null);
          }
        }}
      />
    </div>
  );
}
