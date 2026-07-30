(function () {
  const ADSENSE_CLIENT = "ca-pub-1847456128680028";
  const AD_SLOTS = {
    top: "4515255229",
    bottom: "9565090284",
  };
  let adsenseLoadPromise;

  function canShowAd(slotName) {
    const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    return !isLocal && ADSENSE_CLIENT.indexOf("ca-pub-") === 0 && Boolean(AD_SLOTS[slotName]);
  }

  function hideSlot(target) {
    const container = target.closest(".ad-slot");
    if (container) container.classList.add("is-ad-disabled");
  }

  function loadAdsenseScript() {
    if (adsenseLoadPromise) return adsenseLoadPromise;

    adsenseLoadPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.id = "adsense-script";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
        encodeURIComponent(ADSENSE_CLIENT);
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });

    return adsenseLoadPromise;
  }

  async function mountAd(target) {
    const slotName = target.dataset.adSlot;
    if (!canShowAd(slotName)) {
      hideSlot(target);
      return;
    }

    target.innerHTML = "";

    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "block";
    ad.dataset.adClient = ADSENSE_CLIENT;
    ad.dataset.adSlot = AD_SLOTS[slotName];
    ad.dataset.adFormat = "auto";
    ad.dataset.fullWidthResponsive = "true";
    target.appendChild(ad);

    try {
      await loadAdsenseScript();
      await new Promise(function (resolve) {
        requestAnimationFrame(resolve);
      });
      if (target.clientWidth === 0) {
        hideSlot(target);
        return;
      }
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      hideSlot(target);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".ad-code-target[data-ad-slot]").forEach(mountAd);
  });
})();
