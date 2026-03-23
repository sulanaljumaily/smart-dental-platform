import { AIAgentConfig, AIAgentType, AIAnalysisResult } from '../../types/ai';
import { DEFAULT_AI_CONFIGS } from './defaultConfig';

class AIService {
    private configs: Record<AIAgentType, AIAgentConfig>;

    constructor() {
        // Load from local storage or use defaults
        const saved = localStorage.getItem('ai_configs');
        this.configs = saved ? JSON.parse(saved) : DEFAULT_AI_CONFIGS;
    }

    getConfigs(): AIAgentConfig[] {
        return Object.values(this.configs);
    }

    getConfig(type: AIAgentType): AIAgentConfig {
        return this.configs[type];
    }

    updateConfig(type: AIAgentType, updates: Partial<AIAgentConfig>) {
        this.configs[type] = { ...this.configs[type], ...updates };
        localStorage.setItem('ai_configs', JSON.stringify(this.configs));
    }

    // --- Capabilities ---

    // --- Helper to get API Key ---
    private getApiKey(provider: string): string | null {
        // 1. Try Config
        const configKey = this.configs['image_analysis']?.apiKey;
        if (configKey) return configKey;

        // 2. Try LocalStorage (User entered)
        const localKey = localStorage.getItem('openai_api_key');
        if (localKey) return localKey;

        // 3. Try Env (Build time)
        return import.meta.env.VITE_OPENAI_API_KEY || null;
    }

    // --- Capabilities ---

    async analyzeImage(imageUrl: string, context?: string): Promise<AIAnalysisResult> {
        const config = this.configs['image_analysis'];
        if (!config.isActive) throw new Error('خدمة تحليل الصور غير مفعلة');

        const apiKey = this.getApiKey(config.provider);
        if (!apiKey) {
            // Fallback to mock if no key provided, but warn
            console.warn('[AI-Service] No API Key found. Using Mock Response.');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return this.getMockAnalysis();
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o', // or gpt-4-turbo
                    messages: [
                        {
                            role: 'system',
                            content: config.systemRules + "\nProvide the output in valid JSON format matching this structure: { diagnosis: string, severity: 'low'|'medium'|'high', confidence: number, findings: string[], recommendations: string[] }."
                        },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: context || "Analyze this dental image." },
                                { type: 'image_url', image_url: { url: imageUrl } }
                            ]
                        }
                    ],
                    max_tokens: 1000,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'OpenAI API Error');
            }

            const data = await response.json();
            const resultText = data.choices[0].message.content;
            return JSON.parse(resultText) as AIAnalysisResult;

        } catch (error) {
            console.error('[AI-Service] Analysis Failed:', error);
            throw error;
        }
    }

    async chat(agentType: AIAgentType, message: string, contextObj?: any): Promise<string> {
        const config = this.configs[agentType];
        if (!config.isActive) return 'نأسف، هذه الخدمة غير مفعلة حالياً.';

        const apiKey = this.getApiKey(config.provider);
        if (!apiKey) {
            // Fallback to mock
            console.warn('[AI-Service] Chat: No API Key. Using Mock.');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.getMockChatResponse(agentType, message, contextObj);
        }

        try {
            const systemContent = config.systemRules + (contextObj ? `\n\nContext Data: ${JSON.stringify(contextObj)}` : "");

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: config.model || 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemContent },
                        { role: 'user', content: message }
                    ],
                    temperature: config.temperature
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Chat API Error');
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error('[AI-Service] Chat Failed:', error);
            return "عذراً، حدث خطأ أثناء الاتصال بالخادم الذكي.";
        }
    }

    // --- Mock Fallbacks (Preserved for Demo) ---
    private getMockAnalysis(): AIAnalysisResult {
        return {
            issues: [
                {
                    label: 'تسوس (Caries)',
                    confidence: 0.92,
                    box: [0.3, 0.4, 0.1, 0.1],
                    description: 'تسوس في الضاحك الثاني العلوي'
                }
            ],
            summary: 'تم اكتشاف تسوس محتمل في الجهة العلوية اليسرى، مع سلامة العظم السنخي.',
            recommendation: 'يُنصح بإجراء حشوة تجميلية وفحص مدى عمق التسوس.',
            // Compatibility fields
            diagnosis: 'تسوس في الضاحك الثاني العلوي (Upper Second Premolar Caries)',
            severity: 'medium',
            confidence: 0.92,
            findings: [
                'وجود ظل شعاعي (Radiolucency) في السطح الوحشي للسن #15.',
                'احتمالية امتداد التسوس إلى طبقة العاج (Dentin).',
                'مستويات العظم السنخي تظهر طبيعية.'
            ]
        };
    }

    private getMockChatResponse(agentType: string, message: string, contextObj?: any): string {
        if (agentType === 'doctor_assistant') {
            return `(Mock Response) بناءً على بيانات المريض ${contextObj?.patientName || ''}: أنصح بمراجعة التاريخ الطبي قبل وصف أي مضادات حيوية.`;
        }
        return "أهلاً بك. كيف يمكنني مساعدتك؟ (تجريبي)";
    }
}

export const aiService = new AIService();
