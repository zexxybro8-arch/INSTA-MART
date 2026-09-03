import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, className = 'w-5 h-5', size }) => {
  // Normalize lookup name
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
  
  // Custom mappings for common social platforms
  const mapping: Record<string, string> = {
    instagram: 'Instagram',
    youtube: 'Youtube',
    telegram: 'Send',
    facebook: 'Facebook',
    tiktok: 'Video',
    twitter: 'Twitter',
    twitterx: 'Twitter',
    x: 'Twitter',
    spotify: 'Music',
    soundcloud: 'Music2',
    views: 'PlayCircle',
    followers: 'Users',
    likes: 'Heart',
    comments: 'MessageSquare',
    story: 'Eye',
  };

  const lookupKey = mapping[cleanName.toLowerCase()] || cleanName;
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<any>>;
  const IconComponent = iconsMap[lookupKey] || iconsMap[name] || LucideIcons.Activity;

  return <IconComponent className={className} size={size} />;
};
