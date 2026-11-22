import React, { useState, useEffect, useMemo } from 'react';
import { getInstantCache, setCache } from '../../lib/offline/db';
import { supabase } from '../../lib/supabase';
import { usePlatform, AppReleaseHistoryItem } from '../../contexts/PlatformContext';
import {
    RefreshCw,
    Calendar,
    Shield,
    Zap,
    Star,
    Monitor,
    Smartphone,
    Apple,
    Globe,
    Download,
    Sparkles,
    AlertCircle,
} from 'lucide-react';
import { LoadingState } from '../../components/common/LoadingState';

interface UnifiedUpdateItem {
    id: string;
    title: string;
    content: string;
    version: string;
    releaseDate: string;
    type: 'major' | 'minor' | 'patch' | 'security';
    platforms: Array<'windows' | 'android' | 'ios' | 'web'>;
    windowsUrl?: string;
    androidProUrl?: string;
    androidPatientUrl?: string;
    iosUrl?: string;
    isMandatory?: boolean;
    source: 'apps_manager' | 'legacy';
}

export const UpdatesPage: React.FC = () => {
    const { appsConfig, loading: platformLoading } = usePlatform();
    const [legacyUpdates, setLegacyUpdates] = useState<any[]>(
        () => getInstantCache<any[]>('system_updates_list') || []
    );
    const [loadingLegacy, setLoadingLegacy] = useState(false);

    useEffect(() => {
        const fetchLegacy = async () => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;
            setLoadingLegacy(true);
            try {
                const { data, error } = await supabase
                    .from('system_updates')
                    .select('*')
                    .eq('is_published', true)
                    .order('release_date', { ascending: false });

                if (!error && Array.isArray(data)) {
                    setLegacyUpdates(data);
                    setCache('system_updates_list', data, 86400 * 30).catch(() => {});
                }
            } catch (error) {
                console.error('Error fetching legacy updates:', error);
            } finally {
                setLoadingLegacy(false);
            }
        };
        fetchLegacy();
    }, []);

    // Build unified updates list directly from AppsManager (`apps_config`) + legacy fallback
    const updates = useMemo<UnifiedUpdateItem[]>(() => {
        const list: UnifiedUpdateItem[] = [];
        const seenVersions = new Set<string>();

        const history: AppReleaseHistoryItem[] = Array.isArray(appsConfig.releaseHistory)
            ? appsConfig.releaseHistory
            : [];

        // 1. All recorded releases from AppsManager (`إدارة التطبيقات`)
        for (const rel of history) {
            const cleanVer = String(rel.version || '').replace(/^v/i, '').trim();
            if (cleanVer) seenVersions.add(cleanVer);
            list.push({
                id: rel.id || `rel-${cleanVer}`,
                title: rel.title || `تحديث المنصة v${cleanVer}`,
                content: rel.notes || '',
                version: cleanVer || '1.0.0',
                releaseDate: rel.releaseDate || new Date().toISOString(),
                type: rel.type || 'minor',
                platforms: Array.isArray(rel.platforms) && rel.platforms.length > 0
                    ? rel.platforms
                    : ['windows', 'android', 'web'],
                windowsUrl: rel.windowsUrl || appsConfig.windows.updateDownloadUrl || appsConfig.windows.exeDownloadUrl || undefined,
                androidProUrl: rel.androidProUrl || appsConfig.android.directApkProUrl || appsConfig.android.playStoreProUrl || undefined,
                androidPatientUrl: rel.androidPatientUrl || appsConfig.android.directApkPatientUrl || appsConfig.android.playStorePatientUrl || undefined,
                iosUrl: rel.iosUrl || appsConfig.ios.appStoreProUrl || undefined,
                isMandatory: rel.isMandatory,
                source: 'apps_manager',
            });
        }

        // 2. Always include the current active version configured in AppsManager if not already in releaseHistory
        const activeVer = String(appsConfig.windows.latestVersion || '').replace(/^v/i, '').trim();
        if (activeVer && !seenVersions.has(activeVer)) {
            seenVersions.add(activeVer);
            const activePlatforms: Array<'windows' | 'android' | 'ios' | 'web'> = ['web'];
            if (appsConfig.windows.exeStatus === 'active' || appsConfig.windows.exeDownloadUrl || appsConfig.windows.updateDownloadUrl) {
                activePlatforms.unshift('windows');
            }
            if (appsConfig.android.directApkEnabled || appsConfig.android.playStoreStatus === 'active') {
                activePlatforms.push('android');
            }
            if (appsConfig.ios.appStoreStatus === 'active') {
                activePlatforms.push('ios');
            }

            list.push({
                id: `apps-current-${activeVer}`,
                title: `الإصدار الحالي لمنصة وتطبيقات Dental Platform`,
                content:
                    appsConfig.windows.releaseNotes ||
                    'تحسينات في الأداء والمزامنة التلقائية ودعم العمل بدون إنترنت.',
                version: activeVer,
                releaseDate: appsConfig.windows.releaseDate || new Date().toISOString(),
                type: appsConfig.windows.forceUpdate ? 'major' : 'minor',
                platforms: activePlatforms,
                windowsUrl: appsConfig.windows.updateDownloadUrl || appsConfig.windows.exeDownloadUrl || undefined,
                androidProUrl: appsConfig.android.directApkProUrl || appsConfig.android.playStoreProUrl || undefined,
                androidPatientUrl: appsConfig.android.directApkPatientUrl || appsConfig.android.playStorePatientUrl || undefined,
                iosUrl: appsConfig.ios.appStoreProUrl || undefined,
                isMandatory: appsConfig.windows.forceUpdate,
                source: 'apps_manager',
            });
        }

        // 3. Append any older legacy `system_updates` not already covered
        for (const u of legacyUpdates) {
            const cleanVer = String(u.version || '').replace(/^v/i, '').trim();
            if (cleanVer && seenVersions.has(cleanVer)) continue;
            if (cleanVer) seenVersions.add(cleanVer);
            list.push({
                id: String(u.id),
                title: u.title || `تحديث v${cleanVer}`,
                content: u.content || '',
                version: cleanVer || '1.0.0',
                releaseDate: u.release_date || u.created_at || new Date().toISOString(),
                type: (u.type || 'minor') as UnifiedUpdateItem['type'],
                platforms: Array.isArray(u.platforms) ? u.platforms : ['web'],
                source: 'legacy',
            });
        }

        return list.sort(
            (a, b) => new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime()
        );
    }, [appsConfig, legacyUpdates]);

    const getUpdateIcon = (type: UnifiedUpdateItem['type']) => {
        switch (type) {
            case 'major':
                return <Star className="w-6 h-6 text-purple-600" />;
            case 'security':
                return <Shield className="w-6 h-6 text-green-600" />;
            case 'minor':
            case 'patch':
            default:
                return <Zap className="w-6 h-6 text-blue-600" />;
        }
    };

    const getUpdateColor = (type: UnifiedUpdateItem['type']) => {
        switch (type) {
            case 'major':
                return 'bg-purple-100 border-purple-200';
            case 'security':
                return 'bg-green-100 border-green-200';
            default:
                return 'bg-blue-100 border-blue-200';
        }
    };

    const getTypeLabel = (type: UnifiedUpdateItem['type']) => {
        switch (type) {
            case 'major': return 'تحديث رئيسي';
            case 'security': return 'تحديث أمني';
            case 'patch': return 'إصلاحات سريعة';
            default: return 'تحسينات ومزايا';
        }
    };

    const renderPlatformBadge = (platform: 'windows' | 'android' | 'ios' | 'web') => {
        switch (platform) {
            case 'windows':
                return (
                    <span key={platform} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        <Monitor className="w-3 h-3" />
                        ويندوز
                    </span>
                );
            case 'android':
                return (
                    <span key={platform} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <Smartphone className="w-3 h-3" />
                        أندرويد
                    </span>
                );
            case 'ios':
                return (
                    <span key={platform} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        <Apple className="w-3 h-3" />
                        آيفون iOS
                    </span>
                );
            case 'web':
                return (
                    <span key={platform} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Globe className="w-3 h-3" />
                        الويب PWA
                    </span>
                );
        }
    };

    if (platformLoading && loadingLegacy && updates.length === 0) {
        return <LoadingState />;
    }

    return (
        <div className="container mx-auto px-4 py-8" dir="rtl">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-l from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/15 backdrop-blur-sm p-3.5 rounded-2xl border border-white/20">
                            <RefreshCw className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/15 px-2.5 py-0.5 rounded-full mb-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>مرتبط مباشرة بمركز إدارة التطبيقات</span>
                            </div>
                            <h1 className="text-2xl font-bold">سجل التحديثات والإصدارات</h1>
                            <p className="text-white/80 text-sm">
                                تابع تاريخ التحديثات وتفاصيل المزايا الجديدة وإصدارات تطبيقات المنصة
                            </p>
                        </div>
                    </div>

                    {appsConfig.windows.latestVersion && (
                        <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-white/20 text-center shrink-0">
                            <div className="text-[11px] text-white/80 font-medium">أحدث إصدار متاح</div>
                            <div className="text-lg font-mono font-extrabold tracking-wide" dir="ltr">
                                v{appsConfig.windows.latestVersion}
                            </div>
                        </div>
                    )}
                </div>

                {/* Timeline List */}
                <div className="space-y-6">
                    {updates.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">لا توجد تحديثات مسجلة حالياً</p>
                        </div>
                    ) : (
                        updates.map((update, index) => (
                            <div
                                key={update.id}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group"
                            >
                                {/* Accent Strip */}
                                <div
                                    className={`absolute top-0 right-0 w-1.5 h-full ${
                                        update.type === 'major'
                                            ? 'bg-purple-500'
                                            : update.type === 'security'
                                            ? 'bg-green-500'
                                            : 'bg-blue-500'
                                    }`}
                                />

                                <div className="flex flex-col md:flex-row gap-5 pr-2">
                                    <div className="flex-shrink-0">
                                        <div
                                            className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${getUpdateColor(
                                                update.type
                                            )}`}
                                        >
                                            {getUpdateIcon(update.type)}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                                                {update.title}
                                            </h2>
                                            <span
                                                className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-mono font-bold border border-gray-200"
                                                dir="ltr"
                                            >
                                                v{update.version}
                                            </span>
                                            {index === 0 && (
                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                                    الأحدث
                                                </span>
                                            )}
                                            {update.isMandatory && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                                                    <AlertCircle className="w-3 h-3" />
                                                    تحديث مهم
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                                            <span className="flex items-center gap-1 font-medium">
                                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                                {new Date(update.releaseDate).toLocaleDateString('ar-IQ', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                })}
                                            </span>

                                            <span
                                                className={`px-2 py-0.5 rounded-full font-semibold ${
                                                    update.type === 'major'
                                                        ? 'bg-purple-50 text-purple-700'
                                                        : update.type === 'security'
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-blue-50 text-blue-700'
                                                }`}
                                            >
                                                {getTypeLabel(update.type)}
                                            </span>

                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {update.platforms.map((p) => renderPlatformBadge(p))}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                            {update.content || 'تحسينات عامة في الأداء والاستقرار.'}
                                        </div>

                                        {/* Direct Download Buttons when available */}
                                        {(update.windowsUrl || update.androidProUrl || update.iosUrl) && (
                                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                                                {update.windowsUrl && (
                                                    <a
                                                        href={update.windowsUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        <span>تحميل نسخة ويندوز</span>
                                                    </a>
                                                )}
                                                {update.androidProUrl && (
                                                    <a
                                                        href={update.androidProUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                                                    >
                                                        <Smartphone className="w-3.5 h-3.5" />
                                                        <span>تحميل تطبيق أندرويد</span>
                                                    </a>
                                                )}
                                                {update.iosUrl && (
                                                    <a
                                                        href={update.iosUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                                                    >
                                                        <Apple className="w-3.5 h-3.5" />
                                                        <span>متجر App Store</span>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
