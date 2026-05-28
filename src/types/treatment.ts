export type TreatmentType = 'endo' | 'implant' | 'prosthetic' | 'ortho' | 'surgery' | 'general' | 'perio';
export type TreatmentStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type SessionStatus = 'pending' | 'completed' | 'skipped';

export interface TreatmentSession {
    id: string;
    number: number;
    title: string;
    status: SessionStatus;
    date?: string;
    notes?: string;
    duration?: number;
    schemaId?: string; // Link to the specific form schema for this session
    data?: Record<string, any>; // Flexible data storage matching the schema
}

// Data structures for specific treatments
export interface EndoSessionData {
    canals?: number;
    workingLength?: number;
    fileSize?: string;
    fileLength?: number;
    obturationMaterial?: string;
    restorationType?: 'temporary' | 'permanent' | 'post_core';
}

export interface ImplantSessionData {
    implantType?: string;
    implantSize?: string;
    implantLength?: string;
    boneGraft?: boolean;
    membrane?: boolean;
}

export interface ProstheticSessionData {
    shade?: string;
    material?: string;
    labId?: string;
    notes?: string;
}

export interface TreatmentPlan {
    id: string;
    patientId: string;
    toothNumber: number; // For backward compatibility 
    toothNumbers?: number[]; // Support for multiple teeth
    type: string;
    status: TreatmentStatus;

    // Progress tracking
    totalSessions: number;
    completedSessions: number;
    progress: number; // 0-100 percentage

    sessions: TreatmentSession[];

    // Financial
    cost: number;
    paid: number;

    startDate: string;
    endDate?: string;
    doctor?: string;
    notes?: string;
}

export type ToothDiagnosticCondition =
    | 'healthy'   // سليم
    | 'decayed'   // تسوس
    | 'broken'    // مكسور
    | 'stained'   // تصبغ
    | 'abscess'   // خراج
    | 'impacted'  // مطمور
    | 'missing';  // مفقود (يُولّد تلقائياً من healthy بدون رفع ملف)

export type ToothTreatmentState =
    | 'filled'    // حشوة
    | 'endo'      // علاج عصب
    | 'crown'     // تلبيس / تاج
    | 'bridge'    // جسر
    | 'implant'   // زرعة
    | 'ortho';    // تقويم

export type ToothState = ToothDiagnosticCondition | ToothTreatmentState;

export interface ToothCondition {
    number: number;
    condition: ToothState;
    notes?: string;
    existingTreatments?: string[];
    treatmentPlan?: {
        id: string;
        overallStatus: 'planned' | 'in_progress' | 'completed';
    };
}
