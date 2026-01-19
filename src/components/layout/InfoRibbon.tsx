'use client';

import React from 'react';
import { HiLocationMarker } from 'react-icons/hi';
import { FaUserFriends, FaMapMarkedAlt, FaChevronUp } from 'react-icons/fa';
import { MunicipalityProperties } from '@/types/map';
import { useLocation } from '@/contexts/LocationContext';
import SemiModal from './SemiModal';

type Props = {
    // Group Selector Props
    selectedGroup: number;
    availableGroups: number[];
    userGroup?: number;
    onGroupChange: (groupId: number) => void;

    // Selection Props
    selectedMunicipality: MunicipalityProperties | null;
};

/**
 * InfoRibbon Component
 * Allows users to view current location, switch groups, and see selected area info
 * in a unified horizontal ribbon above the footer.
 */
export default function InfoRibbon({
    selectedGroup,
    availableGroups,
    userGroup,
    onGroupChange,
    selectedMunicipality,
}: Props) {
    const { location } = useLocation();

    // Determine label for current location
    const locationLabel =
        location.latitude !== null
            ? location.prefecture && location.city
                ? `${location.prefecture}${location.city}`
                : location.city || '位置情報取得済み'
            : '取得中...';

    // Determine label for selection
    const selectionLabel = selectedMunicipality
        ? `${selectedMunicipality.prefecture} ${selectedMunicipality.name}`
        : '未選択';

    const [isGroupModalOpen, setIsGroupModalOpen] = React.useState(false);

    const isViewingMyGroup = userGroup !== undefined && userGroup === selectedGroup;

    return (
        <>
            <div className="fixed bottom-[2.75rem] left-0 right-0 z-20 flex justify-center pointer-events-none">
                <div className="pointer-events-auto flex w-full items-center justify-between bg-white/90 backdrop-blur-md border-t border-rose-100 p-2">

                    {/* Left: Current Location */}
                    <div className="flex flex-1 items-center gap-2 overflow-hidden px-2 border-r border-rose-100">
                        <HiLocationMarker className={`flex-shrink-0 ${location.latitude ? 'text-green-600' : 'text-gray-400 animate-pulse'}`} />
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] text-gray-400 font-medium">現在地</span>
                            <span className="truncate text-xs font-bold text-gray-700">
                                {locationLabel}
                            </span>
                        </div>
                    </div>

                    {/* Center: Group Selector Trigger */}
                    <div className="flex flex-1 items-center justify-center px-2 border-r border-rose-100 relative">
                        <button
                            onClick={() => setIsGroupModalOpen(true)}
                            className="relative flex items-center justify-center w-full appearance-none bg-transparent outline-none cursor-pointer group active:scale-95 transition-transform"
                        >
                            <div className="absolute left-0 flex items-center pointer-events-none">
                                {isViewingMyGroup ? (
                                    <FaUserFriends className="text-rose-500 text-xs" />
                                ) : (
                                    <FaMapMarkedAlt className="text-rose-500 text-xs" />
                                )}
                            </div>

                            <span className="text-center text-xs font-bold text-rose-600 px-2 truncate">
                                Group {selectedGroup}
                                {userGroup === selectedGroup && <span className="text-[10px] ml-1">(You)</span>}
                            </span>

                            <FaChevronUp className="absolute right-0 text-[10px] text-rose-400 pointer-events-none" />
                        </button>
                    </div>

                    {/* Right: Selected Area */}
                    <div className="flex flex-1 items-center gap-2 overflow-hidden px-2 justify-end">
                        <div className="flex flex-col items-end overflow-hidden">
                            <span className="text-[10px] text-gray-400 font-medium">選択中</span>
                            <span className={`truncate text-xs font-bold ${selectedMunicipality ? 'text-gray-700' : 'text-gray-300'}`}>
                                {selectionLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Group Selection Modal */}
            <SemiModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                areaName="表示グループの切り替え"
            >
                <div className="space-y-3 pb-4">
                    <p className="text-xs text-gray-500 mb-2">
                        地図上に表示するテリトリー状況を切り替えます。<br />
                        他のグループの動向を確認しましょう。
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                        {availableGroups.map((group) => {
                            const isMyGroup = userGroup === group;
                            const isSelected = selectedGroup === group;
                            return (
                                <button
                                    key={group}
                                    onClick={() => {
                                        onGroupChange(group);
                                        setIsGroupModalOpen(false);
                                    }}
                                    className={`relative flex items-center justify-between w-full p-4 rounded-xl border-2 transition-all ${isSelected
                                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                                        : 'border-transparent bg-gray-50 text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isMyGroup ? 'bg-rose-100 text-rose-600' : 'bg-gray-200 text-gray-500'}`}>
                                            {isMyGroup ? <FaUserFriends size={14} /> : <FaMapMarkedAlt size={14} />}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold">Group {group}</div>
                                            {isMyGroup && <div className="text-[10px] text-rose-500 font-semibold">あなたの所属グループ</div>}
                                        </div>
                                    </div>

                                    {/* Selection Indicator */}
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-rose-500 bg-rose-500' : 'border-gray-300'}`}>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setIsGroupModalOpen(false)}
                        className="w-full mt-4 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
                    >
                        キャンセル
                    </button>
                </div>
            </SemiModal>
        </>
    );
}
