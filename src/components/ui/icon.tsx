import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
  fallback?: string;
}

const Icon: React.FC<IconProps> = ({ name, fallback = 'CircleAlert', ...props }) => {
  if (name === 'Avtomat') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={props.size || 24}
        height={props.size || 24}
        stroke="currentColor"
        strokeWidth={props.strokeWidth || 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className={props.className}
      >
        {/* Barrel / Gas tube */}
        <path d="M22 9h-7M15 10H7M10 11h5" />
        {/* Sights */}
        <path d="M8 8h1M20 7.5v1.5" />
        {/* Receiver & Magazine */}
        <path d="M7 10v2.5h6V10M9.5 12.5l-1 4.5c0 .5.5 1 1 1h1.5l1.5-5.5" />
        {/* Pistol grip & Trigger guard */}
        <path d="M6.5 12l-1.5 3.5h1.5l1-3.5M7.5 12.5a1 1 0 011-1" />
        {/* Buttstock */}
        <path d="M5 10H2v4.5h1l2-2.5v-2" />
      </svg>
    );
  }

  const IconComponent = (LucideIcons as Record<string, React.FC<LucideProps>>)[name];

  if (!IconComponent) {
    // Если иконка не найдена, используем fallback иконку
    const FallbackIcon = (LucideIcons as Record<string, React.FC<LucideProps>>)[fallback];

    // Если даже fallback не найден, возвращаем пустой span
    if (!FallbackIcon) {
      return <span className="text-xs text-gray-400">[icon]</span>;
    }

    return <FallbackIcon {...props} />;
  }

  return <IconComponent {...props} />;
};

export default Icon;
