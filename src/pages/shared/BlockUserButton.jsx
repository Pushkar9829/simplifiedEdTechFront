import { useCallback, useEffect, useState } from 'react';
import { blockUser, listMyBlocks, unblockUser } from '../../api';
import { ErpButton, ErpConfirm, ErpModal, ErpTextarea } from '../../components/erp';
import { errorMessage } from '../../utils/errors';

const targetIdOf = (row) => String(row?.targetUserId?._id || row?.targetUserId || '');

/** The ids the signed-in user has blocked, with a reload function. */
export function useMyBlocks() {
  const [ids, setIds] = useState(() => new Set());
  const [ready, setReady] = useState(false);
  const reload = useCallback(
    () =>
      listMyBlocks()
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : rows?.items || [];
          setIds(new Set(list.map(targetIdOf).filter(Boolean)));
        })
        .catch(() => {})
        .finally(() => setReady(true)),
    []
  );
  useEffect(() => {
    reload();
  }, [reload]);
  return { ids, ready, reload, isBlocked: (id) => ids.has(String(id || '')) };
}

/**
 * Block / Unblock toggle with a reason prompt. Pass `blocked` (from useMyBlocks) and
 * `onChange(nextBlocked)` to keep the parent list in sync.
 * Reusable on tutor detail, student lists and message threads.
 */
export default function BlockUserButton({
  userId,
  name = 'this user',
  blocked = false,
  onChange,
  size = 'sm',
  variant,
  iconOnly = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!userId) return null;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setErr('');
  };

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      if (blocked) await unblockUser(userId);
      else await blockUser(userId, reason.trim());
      setOpen(false);
      setReason('');
      onChange?.(!blocked);
    } catch (ex) {
      setErr(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  };

  const label = blocked ? 'Unblock' : 'Block';
  return (
    <>
      <ErpButton
        variant={variant || (blocked ? 'secondary' : 'ghost')}
        size={size}
        icon="lock"
        iconOnly={iconOnly}
        className={className}
        aria-label={iconOnly ? `${label} ${name}` : undefined}
        title={iconOnly ? `${label} ${name}` : undefined}
        onClick={() => setOpen(true)}
      >
        {iconOnly ? null : label}
      </ErpButton>
      {blocked ? (
        <ErpConfirm
          open={open}
          title={`Unblock ${name}?`}
          message={err || `${name} will be able to message and book with you again.`}
          confirmLabel="Unblock"
          busy={busy}
          onConfirm={submit}
          onCancel={close}
        />
      ) : (
        <ErpModal
          open={open}
          size="sm"
          title={`Block ${name}?`}
          onClose={close}
          footer={
            <>
              <ErpButton variant="secondary" onClick={close} disabled={busy}>
                Cancel
              </ErpButton>
              <ErpButton variant="danger" icon="lock" onClick={submit} loading={busy}>
                Block
              </ErpButton>
            </>
          }
        >
          <div className="stack">
            <p className="erp-confirm-message" style={{ margin: 0 }}>
              You won&apos;t be able to message or book classes with each other. You can unblock any time from
              Profile → Blocked users.
            </p>
            <ErpTextarea
              label="Reason"
              optional
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Only you and the admin team can see this."
            />
            {err ? (
              <p className="erp-field-error" role="alert" style={{ margin: 0 }}>
                {err}
              </p>
            ) : null}
          </div>
        </ErpModal>
      )}
    </>
  );
}
