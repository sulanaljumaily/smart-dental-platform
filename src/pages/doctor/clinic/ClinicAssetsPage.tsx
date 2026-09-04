import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, Package, Monitor, ClipboardList, Wallet, ShoppingCart } from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { AddPurchaseModal } from '../../../components/inventory/AddPurchaseModal';

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

export const ClinicAssetsPage: React.FC<ClinicAssetsPageProps> = ({ clinicId: propClinicId }) => {
    const { clinicId: routeClinicId } = useParams<{ clinicId: string }>();
    const clinicId = propClinicId?.toString() || routeClinicId || '19';

    const [activeTab, setActiveTab] = useState('overview');
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'overview':
                return <AssetsOverview clinicId={clinicId} />;
            case 'treatments':
                return <AssetsTreatments clinicId={clinicId} />;
            case 'inventory':
                return <ClinicInventoryPage clinicId={clinicId} onNavigateToTreasury={() => setActiveTab('settings')} />;
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
                <div className="border-b border-gray-100 flex items-center justify-between px-2 sm:px-4">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
                            { id: 'treatments', label: 'العلاجات', icon: Stethoscope },
                            { id: 'inventory', label: 'المخزون', icon: Package },
                            { id: 'devices', label: 'الأصول الثابتة (أجهزة / أثاث)', icon: Monitor },
                            { id: 'settings', label: 'إدارة وصندوق المخزن', icon: Wallet }
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

                    <button
                        onClick={() => setShowPurchaseModal(true)}
                        className="hidden sm:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-sm transition-all shrink-0 my-1"
                    >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>إضافة مشتريات</span>
                    </button>
                </div>
            </Card>

            {/* Tab Content */}
            <div className="transition-all duration-300">
                {renderActiveTab()}
            </div>

            {/* Add Purchase Modal */}
            <AddPurchaseModal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                clinicId={clinicId}
            />
        </div>
    );
};
