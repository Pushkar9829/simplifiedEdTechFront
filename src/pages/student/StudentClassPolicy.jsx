import { useLocation } from 'react-router-dom';
import { ErpBanner, ErpCard, ErpPageHeader, Icon } from '../../components/erp';
import { LinkButton } from './studentUi';
import './student.css';

function PolicyCard({ icon, title, description, children }) {
  return (
    <ErpCard
      heading={
        <span className="row" style={{ gap: '0.625rem', flexWrap: 'nowrap' }}>
          <span className="erp-attention-icon is-brand">
            <Icon name={icon} size={16} />
          </span>
          {title}
        </span>
      }
      description={description}
    >
      {children}
    </ErpCard>
  );
}

export default function StudentClassPolicy() {
  const location = useLocation();
  const isParent = location.pathname.startsWith('/parent');
  const bookingsPath = isParent ? '/parent/bookings' : '/student/bookings';
  const your = isParent ? 'your child’s' : 'your';

  return (
    <div className="page stack st-page">
      <ErpPageHeader
        subtitle="Official Scholaris policy. A change counts only after it is confirmed in this app."
        actions={
          <LinkButton to={bookingsPath} icon="calendar">
            Open bookings
          </LinkButton>
        }
      />

      <ErpBanner variant="info" title="The short version">
        {isParent ? 'Your child gets' : 'You get'} one reschedule per calendar month. Give 24 hours’ notice where you
        can. Changes agreed over WhatsApp, SMS, email or phone only count once confirmed in the app.
      </ErpBanner>

      <div className="st-policy-grid">
        <PolicyCard
          icon="refresh"
          title={isParent ? 'Your child’s reschedule' : 'Your reschedule'}
          description="Student or parent initiated"
        >
          <ol className="st-steps">
            <li>
              {isParent ? 'Your child (or you on their behalf) may' : 'You may'} request one reschedule per calendar
              month. Unused months do not carry forward.
            </li>
            <li>Submit the request in this app. It goes to the assigned tutor to confirm available slots.</li>
            <li>Pick one of the slots the tutor offers. The class is official only after that confirmation.</li>
            <li>If the tutor has no slot, the original time stays unless you both agree another arrangement.</li>
            <li>You may then request a replacement tutor at no extra payment. That tutor must approve.</li>
            <li>Ask at least 24 hours before the class when you can.</li>
          </ol>
        </PolicyCard>

        <div className="st-split-main">
          <PolicyCard icon="user" title="Tutor reschedule" description="When the tutor needs to move a class">
            <ol className="st-steps">
              <li>The tutor offers alternative slots in the app. You select one.</li>
              <li>This does not use {your} monthly student entitlement and does not add a charge.</li>
            </ol>
          </PolicyCard>

          <PolicyCard icon="x-circle" title="Cancellation and no-show">
            <ol className="st-steps">
              <li>Cancel in this app. With 24 hours’ notice the usual remedy is a reschedule, not a cash refund.</li>
              <li>Under 24 hours, the class may be treated as consumed unless Scholaris approves an exception.</li>
              <li>A student no-show may be treated as consumed. A tutor no-show does not take {your} class.</li>
              <li>A tutor cancel does not use {your} monthly reschedule. Scholaris may reassign or credit the class.</li>
            </ol>
          </PolicyCard>
        </div>
      </div>

      <PolicyCard icon="info" title="Other rules">
        <ul className="st-steps is-bullets">
          <li>
            Technical problems on the Scholaris platform or the tutor’s connection can be rescheduled without using{' '}
            {your} monthly limit.
          </li>
          <li>WhatsApp, SMS, email or phone changes are unofficial until recorded in this app.</li>
          <li>Rescheduling does not create a refund by itself.</li>
          <li>Scholaris may allow an extra change for a genuine emergency.</li>
        </ul>
        <p className="muted" style={{ margin: '1rem 0 0' }}>
          © Scholaris · All rights reserved
        </p>
      </PolicyCard>
    </div>
  );
}
