export const toast = {
  error(msg: string) {
    if (typeof window !== 'undefined') console.error('[toast.error]', msg);
  },
  success(msg: string) {
    if (typeof window !== 'undefined') console.log('[toast.success]', msg);
  },
};
