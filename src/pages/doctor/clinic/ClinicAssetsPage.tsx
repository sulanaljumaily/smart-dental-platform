import React, { useState } from 'react';
import { LayoutDashboard, Stethoscope, Package, Monitor, ClipboardList, Settings } from 'lucide-react';
import { Card } from '../../../components/common/Card';

// Import sub-sections
import { AssetsOverview } from './sections/assets/AssetsOverview';
import { AssetsTreatments } from './sections/assets/AssetsTreatments';
// Swapped to main page component which has Supabase integration
import { ClinicInventoryPage } from './ClinicInventoryPage';
import { AssetsDevices } from './sections/assets/AssetsDevices';
import { AssetsSettings } from './sections/assets/AssetsSettings';

interface ClinicAssetsPageProps {
    clinicId?: string;
}

export const ClinicAssetsPage: React.FC<ClinicAssetsPageProps> = ({ clinicId = '1' }) => {
    const [activeTab, setActiveTab] = useState('overview');

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'overview':
                return <AssetsOverview clinicId={clinicId} />;
            case 'treatments':
                return <AssetsTreatments clinicId={clinicId} />;
            case 'inventory':
                return <ClinicInventoryPage clinicId={clinicId} />;
            case 'devices':
                return <AssetsDevices clinicId={clinicId} />;
            case 'settings':
                return <AssetsSettings clinicId={clinicId} />;
            default:
                return <AssetsOverview clinicId={clinicId} />;
        }
    };

    return (
        <div className="space-y-6">

            {/* Navigation Tabs */}
            <Card>
                <div className="border-b border-gray-100">
                    <div className="flex overflow-x-auto scrollbar-hide px-2">
                        {[
                            { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
                            { id: 'treatments', label: 'العلاجات', icon: Stethoscope },
                            { id: 'inventory', label: 'المخزون', icon: Package },
                            { id: 'devices', label: 'الأصول الثابتة (أجهزة / أثاث)', icon: Monitor },
                            { id: 'settings', label: 'الإعدادات', icon: Settings }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Tab Content */}
            <div className="transition-all duration-300">
                {renderActiveTab()}
            </div>
        </div>
    );
};
