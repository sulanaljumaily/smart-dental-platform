import { useState, useEffect, useCallback } from 'react';

export interface PurchaseItem {
    id?: string;
    name: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    unit?: string;
    isNewItem?: boolean;
    specialty?: string;
    type?: string;
    category?: string;
}

export interface WarehousePurchase {
    id: string;
    clinicId: string;
    purchaseType: 'inventory' | 'fixed_asset';
    invoiceNumber?: string;
    supplier?: string;
    purchaseDate: string;
    totalAmount: number;
    pricingMode: 'itemized' | 'lump_sum';
    paymentMethod: 'cash' | 'card' | 'bank' | 'credit';
    items: PurchaseItem[];
    notes?: string;
    recordedById?: string;
    recorderName?: string;
    createdAt: string;
}

export interface CustodySettlementRequest {
    id: string;
    clinicId: string;
    requestedAmount: number;
    reason?: string;
    status: 'pending' | 'settled' | 'rejected';
    requestedAt: string;
    requestedByName?: string;
    settledAt?: string;
    settledTxId?: string;
}

export const useWarehousePurchases = (clinicId?: string) => {
    const [purchases, setPurchases] = useState<WarehousePurchase[]>([]);
    const [pendingSettlementRequest, setPendingSettlementRequest] = useState<CustodySettlementRequest | null>(null);
    const [loading, setLoading] = useState(true);

    const purchasesStorageKey = `warehouse_purchases_${clinicId || 'default'}`;
    const settlementStorageKey = `warehouse_settlement_request_${clinicId || 'default'}`;

    // Load Purchases & Settlement Request
    const loadData = useCallback(() => {
        if (!clinicId) {
            setLoading(false);
            return;
        }

        try {
            // 1. Load Purchases from LocalStorage
            const storedPurchases = localStorage.getItem(purchasesStorageKey);
            if (storedPurchases) {
                setPurchases(JSON.parse(storedPurchases));
            } else {
                setPurchases([]);
            }

            // 2. Load Settlement Request
            const storedSettlement = localStorage.getItem(settlementStorageKey);
            if (storedSettlement) {
                const parsed: CustodySettlementRequest = JSON.parse(storedSettlement);
                if (parsed.status === 'pending') {
                    setPendingSettlementRequest(parsed);
                } else {
                    setPendingSettlementRequest(null);
                }
            } else {
                setPendingSettlementRequest(null);
            }
        } catch (e) {
            console.error('Error loading warehouse purchases data:', e);
        } finally {
            setLoading(false);
        }
    }, [clinicId, purchasesStorageKey, settlementStorageKey]);

    useEffect(() => {
        loadData();

        // Cross-tab synchronization
        const handleStorageEvent = (e: StorageEvent) => {
            if (e.key === purchasesStorageKey || e.key === settlementStorageKey) {
                loadData();
            }
        };

        const handleCustomEvent = () => {
            loadData();
        };

        window.addEventListener('storage', handleStorageEvent);
        window.addEventListener('warehouse_settlement_updated', handleCustomEvent);
        window.addEventListener('warehouse_purchases_updated', handleCustomEvent);
        return () => {
            window.removeEventListener('storage', handleStorageEvent);
            window.removeEventListener('warehouse_settlement_updated', handleCustomEvent);
            window.removeEventListener('warehouse_purchases_updated', handleCustomEvent);
        };
    }, [loadData, purchasesStorageKey, settlementStorageKey]);

    // Add New Purchase
    const addPurchase = async (purchaseData: Omit<WarehousePurchase, 'id' | 'createdAt'>) => {
        const newPurchase: WarehousePurchase = {
            ...purchaseData,
            id: `purch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            createdAt: new Date().toISOString()
        };

        const updated = [newPurchase, ...purchases];
        setPurchases(updated);
        try {
            localStorage.setItem(purchasesStorageKey, JSON.stringify(updated));
            window.dispatchEvent(new Event('warehouse_purchases_updated'));
        } catch (e) {
            console.error('Failed to save purchase to localStorage', e);
        }

        return newPurchase;
    };

    // Delete a purchase
    const deletePurchase = async (purchaseId: string) => {
        const updated = purchases.filter(p => p.id !== purchaseId);
        setPurchases(updated);
        try {
            localStorage.setItem(purchasesStorageKey, JSON.stringify(updated));
            window.dispatchEvent(new Event('warehouse_purchases_updated'));
        } catch (e) {
            console.error('Failed to remove purchase from localStorage', e);
        }
    };

    // Create Settlement Request from Warehouse to Finance
    const createSettlementRequest = async (amount: number, reason?: string, requestedByName?: string) => {
        const request: CustodySettlementRequest = {
            id: `settle_req_${Date.now()}`,
            clinicId: clinicId || '19',
            requestedAmount: amount,
            reason: reason || 'تسوية عهدة المخزن وتغطية المشتريات الفعلية',
            status: 'pending',
            requestedAt: new Date().toISOString(),
            requestedByName: requestedByName || 'أمين المخزن'
        };

        setPendingSettlementRequest(request);
        try {
            localStorage.setItem(settlementStorageKey, JSON.stringify(request));
            window.dispatchEvent(new Event('warehouse_settlement_updated'));
        } catch (e) {
            console.error('Failed to save settlement request', e);
        }

        return request;
    };

    // Mark Settlement as Settled (called by Finance when expense approved)
    const markSettlementResolved = async (requestId: string, settledTxId?: string) => {
        if (!pendingSettlementRequest || pendingSettlementRequest.id !== requestId) {
            try {
                const stored = localStorage.getItem(settlementStorageKey);
                if (stored) {
                    const parsed: CustodySettlementRequest = JSON.parse(stored);
                    const updated: CustodySettlementRequest = {
                        ...parsed,
                        status: 'settled',
                        settledAt: new Date().toISOString(),
                        settledTxId
                    };
                    localStorage.setItem(settlementStorageKey, JSON.stringify(updated));
                    window.dispatchEvent(new Event('warehouse_settlement_updated'));
                }
            } catch (e) {
                console.error(e);
            }
            setPendingSettlementRequest(null);
            return;
        }

        const updated: CustodySettlementRequest = {
            ...pendingSettlementRequest,
            status: 'settled',
            settledAt: new Date().toISOString(),
            settledTxId
        };

        setPendingSettlementRequest(null);
        try {
            localStorage.setItem(settlementStorageKey, JSON.stringify(updated));
            window.dispatchEvent(new Event('warehouse_settlement_updated'));
        } catch (e) {
            console.error('Failed to resolve settlement request', e);
        }
    };

    // Cancel / Reject Settlement Request
    const cancelSettlementRequest = async (requestId?: string) => {
        setPendingSettlementRequest(null);
        try {
            localStorage.removeItem(settlementStorageKey);
            window.dispatchEvent(new Event('warehouse_settlement_updated'));
        } catch (e) {
            console.error('Failed to cancel settlement request', e);
        }
    };

    // Total Purchases Amount
    const totalPurchasesAmount = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

    return {
        purchases,
        totalPurchasesAmount,
        pendingSettlementRequest,
        loading,
        addPurchase,
        deletePurchase,
        createSettlementRequest,
        markSettlementResolved,
        cancelSettlementRequest,
        refreshPurchases: loadData
    };
};
