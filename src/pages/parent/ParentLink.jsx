import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { linkStudent } from '../../api';
import { ErpSelect } from '../../components/erp';
import { RELATIONSHIP_OPTIONS } from './parentOptions';

export default function ParentLink() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('parent');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Link child</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Connect using the student phone number registered on the platform.
          </p>
        </div>
        <Link to="/parent/children" className="btn secondary">
          Back to children
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form
        className="erp-card grid two"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError('');
          try {
            await linkStudent({ studentPhone: phone, relationship });
            navigate('/parent/children');
          } catch (err) {
            setError(err.message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="field">
          <label>Student phone</label>
          <input
            className="erp-search"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 7777777777"
            required
          />
        </div>
        <ErpSelect
          label="Relationship"
          value={relationship}
          options={RELATIONSHIP_OPTIONS}
          onChange={(e) => setRelationship(e.target.value)}
        />
        <div className="row">
          <button className="btn" disabled={saving}>
            {saving ? 'Linking…' : 'Link student'}
          </button>
          <Link to="/parent/children" className="btn secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
