/** In-app browsers (Instagram, TikTok, Facebook, ...) often block the camera. */
export function detectInAppBrowser(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  const tests: Array<[RegExp, string]> = [
    [/Instagram/i, "Instagram"],
    [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
    [/musical_ly|TikTok|BytedanceWebview/i, "TikTok"],
    [/Snapchat/i, "Snapchat"],
    [/Twitter|X-Client/i, "X"],
    [/Line\//i, "LINE"],
    [/Pinterest/i, "Pinterest"],
    [/LinkedInApp/i, "LinkedIn"],
  ];
  for (const [re, name] of tests) if (re.test(ua)) return name;
  return null;
}

export function isIOS(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  return /iPhone|iPad|iPod/i.test(ua);
}
