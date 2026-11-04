import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from '@/lib/navigation';

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export default function Link({ to, onClick, ...props }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }

  return <a href={to} onClick={handleClick} {...props} />;
}
