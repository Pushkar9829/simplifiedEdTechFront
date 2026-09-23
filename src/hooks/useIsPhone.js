import { useEffect, useState } from 'react';

const PHONE_MQ = '(max-width: 900px)';

export function useIsPhone() {
  const [phone, setPhone] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(PHONE_MQ).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(PHONE_MQ);
    const onChange = () => setPhone(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return phone;
}
