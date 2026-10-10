import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErpBanner, ErpButton, ErpCard, ErpEmptyState, ErpLoadingState } from '../../components/erp';
import { childLabel, useParentChild } from '../../context/ParentChildContext';
import StudentTutorDetail from '../student/StudentTutorDetail';
import BookingForBar from './BookingForBar';
import { childIdOf, firstName } from './parentData';

export default function ParentTutorDetail() {
  const { childId, id } = useParams();
  const navigate = useNavigate();
  const { children, loading, error, refreshChildren, selectedChildId, setSelectedChildId } = useParentChild();
  const link = children.find((c) => childIdOf(c) === String(childId));
  const synced = useRef('');

  // The URL decides the child on arrival; after that, switching child (here or in the top bar)
  // moves to the same tutor profile for the newly selected child.
  useEffect(() => {
    if (!link) return;
    if (synced.current !== String(childId)) {
      synced.current = String(childId);
      if (selectedChildId !== String(childId)) setSelectedChildId(childId);
      return;
    }
    if (selectedChildId && selectedChildId !== String(childId)) {
      navigate(`/parent/tutors/${selectedChildId}/${id}`, { replace: true });
    }
  }, [link, childId, id, selectedChildId, setSelectedChildId, navigate]);

  if (loading && !children.length) return <ErpLoadingState message="Loading your children…" />;

  if (error && !children.length) {
    return (
      <div className="page stack">
        <ErpBanner
          variant="danger"
          title="Could not load your children"
          actions={
            <ErpButton variant="secondary" size="sm" icon="refresh" onClick={() => refreshChildren()}>
              Retry
            </ErpButton>
          }
        >
          {error}
        </ErpBanner>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="page stack">
        <ErpCard>
          <ErpEmptyState
            icon="user"
            title="This child is not linked to your account"
            description="Pick one of your linked children and open the tutor again."
            action={
              <Link to="/parent/tutors" className="erp-btn-secondary">
                Back to tutors
              </Link>
            }
          />
        </ErpCard>
      </div>
    );
  }

  const name = childLabel(link);

  return (
    <div className="page stack">
      <BookingForBar
        links={children}
        selectedId={String(childId)}
        onChange={setSelectedChildId}
        help={`Any class or course you book on this page is for ${firstName(name) || name}.`}
      />
      <StudentTutorDetail
        key={String(childId)}
        studentUserId={String(childId)}
        childName={name}
        paymentsPath="/parent/payments"
        walletPath="/parent/wallet"
        backPath="/parent/tutors"
      />
    </div>
  );
}
