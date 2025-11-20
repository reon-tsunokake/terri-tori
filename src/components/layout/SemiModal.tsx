'use client';

import React from 'react';

/**
 * @interface SemiModalProps
 * SemiModalコンポーネントのProps（契約）
 */
export interface SemiModalProps {
  isOpen: boolean; // モーダルの開閉状態
  onClose: () => void; // モーダルを閉じるよう親に通知する関数
  areaName: string; // ヘッダーに表示するエリア名
  children: React.ReactNode; // コンテンツ本体
}

/**
 * SemiModal
 * 画面下部からスライドインするモーダルコンポーネント
 */
const SemiModal: React.FC<SemiModalProps> = ({
  isOpen,
  onClose,
  areaName,
  children,
}) => {
  return (
    // Root container for transitions
    <div
      className={`fixed inset-0 z-40 transition-all duration-300 ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
    >
      {/* Backdrop (Overlay)
        - onClickでonCloseを呼び出し、背景クリックで閉じられるようにする
      */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet (Modal Body)
        - isOpenの状態に応じて 'translate-y-0' (表示) と 'translate-y-full' (非表示) を切り替える
      */}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full max-w-sm mx-auto bg-white rounded-t-2xl shadow-lg z-50 p-4 
                    transition-transform duration-300 ease-in-out 
                    ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">{areaName}</h2>
          <button
            onClick={onClose} // ボタンクリックで閉じる
            className="text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            {/* '×' icon */}
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SemiModal;
