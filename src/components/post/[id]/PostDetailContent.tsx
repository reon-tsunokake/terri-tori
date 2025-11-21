'use client';

import React from 'react';
import { PostDocument } from '../../../types/firestore';

interface PostDetailContentProps {
  post: PostDocument & { id: string };
}

export default function PostDetailContent({ post }: PostDetailContentProps) {
  return (
    <div className="bg-white">
      {/* 写真エリア */}
      <div className="relative w-full bg-gray-100">
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt="Post detail"
            className="w-full h-auto max-h-[60vh] object-contain mx-auto"
          />
        ) : (
          <div className="w-full h-64 flex items-center justify-center text-gray-400">No Image</div>
        )}
      </div>

      {/* 投稿情報エリア */}
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            {/* Location情報 */}
            <h2 className="text-xl font-bold text-gray-900">
              {(post as any).location?.municipality || '場所不明'}
            </h2>
            <p className="text-sm text-gray-500">
              {(post as any).location?.prefecture || ''}
            </p>
          </div>
          {/* Season情報 */}
          <div className="text-right">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
              {post.seasonId || 'Season未設定'}
            </span>
          </div>
        </div>

        {/* いいね数などのメタデータ */}
        <div className="flex items-center text-gray-600 text-sm border-y border-gray-50 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          <span className="font-medium mr-4">{(post as any).likesCount || 0} いいね</span>
          
          <span className="text-gray-400 text-xs ml-auto">
            {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : ''}
          </span>
        </div>

        {/* コメント・キャプション */}
        <div className="pt-2">
           <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
             {(post as any).comment || (post as any).content || "コメントはありません"}
           </p>
        </div>
      </div>
    </div>
  );
}

