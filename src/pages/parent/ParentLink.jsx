import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { linkStudent } from '../../api';
import { useCatalog } from '../../context/CatalogContext';
import { ErpButton, ErpCard, ErpPageHeader, ErpSelect } from '../../components/erp';

export default function ParentLink() {
  const navigate = useNavigate();
  const { options } = useCatalog();
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('parent');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Connect using the student phone number registered on the platform."
        actions={
          <Link to="/parent/children" className="btn secondary">
            Back to children
          </Link>
        }
      />

      {error && <div className="error-banner">{error}</div>}

      <ErpCard>
        <form
          className="erp-form-grid"
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
            options={options('relationship')}
            onChange={(e) => setRelationship(e.target.value)}
          />
          <div className="row">
            <ErpButton type="submit" disabled={saving}>
              {saving ? 'Linking…' : 'Link student'}
            </ErpButton>
            <Link to="/parent/children" className="btn secondary">
              Cancel
            </Link>
          </div>
        </form>
      </ErpCard>
    </div>
  );
}
