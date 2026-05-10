import { useEffect, useState } from 'react';
import { onToast } from '../lib/toast';

export function Toast() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    return onToast(text => {
      setMsg(text);
      const id = window.setTimeout(() => setMsg(null), 2400);
      return () => window.clearTimeout(id);
    });
  }, []);

  return <div className={`toast ${msg ? 'show' : ''}`}>{msg}</div>;
}
