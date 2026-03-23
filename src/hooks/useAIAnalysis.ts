import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { aiService } from '../services/ai/AIService';
import { AIAnalysisResult } from '../types/ai';
import { toast } from 'sonner';

export interface AIAnalysis {
    id: string;
    image_url: string;
    status: 'processing' | 'completed' | 'failed';
    result_json: AIAnalysisResult | null;
    created_at: string;
    patient_id?: number;
}

export const useAIAnalysis = (patientId?: string) => {
    const { user } = useAuth();
    const [history, setHistory] = useState<AIAnalysis[]>([]);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        if (user) fetchHistory();
    }, [user, patientId]);

    const fetchHistory = async () => {
        if (!user) return;

        let query = supabase
            .from('ai_analyses')
            .select('*')
            .eq('doctor_id', user.id)
            .order('created_at', { ascending: false });

        if (patientId) {
            query = query.eq('patient_id', patientId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching AI history:', error);
        } else {
            setHistory(data || []);
        }
    };

    const saveAnalysisToHistory = async (imageUrl: string, status: 'processing' | 'completed', result?: AIAnalysisResult, overridePatientId?: number) => {
        if (!user) return null;

        const targetPatientId = overridePatientId || (patientId ? parseInt(patientId) : undefined);

        const { data, error } = await supabase
            .from('ai_analyses')
            .insert({
                doctor_id: user.id,
                image_url: imageUrl,
                status: status,
                patient_id: targetPatientId,
                result_json: result || null
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    };

    const analyzeImage = async (file: File, overridePatientId?: number) => {
        if (!user) return;
        setUploading(true);
        try {
            // 1. Upload Image to Storage
            const filename = `ai/${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('lab-attachments')
                .upload(filename, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('lab-attachments').getPublicUrl(filename);
            setUploading(false);
            setAnalyzing(true);

            // 2. Create DB Entry (Processing)
            // Note: Since we fixed the mock insert to support chaining, .select().single() works.
            const analysisEntry = await saveAnalysisToHistory(publicUrl, 'processing', undefined, overridePatientId);

            // Update UI immediately
            if (analysisEntry) {
                setHistory(prev => [analysisEntry, ...prev]);
            }

            // 3. Trigger AI Service Analysis
            const result = await aiService.analyzeImage(publicUrl);

            // 4. Update DB Entry (Completed)
            if (analysisEntry) {
                const { error: updateError } = await supabase
                    .from('ai_analyses')
                    .update({
                        status: 'completed',
                        result_json: result
                    })
                    .eq('id', analysisEntry.id);

                if (updateError) throw updateError;

                // Update UI with result
                setHistory(prev => prev.map(item =>
                    item.id === analysisEntry.id
                        ? { ...item, status: 'completed', result_json: result }
                        : item
                ));
            }

            toast.success('تم اكتمال التحليل بنجاح');
            return result;

        } catch (error: any) {
            console.error('Analysis failed:', error);
            toast.error(error.message || 'فشل في عملية التحليل');
            setUploading(false); // Ensure uploading state is reset on error
            throw error;
        } finally {
            setAnalyzing(false);
        }
    };

    const analyzeExistingImage = async (url: string) => {
        if (!user) return;
        setAnalyzing(true);
        try {
            const targetPatientId = patientId ? parseInt(patientId) : undefined;

            // 1. Create DB Entry (Processing)
            const analysisEntry = await saveAnalysisToHistory(url, 'processing', undefined, targetPatientId);

            if (analysisEntry) {
                setHistory(prev => [analysisEntry, ...prev]);
            }

            // 2. Trigger AI Service Analysis
            const result = await aiService.analyzeImage(url);

            // 3. Update DB
            if (analysisEntry) {
                const { error: updateError } = await supabase
                    .from('ai_analyses')
                    .update({
                        status: 'completed',
                        result_json: result
                    })
                    .eq('id', analysisEntry.id);

                if (updateError) throw updateError;

                setHistory(prev => prev.map(item =>
                    item.id === analysisEntry.id
                        ? { ...item, status: 'completed', result_json: result }
                        : item
                ));
            }

            toast.success('تم تحليل الصورة من الأرشيف');
            return result;

        } catch (error: any) {
            console.error('Archive analysis failed:', error);
            toast.error('فشل تحليل الصورة');
            throw error;
        } finally {
            setAnalyzing(false);
        }
    };

    return {
        history,
        uploading,
        analyzing,
        analyzeImage,
        analyzeExistingImage,
        refresh: fetchHistory
    };
};
