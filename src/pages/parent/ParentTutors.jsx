import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listChildren } from '../../api';
import { ErpSelect } from '../../components/erp';
import StudentTutors from '../student/StudentTutors';

export default function ParentTutors() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listChildren()
      .then((rows) => {
        const list = rows || [];
        setChildren(list);
        const first = list[0]?.studentUserId?._id || list[0]?.studentUserId;
        if (first) setChildId(String(first));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="empty">Loading children…</div>;
  }

  if (!children.length) {
    return (
      <div className="page stack">
        <h1>Find a tutor</h1>
        <div className="erp-card empty">
          Link a child before you search.{' '}
          <Link to="/parent/children/link">Link a child</Link> with their registered phone.
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="erp-card">
        <ErpSelect
          label="Book for child"
          value={childId}
          options={children.map((c) => ({
            value: String(c.studentUserId?._id || c.studentUserId),
            label: c.studentUserId?.name || 'Child',
          }))}
          onChange={(e) => setChildId(e.target.value)}
        />
      </div>
      {childId ? (
        <StudentTutors profileBase={`/parent/tutors/${childId}`} />
      ) : (
        <div className="erp-card empty">Select a child to search tutors.</div>
      )}
    </div>
  );
}
