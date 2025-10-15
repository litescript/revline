export const toast = {
  error(msg: string) {
    if (typeof window !== 'undefined' && window?.console) {
      // replace with your UI toast lib
      console.error('[toast.error]', msg);
    }
  },
  success(msg: string) {
    if (typeof window !== 'undefined' && window?.console) {
      console.log('[toast.success]', msg);
    }
  },
};
