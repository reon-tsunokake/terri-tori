'use client';

import React from 'react';
import { FaMapMarkedAlt, FaUserFriends, FaChevronDown } from 'react-icons/fa';

type Props = {
    selectedGroup: number;
    availableGroups: number[];
    userGroup?: number;
    onChange: (groupId: number) => void;
};

export default function GroupMapSelector({
    selectedGroup,
    availableGroups,
    userGroup,
    onChange,
}: Props) {
    // ユーザーのグループを見ているかどうか
    const isViewingMyGroup = userGroup !== undefined && userGroup === selectedGroup;

    return (
        <div className="absolute top-[3.5rem] sm:top-[4rem] md:top-[5rem] left-0 right-0 z-10 flex justify-center p-2 pointer-events-none">
            <div className="pointer-events-auto bg-white/90 backdrop-blur-md shadow-lg rounded-full pl-4 pr-2 py-2 flex items-center gap-3 border border-rose-100 transition-all hover:shadow-xl hover:scale-[1.02]">

                {/* アイコンとラベル */}
                <div className="flex items-center gap-2 text-rose-500">
                    {isViewingMyGroup ? (
                        <FaUserFriends className="text-lg" />
                    ) : (
                        <FaMapMarkedAlt className="text-lg" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400 hidden sm:block">
                        Map View
                    </span>
                </div>

                {/* 区切り線 */}
                <div className="w-px h-4 bg-rose-200"></div>

                {/* コントロール部分 */}
                <div className="relative flex items-center">
                    <select
                        value={selectedGroup}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="appearance-none bg-transparent font-bold text-gray-700 text-sm sm:text-base pr-8 pl-1 outline-none cursor-pointer hover:text-rose-600 transition-colors"
                    >
                        {availableGroups.map((group) => (
                            <option key={group} value={group}>
                                Group {group}
                                {userGroup === group ? ' (You)' : ''}
                            </option>
                        ))}
                    </select>
                    <FaChevronDown className="absolute right-0 text-gray-400 text-xs pointer-events-none" />
                </div>

                {/* インジケーター (自分のグループ以外を見ているとき) */}
                {userGroup && !isViewingMyGroup && (
                    <button
                        onClick={() => onChange(userGroup)}
                        className="ml-1 bg-rose-100/50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded-full text-[10px] font-bold transition-colors"
                    >
                        Return
                    </button>
                )}
            </div>
        </div>
    );
}
