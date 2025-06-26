// import { useEffect, useState } from 'react';
// import { getTopLikedDomains } from '@/lib/contracts/domainLikes';

// export function useTopVotedDomains() {
//   const [data, setData] = useState<any[]>([]);
//   const [isLoading, setLoading] = useState(true);
//   const [isError, setError] = useState(false);
//   const [error, setErrorMsg] = useState<any>(null);

//   useEffect(() => {
//     setLoading(true);
//     getTopLikedDomains()
//       .then(setData)
//       .catch((e) => {
//         setError(true);
//         setErrorMsg(e);
//       })
//       .finally(() => setLoading(false));
//   }, []);

//   return { data, isLoading, isError, error };
// }
