import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './erp';
import { usePreferredCurrency } from '../utils/displayMoney';

/**
 * Small chip showing the viewer's preferred display currency, linking to their profile.
 * When none is set it becomes a prompt ("Set currency"). Catalog prices add an
 * "≈ converted" hint in this currency; invoices are charged in this currency.
 */
export default function CurrencyChip({ to, className = '' }) {
  const { user } = useAuth();
  const currency = usePreferredCurrency();
  const href = to || `/${user?.role || 'student'}/profile`;
  const label = currency
    ? `Invoices charge in ${currency}; catalog prices show an ≈ amount`
    : 'Set your preferred currency';
  return (
    <Link
      to={href}
      className={`erp-currency-chip${currency ? '' : ' is-empty'}${className ? ` ${className}` : ''}`}
      title={label}
      aria-label={label}
    >
      <Icon name={currency ? 'globe' : 'plus'} size={13} />
      <span>{currency || 'Set currency'}</span>
    </Link>
  );
}
