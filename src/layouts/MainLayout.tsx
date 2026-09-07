import React from 'react';
import { GlobalHeader } from '../components/layout/GlobalHeader';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { Outlet, useLocation } from 'react-router-dom';

export const MainLayout: React.FC = () => {
    const location = useLocation();
    const shouldHideHeader = location.pathname.includes('/community') || 
                            location.pathname.includes('/jobs') || 
                            location.pathname.includes('/diagnosis/ai');

    return (
        <div
            className="min-h-screen bg-white"
            style={{
                paddingBottom: 'calc(3.25rem + max(calc(env(safe-area-inset-bottom, 0px) * 0.5), 4px))',
                paddingTop: shouldHideHeader ? 'env(safe-area-inset-top, 0px)' : undefined
            }}
        >
            {!shouldHideHeader && (
                <GlobalHeader
                    cartItemsCount={3}
                    notificationsCount={2}
                    messagesCount={5}
                />
            )}
            <Outlet />
            <BottomNavigation />
        </div>
    );
};
