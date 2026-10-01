import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listChildren } from '../../api';
import { ErpCard, ErpPageHeader, ErpSelect } from '../../components/erp';
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
        <ErpPageHeader subtitle="Book a tutor for a linked child." />
        <ErpCard>
          <div className="empty">
            Link a child before you search. <Link to="/parent/children/link">Link a child</Link> with their registered
            phone.
          </div>
        </ErpCard>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="avail-bar">
        <ErpSelect
          inline
          value={childId}
          options={children.map((c) => ({
            value: String(c.studentUserId?._id || c.studentUserId),
            label: `Book for ${c.studentUserId?.name || 'child'}`,
          }))}
          onChange={(e) => setChildId(e.target.value)}
        />
      </div>
      {childId ? (
        <StudentTutors profileBase={`/parent/tutors/${childId}`} />
      ) : (
        <ErpCard>
          <div className="empty">Select a child to search tutors.</div>
        </ErpCard>
      )}
    </div>
  );
}
