import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Clock,
  Award,
  TrendingUp,
  Filter,
  User,
  UserCheck,
  UserX,
  Edit,
  FileText,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { formatDate } from '../../../lib/utils';
import { BentoStatCard } from '../../../components/dashboard/BentoStatCard';
import { useStaff, StaffMember } from '../../../hooks/useStaff';
import { StaffProfileContent } from './components/StaffProfileContent';
import { useAuth } from '../../../contexts/AuthContext';



interface ClinicStaffPageProps {
  clinicId: string;
}

export const ClinicStaffPage: React.FC<ClinicStaffPageProps> = ({ clinicId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [viewingStaffProfile, setViewingStaffProfile] = useState<StaffMember | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Supabase Hook
  const { staff, loading, addStaff, updateStaff } = useStaff(clinicId);
  const { user } = useAuth();
  const isOwner = user?.role === 'doctor';
  const currentStaffPermissions = staff.find(s => s.email === user?.email)?.permissions;


  // Mock stats calculation (Client-side for now)
  const stats = {
    total: staff.length,
    active: staff.filter(s => s.status === 'active').length,
    doctors: staff.filter(s => s.position === 'doctor').length,
    assistants: staff.filter(s => s.position === 'assistant').length,
    nurses: staff.filter(s => s.position === 'nurse').length,
    admin: staff.filter(s => s.position === 'admin').length,
    avgRating: staff.reduce((acc, curr) => acc + curr.performance.rating, 0) / (staff.length || 1),
    avgAttendance: 95, // Mock or calculate if data exists
    totalSalary: staff.reduce((acc, curr) => acc + curr.salary, 0)
  };

  const [newStaff, setNewStaff] = useState({
    name: '',
    phone: '',
    email: '',
    department: '',
    position: 'doctor',
    salary: '',
    username: '',
    password: '',
    permissions: {
      appointments: false,
      patients: false,
      financials: false,
      settings: false,
      reports: false,
      activityLog: false,
      assets: false,
      staff: false,
      lab: false
    },
    status: 'active'
  });

  // Filter Logic
  const filteredStaff = staff.filter(member => {
    const matchesSearch = searchTerm === '' ||
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPosition = selectedPosition === 'all' || member.position === selectedPosition;
    const matchesStatus = selectedStatus === 'all' || member.status === selectedStatus;

    return matchesSearch && matchesPosition && matchesStatus;
  });

  // Helpers
  const getPositionLabel = (position: string) => {
    switch (position) {
      case 'doctor': return 'طبيب';
      case 'assistant': return 'مساعد';
      case 'nurse': return 'ممرض';
      case 'receptionist': return 'مستقبل';
      case 'admin': return 'إداري';
      case 'technician': return 'فني';
      default: return position;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'on_leave': return 'text-yellow-600 bg-yellow-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      case 'terminated': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'on_leave': return 'إجازة';
      case 'suspended': return 'موقوف';
      case 'terminated': return 'منتهي الخدمة';
      default: return 'غير محدد';
    }
  };

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'doctor': return <User className="w-5 h-5 text-blue-600" />;
      case 'assistant': return <UserCheck className="w-5 h-5 text-green-600" />;
      case 'nurse': return <User className="w-5 h-5 text-pink-600" />;
      case 'receptionist': return <UserX className="w-5 h-5 text-purple-600" />;
      case 'admin': return <Users className="w-5 h-5 text-indigo-600" />;
      case 'technician': return <UserCheck className="w-5 h-5 text-orange-600" />;
      default: return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  // Handlers
  const handleEditStaff = (staffMember: StaffMember) => {
    setEditingStaff({ ...staffMember });
    setShowEditModal(true);
  };

  const handleSaveStaff = async () => {
    if (!editingStaff) return;
    await updateStaff(editingStaff.id, editingStaff);
    setShowEditModal(false);
    setEditingStaff(null);
  };

  const handleAddStaff = async () => {
    if (!newStaff.name) {
      alert('يرجى إدخال اسم الموظف');
      return;
    }

    await addStaff({
      clinicId,
      name: newStaff.name,
      phone: newStaff.phone,
      email: newStaff.email,
      department: newStaff.department,
      position: newStaff.position as any,
      salary: Number(newStaff.salary) || 0,
      status: newStaff.status as any,
      hireDate: new Date().toISOString().split('T')[0],
      address: 'العنوان غير محدد',
      qualifications: [],
      certifications: [],
      workSchedule: {
        days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
        startTime: '09:00',
        endTime: '17:00',
        breaks: []
      },
      attendance: { present: 0, absent: 0, late: 0, overtime: 0 },
      performance: {
        rating: 5,
        lastReview: new Date().toISOString().split('T')[0],
        achievements: [],
        goals: []
      },
      skills: [],
      languages: ['العربية'],
      permissions: newStaff.permissions,
      username: newStaff.username,
      password: newStaff.password,
      notes: '',
    });

    setNewStaff({
      name: '',
      phone: '',
      email: '',
      department: '',
      position: 'doctor',
      salary: '',
      username: '',
      password: '',
      permissions: {
        appointments: false,
        patients: false,
        financials: false,
        settings: false,
        reports: false,
        activityLog: false,
        assets: false,
        staff: false,
        lab: false
      },
      status: 'active'
    });
    setShowAddModal(false);
  };

  const handleViewProfile = (staffMember: any) => {
    setViewingStaffProfile(staffMember);
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setViewingStaffProfile(null);
  };

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoStatCard
          title="إجمالي الموظفين"
          value={stats.total}
          icon={Users}
          color="blue"
          trend="up"
          trendValue="نشط"
          delay={100}
        />
        <BentoStatCard
          title="الأطباء"
          value={stats.doctors}
          icon={User}
          color="green"
          delay={200}
        />
        <BentoStatCard
          title="متوسط التقييم"
          value={`${stats.avgRating.toFixed(1)}/5`}
          icon={Star}
          color="purple"
          trend="up"
          trendValue="2.1%"
          delay={300}
        />
        <BentoStatCard
          title="معدل الحضور"
          value={`${stats.avgAttendance}%`}
          icon={Clock}
          color="orange"
          delay={400}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoStatCard
          title="المساعدين"
          value={stats.assistants}
          icon={UserCheck}
          color="emerald"
          delay={500}
        />
        <BentoStatCard
          title="الممرضين"
          value={stats.nurses}
          icon={User}
          color="red"
          delay={600}
        />
        <BentoStatCard
          title="الإداريين"
          value={stats.admin}
          icon={Users}
          color="indigo"
          delay={700}
        />
        <BentoStatCard
          title="الراتب الإجمالي"
          value={`${(stats.totalSalary / 1000000).toFixed(1)}م`}
          icon={TrendingUp}
          color="amber"
          delay={800}
        />
      </div>

      {/* Controls */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">

              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="البحث في الموظفين..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Position Filter */}
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع المناصب</option>
                <option value="doctor">أطباء</option>
                <option value="assistant">مساعدين</option>
                <option value="nurse">ممرضين</option>
                <option value="receptionist">مستقبل</option>
                <option value="admin">إداريين</option>
                <option value="technician">فنيين</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="on_leave">إجازة</option>
                <option value="suspended">موقوف</option>
                <option value="terminated">منتهي الخدمة</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  شبكة
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  قائمة
                </button>
              </div>

              {/* Add Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">موظف جديد</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Staff Display */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">الموظفين ({filteredStaff.length})</h2>
            <div className="text-sm text-gray-600">
              يظهر {filteredStaff.length} من {staff.length} موظف
            </div>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد نتائج</h3>
              <p className="text-gray-500">لم يتم العثور على موظفين مطابقين للبحث</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all"
                >
                  {/* Staff Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      {getPositionIcon(member.position)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.department}</p>
                      <p className="text-xs text-blue-600 font-medium">{getPositionLabel(member.position)}</p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{member.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>

                  {/* Work Info */}
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-600">
                      <Calendar className="w-4 h-4 inline ml-1" />
                      تاريخ التوظيف: {formatDate(member.hireDate)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <Clock className="w-4 h-4 inline ml-1" />
                      المناوبة: {member.workSchedule.startTime} - {member.workSchedule.endTime}
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium text-gray-900">
                        {member.performance.rating}/5
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      • {member.attendance.present} يوم عمل
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                      {getStatusLabel(member.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      راتب: {(member.salary || 0).toLocaleString()} د.ع
                    </div>
                  </div>

                  {/* Skills Preview */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {member.skills.slice(0, 3).map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {member.skills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full">
                          +{member.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handleViewProfile(member)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      عرض الملف
                    </button>
                    {(isOwner || currentStaffPermissions?.staff) && (
                      <button
                        onClick={() => handleEditStaff(member)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        تعديل
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      {getPositionIcon(member.position)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-600">
                        {member.department} • {getPositionLabel(member.position)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-left">
                      <div className="text-sm text-gray-600">
                        تقييم: {member.performance.rating}/5
                      </div>
                      <div className="text-sm text-gray-600">
                        أيام العمل: {member.attendance.present}
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(member.status)}`}>
                      {getStatusLabel(member.status)}
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {(member.salary || 0).toLocaleString()} د.ع
                      </div>
                      <div className="text-xs text-gray-600">
                        شهرياً
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
            <p className="text-sm text-gray-600">موظفين نشطين</p>
          </div>
        </Card>

        <Card>
          <div className="p-4 text-center">
            <Star className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}/5</div>
            <p className="text-sm text-gray-600">متوسط التقييم</p>
          </div>
        </Card>

        <Card>
          <div className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.avgAttendance}%</div>
            <p className="text-sm text-gray-600">معدل الحضور</p>
          </div>
        </Card>
      </div>

      {/* Modal عرض الملف الشخصي */}
      {showProfileModal && viewingStaffProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <StaffProfileContent
              staff={viewingStaffProfile}
              onClose={closeProfileModal}
              clinicId={clinicId}
            />
          </div>
        </div>
      )}

      {/* Modal تعديل الموظف */}
      {
        showEditModal && editingStaff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">تعديل بيانات الموظف</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* معلومات شخصية */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الشخصية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                      <input
                        type="text"
                        value={editingStaff.name}
                        onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                      <input
                        type="tel"
                        value={editingStaff.phone}
                        onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={editingStaff.email}
                        onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* معلومات العمل */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات العمل</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
                      <input
                        type="text"
                        value={editingStaff.department}
                        onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">المنصب</label>
                      <select
                        value={editingStaff.position}
                        onChange={(e) => setEditingStaff({ ...editingStaff, position: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="doctor">طبيب</option>
                        <option value="assistant">مساعد</option>
                        <option value="nurse">ممرض</option>
                        <option value="receptionist">مستقبل</option>
                        <option value="admin">إداري</option>
                        <option value="technician">فني</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الراتب (د.ع)</label>
                      <input
                        type="number"
                        value={editingStaff.salary}
                        onChange={(e) => setEditingStaff({ ...editingStaff, salary: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                      <select
                        value={editingStaff.status}
                        onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">نشط</option>
                        <option value="on_leave">إجازة</option>
                        <option value="suspended">موقوف</option>
                        <option value="terminated">منتهي الخدمة</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">صلاحيات الوصول</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.reports || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, reports: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">التقارير والإحصائيات</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.financials || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, financials: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">الأمور المالية</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.activityLog || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, activityLog: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">سجل النشاطات</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.assets || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, assets: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">الأصول والمخزون</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.staff || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, staff: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">إدارة الطاقم</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.lab || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, lab: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">معامل الأسنان</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.appointments || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, appointments: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">المواعيد</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.patients || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, patients: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">المرضى</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.settings || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, settings: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">الإعدادات</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.appointments || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, appointments: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">المواعيد</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.patients || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, patients: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">المرضى</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions?.settings || false}
                        onChange={(e) => setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, settings: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">الإعدادات</span>
                    </label>
                  </div>


                  {/* Login Credentials */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">بيانات الدخول</h3>
                      <button
                        onClick={() => {
                          const generatedPass = Math.random().toString(36).slice(-8);
                          setEditingStaff({ ...editingStaff, password: generatedPass });
                          navigator.clipboard.writeText(generatedPass);
                          toast.success(`تم نسخ كلمة المرور: ${generatedPass}`);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        توليد كلمة مرور
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">اسم المستخدم</label>
                        <input
                          type="text"
                          value={editingStaff.username || ''}
                          onChange={(e) => setEditingStaff({ ...editingStaff, username: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="username"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                        <input
                          type="text"
                          value={editingStaff.password || ''}
                          onChange={(e) => setEditingStaff({ ...editingStaff, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="********"
                        />
                        <p className="text-xs text-gray-500 mt-1">اترك الحقل فارغاً إذا كنت لا تريد تغيير كلمة المرور</p>
                      </div>
                    </div>
                  </div>

                  {/* أزرار الحفظ */}
                  <div className="flex gap-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveStaff}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      حفظ التغييرات
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Modal إضافة موظف جديد */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">إضافة موظف جديد</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* معلومات شخصية */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الشخصية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="اسم الموظف"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="077..."
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="البريد الإلكتروني"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* معلومات العمل */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات العمل</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={newStaff.department}
                      onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المنصب</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={newStaff.position}
                      onChange={(e) => setNewStaff({ ...newStaff, position: e.target.value })}
                    >
                      <option value="doctor">طبيب</option>
                      <option value="assistant">مساعد</option>
                      <option value="nurse">ممرض</option>
                      <option value="receptionist">مستقبل</option>
                      <option value="admin">إداري</option>
                      <option value="technician">فني</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الراتب (د.ع)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={newStaff.salary}
                      onChange={(e) => setNewStaff({ ...newStaff, salary: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={newStaff.status}
                      onChange={(e) => setNewStaff({ ...newStaff, status: e.target.value })}
                    >
                      <option value="active">نشط</option>
                      <option value="on_leave">إجازة</option>
                      <option value="suspended">موقوف</option>
                      <option value="terminated">منتهي الخدمة</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* أزرار الحفظ */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddStaff}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  إضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};