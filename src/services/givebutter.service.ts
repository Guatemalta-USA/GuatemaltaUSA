// src/services/givebutter.ts

const GIVEBUTTER_ACCOUNT_ID = "hdn8Q4p20zRoosIi";

export function initGivebutter(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="givebutter.com"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://widgets.givebutter.com/latest.umd.cjs?acct=${GIVEBUTTER_ACCOUNT_ID}`;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Givebutter script.'));
    
    document.head.appendChild(script);
  });
}