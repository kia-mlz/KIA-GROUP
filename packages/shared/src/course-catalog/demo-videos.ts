/**
 * Public sample MP4s for seeded HTML / CSS / JavaScript lessons.
 * Used only when `db.json` has no `video_url` so the Learn player always has
 * a playable video block for demos (see AGENTS.md).
 *
 * Sources: Google Cast sample bucket (stable, CORS-friendly progressive MP4).
 */
export const DEMO_LESSON_VIDEOS = [
  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
] as const;

/** Deterministic demo video for a lesson index within a course. */
export function demoLessonVideoUrl(lessonIndex: number): string {
  const list = DEMO_LESSON_VIDEOS;
  return list[((lessonIndex % list.length) + list.length) % list.length]!;
}
