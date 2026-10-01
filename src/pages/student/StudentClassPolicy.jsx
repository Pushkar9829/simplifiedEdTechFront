import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ErpPageHeader, ErpTabs } from '../../components/erp';

const SECTIONS = [
  { value: 'student', label: 'Your reschedule' },
  { value: 'tutor', label: 'Tutor reschedule' },
  { value: 'cancel', label: 'Cancel / no-show' },
  { value: 'other', label: 'Other rules' },
];

export default function StudentClassPolicy() {
  const location = useLocation();
  const bookingsPath = location.pathname.startsWith('/parent') ? '/parent/bookings' : '/student/bookings';
  const [tab, setTab] = useState('student');

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Official Scholaris policy. A change counts only after it is confirmed in this app."
        actions={
          <Link to={bookingsPath} className="btn">
            Open bookings
          </Link>
        }
      />

      <div className="avail-bar">
        <ErpTabs value={tab} onChange={setTab} tabs={SECTIONS} />
      </div>

      {tab === 'student' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Student or parent reschedule</h2>
          <ol className="policy-list">
            <li>You may request one reschedule per calendar month. Unused months do not carry forward.</li>
            <li>Submit the request in this app. It goes to the assigned tutor to confirm available slots.</li>
            <li>Pick one of the slots the tutor offers. The class is official only after that confirmation.</li>
            <li>If the tutor has no slot, the original time stays unless you both agree another arrangement.</li>
            <li>You may then request a replacement tutor at no extra payment. That tutor must approve.</li>
            <li>Ask at least 24 hours before the class when you can.</li>
          </ol>
        </section>
      )}

      {tab === 'tutor' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Tutor reschedule</h2>
          <ol className="policy-list">
            <li>The tutor offers alternative slots in the app. You select one.</li>
            <li>This does not use your monthly student entitlement and does not add a charge.</li>
          </ol>
        </section>
      )}

      {tab === 'cancel' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Cancellation and no-show</h2>
          <ol className="policy-list">
            <li>Cancel in this app. With 24 hours’ notice the usual remedy is a reschedule, not a cash refund.</li>
            <li>Under 24 hours, the class may be treated as consumed unless Scholaris approves an exception.</li>
            <li>A student no-show may be treated as consumed. A tutor no-show does not take your class.</li>
            <li>A tutor cancel does not use your monthly reschedule. Scholaris may reassign or credit the class.</li>
          </ol>
        </section>
      )}

      {tab === 'other' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Other rules</h2>
          <ul className="policy-list">
            <li>Technical problems on the Scholaris platform or the tutor’s connection can be rescheduled without using your monthly limit.</li>
            <li>WhatsApp, SMS, email or phone changes are unofficial until recorded in this app.</li>
            <li>Rescheduling does not create a refund by itself.</li>
            <li>Scholaris may allow an extra change for a genuine emergency.</li>
          </ul>
          <p className="muted" style={{ margin: 0 }}>© Scholaris · All rights reserved</p>
        </section>
      )}
    </div>
  );
}
