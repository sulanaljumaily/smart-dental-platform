import React, { useState } from 'react';
import { LayoutDashboard, Stethoscope, Package, Monitor, ClipboardList } from 'lucide-react';
import { Card } from '../../../components/common/Card';

// Import sub-sections
import { AssetsOverview } from './sections/assets/AssetsOverview';
import { AssetsTreatments } from './sections/assets/AssetsTreatments';
// Swapped to main page component which has Supabase integration
import { ClinicInventoryPage } from './ClinicInventoryPage';
import { AssetsDevices } from './sections/assets/AssetsDevices';

interface ClinicAssetsPageProps {
    clinicId?: string;
}

export const ClinicAssetsPage: React.FC<ClinicAssetsPageProps> = ({ clinicId = '1' }) => {
    const [activeTab, setActiveTab] = useState('overview');

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'overview':
                return <AssetsOverview />;
            case 'treatments':
                return <AssetsTreatments />;
            case 'inventory':
                return <ClinicInventoryPage clinicId={clinicId} />;
            case 'devices':
                return <AssetsDevices clinicId={clinicId} />;
            default:
                return <AssetsOverview />;
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
                            { id: 'devices', label: 'الأصول الثابتة (أجهزة / أثاث)', icon: Monitor }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
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
