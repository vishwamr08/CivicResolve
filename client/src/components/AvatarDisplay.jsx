import React, { useState } from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { getAssetUrl } from '../config/api';

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl'
};

function getInitials(name) {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AvatarDisplay({
  user,
  previewUrl = null,
  size = 'md',
  variant = 'citizen',
  className = ''
}) {
  const [failedUrl, setFailedUrl] = useState(null);
  const rawPhotoUrl = previewUrl || (user?.profile_photo_url ? getAssetUrl(user.profile_photo_url) : '');
  const showImage = Boolean(rawPhotoUrl && failedUrl !== rawPhotoUrl);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const initials = getInitials(user?.name);
  const isAdmin = variant === 'admin';

  return (
    <div
      className={`relative rounded-full overflow-hidden flex-shrink-0 aspect-square flex items-center justify-center border shadow-xs select-none ${sizeClass} ${
        showImage
          ? 'bg-slate-100 border-slate-200'
          : isAdmin
            ? 'bg-[#1a3c6e] text-white border-[#2a5298]'
            : 'bg-orange-50 text-[#d96810] border-orange-200'
      } ${className}`}
      aria-label={user?.name ? `${user.name} avatar` : 'User avatar'}
    >
      {showImage ? (
        <img
          src={rawPhotoUrl}
          alt={user?.name ? `${user.name}'s profile photo` : 'Profile photo'}
          onError={() => setFailedUrl(rawPhotoUrl)}
          className="w-full h-full object-cover object-center"
        />
      ) : initials ? (
        <span className="font-bold tracking-tight leading-none">{initials}</span>
      ) : isAdmin ? (
        <ShieldCheck className="w-1/2 h-1/2 text-[#f47920]" />
      ) : (
        <User className="w-1/2 h-1/2" />
      )}
    </div>
  );
}
