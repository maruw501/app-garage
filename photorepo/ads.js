(function () {
  const ADSENSE_CLIENT = "ca-pub-1847456128680028";
  const AD_SLOTS = {
    top: "4515255229",
    bottom: "9565090284",
  };

  function canShowAd(slotName) {
    return ADSENSE_CLIENT.indexOf("ca-pub-") === 0 && Boolean(AD_SLOTS[slotName]);
  }

  function hideSlot(target) {
    const container = target.closest(".ad-slot");
    if (container) container.classList.add("is-ad-disabled");
  }

  function loadAdsenseScript() {
    if (document.querySelector("script[data-adsense-loader]")) return;

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.adsenseLoader = "true";
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADSENSE_CLIENT);
    document.head.appendChild(script);
  }

  function mountAd(target) {
    const slotName = target.dataset.adSlot;
    if (!canShowAd(slotName)) {
      hideSlot(target);
      return;
    }

    loadAdsenseScript();
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
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      console.warn("広告を読み込めませんでした。", error);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".ad-code-target[data-ad-slot]").forEach(mountAd);
  });
})();
