import { ErpSelect } from './erp';
import {
  defaultGradeValue,
  IB_OPTIONS,
  LETTER_OPTIONS,
  PASS_FAIL_OPTIONS,
  schemeLabel,
} from '../utils/grading';

export default function GradeInput({ scheme = 'ib_1_7', maxScore, value, onChange }) {
  const set = (next) => onChange(next);

  if (scheme === 'ib_1_7') {
    return (
      <ErpSelect
        label="IB grade (1–7)"
        value={value || defaultGradeValue(scheme)}
        options={IB_OPTIONS}
        onChange={(e) => set(e.target.value)}
      />
    );
  }
  if (scheme === 'letter') {
    return (
      <ErpSelect
        label="Letter grade"
        value={value || defaultGradeValue(scheme)}
        options={LETTER_OPTIONS}
        onChange={(e) => set(e.target.value)}
      />
    );
  }
  if (scheme === 'pass_fail') {
    return (
      <ErpSelect
        label="Result"
        value={value || defaultGradeValue(scheme)}
        options={PASS_FAIL_OPTIONS}
        onChange={(e) => set(e.target.value)}
      />
    );
  }
  if (scheme === 'percentage') {
    return (
      <div className="field">
        <label>Score (%)</label>
        <input
          className="erp-search"
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={(e) => set(e.target.value)}
        />
      </div>
    );
  }
  return (
    <div className="field">
      <label>Marks{maxScore ? ` / ${maxScore}` : ''}</label>
      <input
        className="erp-search"
        type="number"
        min="0"
        max={maxScore || undefined}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
      <div className="muted">{schemeLabel(scheme)}</div>
    </div>
  );
}
