// reCAPTCHA Modifier Script v2.0 - Solo se carga si NO hay Turnstile
(() => {
  'use strict';
  const testSiteKey = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
  const obtenerTaskId = () => document.querySelector('[data-taskid], #taskId')?.getAttribute('data-taskid') ?? document.querySelector('[data-taskid], #taskId')?.textContent?.trim() ?? window.taskId ?? null;
  const obtenerProxyGate = () => document.querySelector('[data-proxygate], #proxyGate')?.getAttribute('data-proxygate') ?? document.querySelector('[data-proxygate], #proxyGate')?.textContent?.trim() ?? window.proxyGate ?? null;
  const sendToParent = taskInfo => { try { window.parent.postMessage({ type:'recaptchaTask', ...taskInfo, url:location.href }, '*'); } catch {} };

  function waitForGrecaptcha(cb) {
    if (typeof grecaptcha !== 'undefined' && grecaptcha.render) return cb();
    const i = setInterval(() => typeof grecaptcha !== 'undefined' && grecaptcha.render && (clearInterval(i), cb()), 200);
    setTimeout(() => clearInterval(i), 10000);
  }

  function processInline() {
    document.querySelectorAll('.g-recaptcha[data-sitekey]:not([data-processed])').forEach(el => {
      const key = el.getAttribute('data-sitekey');
      if (!key?.startsWith("6") || key.length !== 40) return;
      const inv = el.getAttribute('data-size') === 'invisible';
      const taskName = inv ? 'reCAPTCHA v2 invisible' : 'reCAPTCHA v2 visible';
      el.setAttribute('data-processed','true');
      el.setAttribute('data-sitekey', testSiteKey);
      waitForGrecaptcha(() => {
        try {
          const id = grecaptcha.render(el, {
            sitekey: testSiteKey,
            size: inv ? 'invisible' : 'normal',
            callback: token => sendToParent({ taskName, token, taskId: obtenerTaskId(), proxyGate: obtenerProxyGate() })
          });
          inv && setTimeout(() => grecaptcha.execute(id), 300);
        } catch {}
      });
    });
  }

  function isRecaptchaIframe(iframe) {
    try {
      const u = new URL(iframe.src);
      return u.hostname.includes("google.com") && u.pathname.includes("/recaptcha/api2/") && !u.pathname.includes("enterprise") && u.searchParams.get("k")?.startsWith("6");
    } catch { return false; }
  }

  function modifyIframe(iframe) {
    try {
      const url = new URL(iframe.src);
      const orig = url.searchParams.get("k");
      if (!orig?.startsWith("6")) return;
      url.searchParams.set("k", testSiteKey);
      iframe.src = url.toString();
      sendToParent({ taskName:'reCAPTCHA v2 iframe', token:null, taskId: obtenerTaskId(), proxyGate: obtenerProxyGate() });
    } catch {}
  }

  const obs = new MutationObserver(ms => {
    ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.tagName === 'IFRAME' && isRecaptchaIframe(n)) modifyIframe(n);
      if (n.matches('.g-recaptcha') || n.querySelector('.g-recaptcha')) processInline();
    }));
  });

  obs.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['src','data-sitekey'] });

  const init = () => {
    processInline();
    document.querySelectorAll('iframe[src*="google.com/recaptcha/api2/"]').forEach(ifr => isRecaptchaIframe(ifr) && modifyIframe(ifr));
  };

  document.readyState === 'interactive' || document.readyState === 'complete' ? init() : document.addEventListener('DOMContentLoaded', init);
})();
