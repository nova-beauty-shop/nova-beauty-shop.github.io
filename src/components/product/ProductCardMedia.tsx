import { animationClass, imageTransform, cardBackground } from '@/lib/productStyle';
import type { AnimationType, CardBgType, ImageFit } from '@/types/catalog';

export interface CardMediaStyle {
  cardBgType: CardBgType;
  cardBgValue: string | null;
  imageFit: ImageFit;
  imageScale: number;
  imageAngle: number;
  animationType: AnimationType | null;
}

/**
 * The picture area of a product card: themed background plus the product photo with its fit, zoom,
 * tilt and animation. Shared by the storefront card and the admin live preview.
 *
 * The static zoom/tilt sits on a wrapper and the animation on the image itself, so the two
 * transforms never overwrite each other.
 */
export default function ProductCardMedia({
  cover,
  hoverImage,
  alt,
  style,
  interactive = true,
}: {
  cover: string | undefined;
  hoverImage?: string | undefined;
  alt: string;
  style: CardMediaStyle;
  /** Enables the hover swap to the second photo (off in the admin preview). */
  interactive?: boolean;
}) {
  const background = cardBackground(style.cardBgType, style.cardBgValue);
  const transform = imageTransform(style.imageScale, style.imageAngle);
  const animated = style.animationType !== null;
  const fit = style.imageFit === 'contain' ? 'object-contain p-4' : 'object-cover';
  const motion = animationClass(style.animationType);
  const swap = interactive && hoverImage && hoverImage !== cover;

  return (
    <div className={`absolute inset-0 overflow-hidden ${background.className}`} style={background.style}>
      <div className="absolute inset-0" style={{ transform }}>
        {cover && (
          <img
            src={cover}
            alt={alt}
            loading="lazy"
            className={`h-full w-full ${fit} ${motion} ${
              animated ? '' : 'transition duration-700 ease-out group-hover:scale-105'
            } ${swap ? 'group-hover:opacity-0' : ''}`}
          />
        )}
        {swap && (
          <img
            src={hoverImage}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className={`absolute inset-0 h-full w-full ${fit} ${motion} opacity-0 transition duration-700 ease-out group-hover:opacity-100 ${
              animated ? '' : 'group-hover:scale-105'
            }`}
          />
        )}
      </div>
    </div>
  );
}
