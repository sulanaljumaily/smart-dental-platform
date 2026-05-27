import { AIAgentConfig, AIAnalysisResult } from '../../types/ai';
import { DEFAULT_AI_CONFIGS } from './defaultConfig';
import { supabase } from '../../lib/supabase';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;

class AIService {
    private configs: Record<string, AIAgentConfig> = {};
    private initialized = false;

    constructor() {
        this.loadConfigs();
    }

    async loadConfigs() {
        try {
            const { data, error } = await supabase
                .from('ai_agents')
                .select('*');

            if (data && !error) {
                const configMap: Record<string, AIAgentConfig> = {};
                data.forEach((agent: any) => {
                    configMap[agent.id] = {
                        id: agent.id,
                        name: agent.name,
                        description: agent.description,
                        provider: agent.provider,
                        model: agent.model,
                        isActive: agent.is_active,
                        temperature: agent.temperature,
                        systemRules: agent.system_rules,
                        capabilities: agent.capabilities,
                        apiKey: agent.api_key
                    } as AIAgentConfig;
                });
                this.configs = configMap;
                this.initialized = true;
            } else {
                console.warn('Failed to load AI configs from DB, using defaults.', error);
                this.configs = DEFAULT_AI_CONFIGS;
                this.initialized = true;
            }
        } catch (e) {
            console.error('Error loading AI configs:', e);
            this.configs = DEFAULT_AI_CONFIGS;
            this.initialized = true;
        }
    }

    getConfigs(): AIAgentConfig[] {
        return Object.values(this.configs);
    }

    getConfig(type: string): AIAgentConfig {
        return this.configs[type] || DEFAULT_AI_CONFIGS[type];
    }

    async updateConfig(type: string, updates: Partial<AIAgentConfig>) {
        if (this.configs[type]) {
            this.configs[type] = { ...this.configs[type], ...updates };
        }

        const currentConfig = this.configs[type] || DEFAULT_AI_CONFIGS[type];
        const mergedConfig = { ...currentConfig, ...updates };

        const { error } = await supabase
            .from('ai_agents')
            .upsert({
                id: type,
                name: mergedConfig.name,
                description: mergedConfig.description,
                provider: mergedConfig.provider,
                model: mergedConfig.model,
                temperature: mergedConfig.temperature,
                system_rules: mergedConfig.systemRules,
                is_active: mergedConfig.isActive,
                api_key: mergedConfig.apiKey,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) {
            console.error('Error updating AI config:', error);
            throw error;
        }
    }

    async getUsageStats() {
        try {
            const { data: allClinics, error: clinicsError } = await supabase
                .from('clinics')
                .select('id, name, owner_id, city, image_url, is_active')
                .eq('is_active', true);

            if (clinicsError) throw clinicsError;

            const ownerIds = allClinics?.map(c => c.owner_id).filter(Boolean) || [];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', ownerIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]));

            const { data: usageLogs, error: logsError } = await supabase
                .from('ai_usage_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (logsError) throw logsError;

            const { data: subscriptions } = await supabase
                .from('user_subscriptions')
                .select('user_id, plan_id, status, subscription_plans (id, name, name_en, limits)')
                .in('user_id', ownerIds)
                .in('status', ['active', 'trialing']);

            const { data: allPlans } = await supabase
                .from('subscription_plans')
                .select('id, name, name_en, price, limits');

            const defaultPlan = allPlans?.find(p =>
                (typeof p.price === 'number' && p.price === 0) ||
                p.name_en?.toLowerCase().includes('basic') ||
                p.name_en?.toLowerCase().includes('free')
            );

            const clinicStatsMap = new Map();
            allClinics?.forEach(clinic => {
                const sub = subscriptions?.find(s => s.user_id === clinic.owner_id);
                const rawPlan = sub?.subscription_plans;
                let activePlan: any = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
                let planName = '';
                let limit: string | number = 0;

                if (activePlan) {
                    planName = activePlan.name || activePlan.name_en || 'Plan';
                } else if (defaultPlan) {
                    activePlan = defaultPlan;
                    planName = defaultPlan.name || defaultPlan.name_en || 'Basic';
                } else {
                    planName = 'Basic';
                }

                if (activePlan?.limits) {
                    try {
                        const limitsObj = typeof activePlan.limits === 'string' ? JSON.parse(activePlan.limits) : activePlan.limits;
                        const maxAi = limitsObj?.max_ai;
                        if (maxAi !== undefined && maxAi !== null) {
                            const numMax = Number(maxAi);
                            limit = numMax > 1000 ? '∞' : numMax;
                        }
                    } catch (e) {
                        console.error('Error parsing limits for clinic:', clinic.id, e);
                    }
                }

                const doctorName = profileMap.get(clinic.owner_id) || 'Unknown Doctor';
                clinicStatsMap.set(clinic.id, {
                    id: clinic.id,
                    clinic: clinic.name || 'Unknown Clinic',
                    doctor: doctorName,
                    plan: planName,
                    used: 0,
                    limit: limit,
                    lastUse: 'غير مستخدم',
                    status: 'active'
                });
            });

            const visitorStatsMap = new Map();
            usageLogs?.forEach(log => {
                if (log.user_type === 'clinic' && log.clinic_id) {
                    if (clinicStatsMap.has(log.clinic_id)) {
                        const entry = clinicStatsMap.get(log.clinic_id);
                        entry.used += 1;
                        entry.lastUse = new Date(log.created_at).toLocaleString('ar-EG');
                    }
                } else {
                    const date = new Date(log.created_at).toLocaleDateString('en-CA');
                    if (!visitorStatsMap.has(date)) {
                        visitorStatsMap.set(date, { date, service: 'المساعد الذكي للمرضى', requests: 0, tokens: 0, uniqueUsers: new Set() });
                    }
                    const entry = visitorStatsMap.get(date);
                    entry.tokens += (log.tokens_used || 0);
                    entry.requests += 1;
                    if (log.session_id) entry.uniqueUsers.add(log.session_id);
                }
            });

            return {
                clinics: Array.from(clinicStatsMap.values()),
                visitors: Array.from(visitorStatsMap.values()).map((v: any) => ({
                    date: v.date, service: v.service, requests: v.requests, tokens: v.tokens, users: v.uniqueUsers.size
                }))
            };
        } catch (e) {
            console.error('Failed to get usage stats', e);
            return { clinics: [], visitors: [] };
        }
    }

    /**
     * Call the AI Provider API directly from the browser
     */
    private async callDirectAPI(config: AIAgentConfig, messages: any[], imageBase64?: string, imageMimeType?: string, isJsonFormat: boolean = false): Promise<any> {
        const { provider, model, apiKey, temperature } = config;
        
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('مفتاح API غير متوفر لهذا الوكيل. يرجى إضافته من إعدادات المنصة.');
        }

        if (provider === 'openai' || provider === 'deepseek') {
            const endpoint = provider === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
            
            const formattedMessages = messages.map(m => {
                if (m.role === 'user' && imageBase64) {
                    return {
                        role: 'user',
                        content: [
                            { type: 'text', text: m.content },
                            { type: 'image_url', image_url: { url: `data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}` } }
                        ]
                    };
                }
                return { role: m.role, content: m.content };
            });

            const body: any = {
                model: model || (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o'),
                messages: formattedMessages,
                temperature: temperature || 0.5,
            };

            if (isJsonFormat && provider === 'openai') {
                body.response_format = { type: 'json_object' };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `خطأ في الاتصال بمزود ${provider}`);
            }

            const data = await response.json();
            return {
                response: data.choices[0]?.message?.content || '',
                raw: JSON.stringify(data)
            };
        } 
        else if (provider === 'google') {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-pro'}:generateContent?key=${apiKey}`;
            
            let systemInstruction = messages.find(m => m.role === 'system')?.content;
            const history = messages.filter(m => m.role !== 'system').map(m => {
                const parts: any[] = [{ text: m.content }];
                if (m.role === 'user' && imageBase64 && m === messages[messages.length - 1]) {
                    parts.push({
                        inline_data: {
                            mime_type: imageMimeType || 'image/jpeg',
                            data: imageBase64
                        }
                    });
                }
                return {
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts
                };
            });

            const body: any = {
                contents: history,
                generationConfig: {
                    temperature: temperature || 0.5
                }
            };
            if (systemInstruction) {
                body.systemInstruction = { parts: [{ text: systemInstruction }] };
            }
            if (isJsonFormat) {
                body.generationConfig.responseMimeType = "application/json";
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `خطأ في الاتصال بمزود ${provider}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return {
                response: text,
                raw: JSON.stringify(data)
            };
        }
        else if (provider === 'anthropic') {
            const endpoint = 'https://api.anthropic.com/v1/messages';
            
            const system = messages.find(m => m.role === 'system')?.content;
            const history = messages.filter(m => m.role !== 'system').map(m => {
                const content: any[] = [{ type: 'text', text: m.content }];
                if (m.role === 'user' && imageBase64 && m === messages[messages.length - 1]) {
                    content.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: imageMimeType || 'image/jpeg',
                            data: imageBase64
                        }
                    });
                }
                return { role: m.role, content };
            });

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerously-allow-browser': 'true'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-5-sonnet-20241022',
                    system,
                    messages: history,
                    temperature: temperature || 0.5,
                    max_tokens: 4096
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `خطأ في الاتصال بمزود ${provider}`);
            }

            const data = await response.json();
            const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
            return {
                response: text,
                raw: JSON.stringify(data)
            };
        }

        throw new Error(`مزود الخدمة (${provider}) غير مدعوم حالياً.`);
    }

    async analyzeImage(
        imageUrl: string,
        context?: string,
        sessionId?: string,
        clinicId?: number,
        base64Data?: string,
        mimeType?: string,
        clinicTreatments?: Array<{ name: string; price: number; category?: string }>
    ): Promise<AIAnalysisResult> {
        if (!this.initialized) await this.loadConfigs();

        const config = this.getConfig('image_analysis');
        if (!config.isActive) throw new Error('خدمة تحليل الصور غير مفعلة');

        try {
            // Build Context
            let fullContext = config.systemRules;
            if (clinicTreatments && clinicTreatments.length > 0) {
                fullContext += `\n\n## CLINIC TREATMENT CATALOG (use ONLY these for cost estimation)\nCATALOG: ${JSON.stringify(clinicTreatments)}`;
            }
            
            fullContext += `\n\nYou MUST return the response strictly in JSON format matching this structure:
{
  "diagnosis": "Summary in Arabic",
  "severity": "low/medium/high",
  "confidence": 0.9,
  "image_type": "panoramic_xray etc",
  "image_quality": { "rating": "good", "problems": [], "retake_recommended": false },
  "summary": "Detailed clinical summary in Arabic",
  "differential_diagnoses": ["Alternative diagnosis 1 in Arabic (e.g. ليوكوبلاكيا - Leukoplakia)", "Alternative diagnosis 2"],
  "confirmation_methods": ["Practical clinical confirmation method 1 in Arabic (e.g. خزعة نسيجية - Biopsy)", "Clinical method 2"],
  "issues": [
    { 
      "label": "issue label", 
      "tooth_number": "FDI", 
      "category": "caries", 
      "confidence": 0.8, 
      "severity": "high", 
      "description": "desc", 
      "box": [x, y, w, h],
      "differential_diagnoses": ["alternative diagnosis 1 in Arabic", "alternative 2"],
      "confirmation_methods": ["practical test 1 in Arabic", "test 2"]
    }
  ],
  "findings": ["finding 1"],
  "recommendation": "Recommendations"
}`;

            const messages = [
                { role: 'system', content: fullContext },
                { role: 'user', content: context || 'حلل هذه الصورة السنية بدقة وأعط تقريراً تفصيلياً.' }
            ];

            const data = await this.callDirectAPI(config, messages, base64Data, mimeType, true);
            let parsedResult: any = null;

            try {
                // Find JSON block
                const jsonMatch = data.response.match(/```(?:json)?\s*([\s\S]*?)```/);
                const jsonStr = jsonMatch ? jsonMatch[1] : data.response;
                parsedResult = JSON.parse(jsonStr);
            } catch (e) {
                console.warn('Failed to parse AI JSON response:', e);
            }

            if (parsedResult) {
                return {
                    issues: parsedResult.issues || [],
                    summary: parsedResult.summary || parsedResult.diagnosis || '',
                    recommendation: parsedResult.recommendation || '',
                    diagnosis: parsedResult.diagnosis,
                    severity: parsedResult.severity,
                    confidence: parsedResult.confidence,
                    image_type: parsedResult.image_type,
                    image_quality: parsedResult.image_quality,
                    treatment_plan: parsedResult.treatment_plan,
                    doctor_notes: parsedResult.doctor_notes,
                    patient_friendly_summary: parsedResult.patient_friendly_summary,
                    follow_up_schedule: parsedResult.follow_up_schedule,
                    findings: parsedResult.findings || [],
                    total_estimated_cost: parsedResult.total_estimated_cost,
                    has_clinic_catalog: !!(clinicTreatments && clinicTreatments.length > 0),
                    differential_diagnoses: parsedResult.differential_diagnoses || [],
                    confirmation_methods: parsedResult.confirmation_methods || [],
                    metadata: { isMock: false, provider: config.provider, model: config.model }
                } as AIAnalysisResult;
            }

            return {
                issues: [],
                summary: data.response || 'تم التحليل',
                recommendation: '',
                findings: [data.response || ''],
                metadata: { isMock: false, provider: config.provider, model: config.model }
            };
        } catch (error: any) {
            console.error('[AI-Service] Analysis Failed:', error);
            throw new Error(error.message || 'فشل تحليل الصورة');
        }
    }

    async chat(
        agentType: string,
        message: string,
        contextObj?: any,
        userId?: string,
        clinicId?: string,
        sessionId?: string,
        imageBase64?: string,
        imageMimeType?: string,
        history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    ): Promise<string> {
        if (!this.initialized) await this.loadConfigs();

        const config = this.getConfig(agentType);
        if (!config.isActive) return 'نأسف، هذه الخدمة غير مفعلة حالياً.';

        try {
            let systemContent = config.systemRules;
            if (contextObj) {
                systemContent += `\n\nبيانات السياق الإضافية:\n${JSON.stringify(contextObj, null, 2)}`;
            }

            const messages: any[] = [{ role: 'system', content: systemContent }];
            
            if (history && history.length > 0) {
                messages.push(...history);
            }

            messages.push({ role: 'user', content: message });

            const data = await this.callDirectAPI(config, messages, imageBase64, imageMimeType);

            // Log usage if clinic/user ID is provided (fire and forget)
            if (clinicId || userId) {
                supabase.from('ai_usage_logs').insert({
                    agent_id: agentType,
                    user_id: userId,
                    clinic_id: clinicId ? parseInt(clinicId) : null,
                    session_id: sessionId,
                    tokens_used: 0, // Not easily extracted without detailed parsing per provider
                    request_type: 'chat',
                    user_type: userId ? 'clinic' : 'guest'
                }).then(({ error }) => { if (error) console.warn('Failed to log AI usage', error); });
            }

            return data.response;
        } catch (error: any) {
            console.error('[AI-Service] Chat Failed:', error);
            return `عذراً، حدث خطأ أثناء الاتصال بالمساعد الذكي: ${error.message}`;
        }
    }

    async listModels(config: AIAgentConfig): Promise<{ id: string; name: string; description?: string }[]> {
        if (config.provider === 'openai') {
            try {
                const response = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${config.apiKey}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    return data.data
                        .filter((m: any) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3') || m.id.includes('o4'))
                        .map((m: any) => ({ id: m.id, name: m.id }));
                }
            } catch (e) {
                console.warn('Failed to fetch OpenAI models', e);
            }
            return [{ id: 'gpt-4o', name: 'GPT-4o' }, { id: 'gpt-4o-mini', name: 'GPT-4o mini' }];
        } else if (config.provider === 'google') {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`);
                if (response.ok) {
                    const data = await response.json();
                    return data.models
                        .filter((m: any) => m.name.includes('gemini'))
                        .map((m: any) => {
                            const id = m.name.replace('models/', '');
                            return { id, name: m.displayName || id, description: m.description };
                        });
                }
            } catch (e) {
                console.warn('Failed to fetch Google models', e);
            }
            return [{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }, { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }];
        } else if (config.provider === 'anthropic') {
            return [
                { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
                { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' }
            ];
        } else if (config.provider === 'deepseek') {
            try {
                const response = await fetch('https://api.deepseek.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${config.apiKey}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    return data.data.map((m: any) => ({ id: m.id, name: m.id }));
                }
            } catch (e) {
                console.warn('Failed to fetch DeepSeek models', e);
            }
            return [{ id: 'deepseek-chat', name: 'DeepSeek V3' }, { id: 'deepseek-reasoner', name: 'DeepSeek R1' }];
        }
        return [];
    }

    async testConnection(config: AIAgentConfig, prompt: string, testImageUrl?: string): Promise<string> {
        try {
            return await this.chat(config.id, prompt, null, undefined, undefined, undefined, testImageUrl ? undefined : undefined, undefined, undefined);
        } catch (e: any) {
            throw new Error(e.message || 'فشل الاتصال');
        }
    }
}

export const aiService = new AIService();
