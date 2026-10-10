import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { linkStudent } from '../../api';
import { useCatalog } from '../../context/CatalogContext';
import { useParentChild } from '../../context/ParentChildContext';
import { errorMessage } from '../../utils/errors';
import { ErpBanner, ErpButton, ErpCard, ErpInput, ErpPageHeader, ErpSelect, Icon } from '../../components/erp';
import './parent.css';

const BENEFITS = [
  {
    icon: 'calendar',
    title: 'Book and manage classes',
    text: 'Find verified tutors, book sessions and reschedule on your child’s behalf.',
  },
  {
    icon: 'credit-card',
    title: 'Pay invoices in one place',
    text: 'See what’s outstanding per child and pay from your own account or wallet.',
  },
  {
    icon: 'trending-up',
    title: 'Follow progress',
    text: 'Attendance, homework, scores and predicted IB grades on your dashboard.',
  },
  {
    icon: 'lock',
    title: 'Your child keeps their own login',
    text: 'Linking doesn’t change their account; they continue to sign in as usual.',
  },
];

export default function ParentLink() {
  const navigate = useNavigate();
  const { options } = useCatalog();
  const { refreshChildren, setSelectedChildId } = useParentChild();
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('parent');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const link = await linkStudent({ studentPhone: phone.trim(), relationship });
      const list = await refreshChildren();
      const newId = String(link?.studentUserId?._id || link?.studentUserId || '');
      const found = (list || []).find((c) => String(c.studentUserId?._id || c.studentUserId) === newId);
      if (newId) setSelectedChildId(newId);
      const name = found?.studentUserId?.name;
      navigate('/parent/children', {
        state: { msg: name ? `${name} is now linked to your account.` : 'Child linked to your account.' },
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Connect your child’s student account to book, pay and follow their progress."
        actions={
          <Link to="/parent/children" className="erp-btn-ghost">
            <Icon name="arrow-left" size={16} />
            Back to children
          </Link>
        }
      />

      <div className="pl-layout">
        <ErpCard heading="Link a child" description="Your child must already have a student account on IBDP Tutoring.">
          <form className="pl-form" onSubmit={onSubmit}>
            {error ? (
              <ErpBanner variant="danger" onDismiss={() => setError('')}>
                {error}
              </ErpBanner>
            ) : null}
            <ErpInput
              label="Student phone number"
              name="studentPhone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 7777777777"
              helper="The number your child registered with — digits only, no spaces."
              required
              autoFocus
            />
            <ErpSelect
              label="Your relationship"
              value={relationship}
              options={options('relationship')}
              onChange={(e) => setRelationship(e.target.value)}
              helper="Shown to tutors when you book or message on your child’s behalf."
            />
            <div className="pl-form-actions">
              <Link to="/parent/children" className="erp-btn-secondary">
                Cancel
              </Link>
              <ErpButton type="submit" icon="link" loading={saving} disabled={!phone.trim()}>
                {saving ? 'Linking…' : 'Link child'}
              </ErpButton>
            </div>
          </form>
        </ErpCard>

        <ErpCard heading="What linking does">
          <ul className="pl-steps">
            {BENEFITS.map((b) => (
              <li key={b.title}>
                <span className="erp-attention-icon">
                  <Icon name={b.icon} size={16} />
                </span>
                <span>
                  <strong>{b.title}</strong>
                  <span className="pl-step-text">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </ErpCard>
      </div>
    </div>
  );
}
