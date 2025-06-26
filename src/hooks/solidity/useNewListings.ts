import { useEffect, useState } from 'react';
import { getLastListedDomains } from '@/lib/contracts/domainRegistry';

export function useNewListings() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isError, setError] = useState(false);
  const [error, setErrorMsg] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    getLastListedDomains()
      .then(setData)
      .catch((e) => {
        setError(true);
        setErrorMsg(e);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, isLoading, isError, error };
}
