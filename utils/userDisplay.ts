import { User } from '../types';

export const nameHasPositionSuffix = (name?: string, position?: string) => {
  const n = (name || '').replace(/\s+/g, '');
  const p = (position || '').replace(/\s+/g, '');
  if (!n || !p) return false;
  return n.endsWith(p);
};

export const formatUserNameWithPosition = (user?: Pick<User, 'name' | 'position'> | null) => {
  const name = (user?.name || '').trim();
  const position = (user?.position || '').trim();
  if (!name) return '';
  if (!position) return name;
  if (nameHasPositionSuffix(name, position)) return name;
  return `${name} ${position}`;
};

export const positionIfNotDuplicated = (user?: Pick<User, 'name' | 'position'> | null) => {
  const name = (user?.name || '').trim();
  const position = (user?.position || '').trim();
  if (!position) return '';
  if (nameHasPositionSuffix(name, position)) return '';
  return position;
};

