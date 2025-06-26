// import { useEffect, useState } from 'react';
// import { useWalletContext } from '@/context/WalletContext';
// import { getLikedDomainsByUser } from '@/lib/contracts/domainLikes';

// export function useMyVotes() {
//   const { account } = useWalletContext();
//   const [data, setData] = useState<any[]>([]);
//   const [isLoading, setLoading] = useState(true);
//   const [isError, setError] = useState(false);
//   const [error, setErrorMsg] = useState<any>(null);

//   useEffect(() => {
//     if (!account) return;
//     setLoading(true);
//     getLikedDomainsByUser(account)
//       .then(setData)
//       .catch((e) => {
//         setError(true);
//         setErrorMsg(e);
//       })
//       .finally(() => setLoading(false));
//   }, [account]);

//   return { data, isLoading, isError, error };
// }