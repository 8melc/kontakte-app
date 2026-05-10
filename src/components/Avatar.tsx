import { initials } from '../lib/domain';

export function Avatar({
  name,
  size = 'md',
  urgent,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  urgent?: boolean;
}) {
  const cls = ['av', size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : '', urgent ? 'urgent' : '']
    .filter(Boolean)
    .join(' ');
  return <span className={cls}>{initials(name)}</span>;
}
