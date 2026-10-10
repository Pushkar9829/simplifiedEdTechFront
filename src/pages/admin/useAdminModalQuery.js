import { useSearchParams } from 'react-router-dom';

/** Deep-link list modals via ?new=1 or ?id=, preserving other query params. */
export function useAdminModalQuery() {
  const [params, setParams] = useSearchParams();
  const isNew = params.get('new') === '1';
  const editId = params.get('id') || '';

  const setModal = (next) => {
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        nextParams.delete('new');
        nextParams.delete('id');
        if (next?.new) nextParams.set('new', '1');
        if (next?.id) nextParams.set('id', String(next.id));
        return nextParams;
      },
      { replace: true }
    );
  };

  return {
    isNew,
    editId,
    modalOpen: isNew || Boolean(editId),
    openNew: () => setModal({ new: true }),
    openEdit: (id) => setModal({ id }),
    close: () => setModal({}),
  };
}
