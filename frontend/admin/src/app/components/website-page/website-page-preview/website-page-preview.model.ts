export type PreviewViewport = 'fit' | 'desktop' | 'tablet' | 'mobile';

/** Width of the preview device frame per viewport. */
export const PREVIEW_VIEWPORT_WIDTH: Record<PreviewViewport, string> = {
  fit: '100%',
  desktop: '1200px',
  tablet: '768px',
  mobile: '390px',
};
