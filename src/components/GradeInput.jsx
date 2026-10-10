import { ErpInput, ErpSelect } from './erp';
import {
  defaultGradeValue,
  IB_OPTIONS,
  LETTER_OPTIONS,
  PASS_FAIL_OPTIONS,
  schemeLabel,
} from '../utils/grading';

const SELECT_SCHEMES = {
  ib_1_7: { label: 'IB grade (1–7)', options: IB_OPTIONS, helper: 'Final IB band for this piece of work' },
  letter: { label: 'Letter grade', options: LETTER_OPTIONS },
  pass_fail: { label: 'Result', options: PASS_FAIL_OPTIONS },
};

export default function GradeInput({ scheme = 'ib_1_7', maxScore, value, onChange }) {
  const set = (next) => onChange(next);
  const select = SELECT_SCHEMES[scheme];

  if (select) {
    return (
      <ErpSelect
        label={select.label}
        helper={select.helper}
        value={value || defaultGradeValue(scheme)}
        options={select.options}
        onChange={(e) => set(e.target.value)}
      />
    );
  }
  if (scheme === 'percentage') {
    return (
      <ErpInput
        label="Score (%)"
        type="number"
        inputMode="decimal"
        min="0"
        max="100"
        value={value}
        helper="Between 0 and 100"
        onChange={(e) => set(e.target.value)}
      />
    );
  }
  return (
    <ErpInput
      label={`Marks${maxScore ? ` (out of ${maxScore})` : ''}`}
      type="number"
      inputMode="decimal"
      min="0"
      max={maxScore || undefined}
      value={value}
      helper={schemeLabel(scheme)}
      onChange={(e) => set(e.target.value)}
    />
  );
}
