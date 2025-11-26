import React from 'react';

interface LikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onClick: () => void;
  disabled?: boolean;
  showCount?: boolean;
  className?: string;
}

/**
 * いいねボタンコンポーネント
 * 
 * プレゼンテーション層として、UIのみを担当します。
 * ロジックはpropsとして受け取ります。
 */
export default function LikeButton({
  isLiked,
  likesCount,
  onClick,
  disabled = false,
  showCount = true,
  className = '',
}: LikeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center transition-all duration-200 ${
        isLiked 
          ? 'text-red-500' 
          : 'text-gray-600 hover:text-red-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      aria-label={isLiked ? 'いいねを取り消す' : 'いいねする'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-5 w-5 mr-1 transition-transform ${
          isLiked ? 'fill-current scale-110' : 'fill-none stroke-current'
        }`}
        viewBox="0 0 24 24"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {showCount && (
        <span className="font-medium">
          {likesCount}
        </span>
      )}
    </button>
  );
}
