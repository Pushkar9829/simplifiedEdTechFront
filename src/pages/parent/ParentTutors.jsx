import { Link } from 'react-router-dom';
import {
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpLoadingState,
  ErpPageHeader,
} from '../../components/erp';
import { childLabel, useParentChild } from '../../context/ParentChildContext';
import StudentTutors from '../student/StudentTutors';
import BookingForBar from './BookingForBar';
import { firstName } from './parentData';

export default function ParentTutors() {
  const { children, selectedChildId, selectedChild, setSelectedChildId, loading, error, refreshChildren } =
    useParentChild();

  if (loading && !children.length) {
    return <ErpLoadingState message="Loading your children…" />;
  }

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

  if (!children.length) {
    return (
      <div className="page stack">
        <ErpPageHeader subtitle="Book a tutor for a linked child." />
        <ErpCard>
          <ErpEmptyState
            icon="users"
            title="Link a child before you search"
            description="Classes are booked for a specific child. Link them with the phone number they registered with."
            action={
              <Link to="/parent/children/link" className="erp-btn-primary">
                Link a child
              </Link>
            }
          />
        </ErpCard>
      </div>
    );
  }

  const childFirst = selectedChild ? firstName(childLabel(selectedChild)) : '';

  return (
    <div className="page stack">
      <BookingForBar
        links={children}
        selectedId={selectedChildId}
        onChange={setSelectedChildId}
        help={
          childFirst
            ? `Classes you book here are scheduled for ${childFirst}; invoices are billed to you.`
            : 'Choose which child you are booking for.'
        }
      />
      {selectedChildId ? (
        <StudentTutors profileBase={`/parent/tutors/${selectedChildId}`} />
      ) : (
        <ErpCard>
          <ErpEmptyState icon="user" title="Select a child to search tutors" />
        </ErpCard>
      )}
    </div>
  );
}
