/**
 * Placeholder face for the AI skin-analysis card (shown before a patient takes their own scan).
 * Photo: Unsplash, "a woman with dark hair" (photo-1652226825940-46ad2a55d132), free under the
 * Unsplash License; hotlinked from Unsplash's CDN as their guidelines ask. Labeled "Example photo".
 * The crop rect frames the face like the reference card. Landmarks were measured on exactly this
 * crop (900×855) with MediaPipe Face Landmarker in the browser on Sat Nov 14 2026, as % of the image.
 */
export const PLACEHOLDER_FACE = {
  src: "https://images.unsplash.com/photo-1652226825940-46ad2a55d132?rect=476,1198,1997,1897&w=900&q=78&auto=format",
  credit: "Photo: Unsplash",
  aspect: 900 / 855,
  oval: [
    [52.3, 13.9], [59.2, 14.6], [65.1, 16.2], [70.4, 19.1], [73.9, 23], [76, 27.8], [77.3, 33], [77.9, 39.2], [77.8, 44.9], [77.2, 50.8],
    [75.8, 57.2], [73.9, 63.8], [71.3, 68.9], [68.5, 72.3], [64.7, 75], [61.3, 76.6], [57.6, 77.8], [53.4, 78.5], [48.2, 78.5], [42.9, 77.7],
    [38.9, 76.3], [35.4, 74.5], [32.3, 72.4], [28.8, 69.1], [26.3, 65.2], [24.5, 59.8], [23.3, 52.9], [22.9, 46.5], [23.1, 40.7], [23.7, 35.1],
    [25.2, 29.1], [27.2, 24.2], [30.1, 19.8], [34, 16.4], [39.4, 14.3], [45.4, 13.7],
  ] as Array<[number, number]>,
  lips: [[38.5, 58.4], [41.6, 57.1], [46.8, 55.9], [49.9, 56.7], [53.1, 56.4], [58.1, 58.5], [60.8, 60.3], [57.8, 61.2], [52.6, 61.6], [49.5, 61.4], [46.5, 61], [41.6, 59.7]] as Array<[number, number]>,
  browL: [[29.9, 26.6], [32.5, 24.3], [36.2, 23], [40.9, 23.2], [46.2, 24.2]] as Array<[number, number]>,
  browR: [[57.2, 24.9], [62.7, 24.7], [67.4, 25.2], [70.9, 27.2], [73.2, 29.8]] as Array<[number, number]>,
  /** where the floating concern pills sit */
  pills: { underEye: [24, 37] as [number, number], fineLines: [56, 18] as [number, number], sunSpots: [66, 44] as [number, number] },
};
