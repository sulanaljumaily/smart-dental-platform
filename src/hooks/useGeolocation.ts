import { useState } from 'react';

export interface Location {
    lat: number;
    lng: number;
}

export interface GeolocationState {
    location: Location | null;
    error: string | null;
    loading: boolean;
}

export const useGeolocation = () => {
    const [state, setState] = useState<GeolocationState>({
        location: null,
        error: null,
        loading: false,
    });

    const getLocation = () => {
        if (typeof window !== 'undefined' && (window as any).AndroidNative?.requestLocationPermission) {
            try {
                (window as any).AndroidNative.requestLocationPermission();
            } catch (e) {
                console.warn('AndroidNative.requestLocationPermission failed:', e);
            }
        }

        if (!navigator.geolocation) {
            setState(prev => ({ ...prev, error: 'المتصفح أو الجهاز لا يدعم تحديد الموقع الجغرافي' }));
            return;
        }

        setState(prev => ({ ...prev, loading: true, error: null }));

        const onSuccess = (position: GeolocationPosition) => {
            setState({
                location: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                },
                error: null,
                loading: false,
            });
        };

        const onFinalError = (error: GeolocationPositionError) => {
            let errorMessage = 'حدث خطأ أثناء تحديد الموقع الجغرافي';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'يرجى السماح بصلاحية الموقع للتطبيق وتفعيل خدمة الموقع (GPS) في جهازك';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'خدمة تحديد الموقع (GPS) غير مفعلة أو غير متوفرة حالياً';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'انتهت مهلة تحديد الموقع، يرجى التأكد من تفعيل الـ GPS والمحاولة مجدداً';
                    break;
            }
            setState({
                location: null,
                error: errorMessage,
                loading: false,
            });
        };

        // Try high accuracy first, then fallback to network/coarse location if it times out or fails
        navigator.geolocation.getCurrentPosition(
            onSuccess,
            (err) => {
                if (err.code !== err.PERMISSION_DENIED) {
                    navigator.geolocation.getCurrentPosition(
                        onSuccess,
                        onFinalError,
                        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                    );
                } else {
                    onFinalError(err);
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Haversine formula to calculate distance between two points in km
    const calculateDistance = (loc1: Location, loc2: Location): number => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(loc2.lat - loc1.lat);
        const dLng = deg2rad(loc2.lng - loc1.lng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(loc1.lat)) * Math.cos(deg2rad(loc2.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return Math.round(d * 10) / 10; // Round to 1 decimal place
    };

    const deg2rad = (deg: number): number => {
        return deg * (Math.PI / 180);
    };

    const clearLocation = () => {
        setState({
            location: null,
            error: null,
            loading: false,
        });
    };

    return {
        ...state,
        getLocation,
        clearLocation,
        calculateDistance,
    };
};
