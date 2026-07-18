import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { 
  HiUser, 
  HiEnvelope, 
  HiPhone, 
  HiMapPin, 
  HiIdentification, 
  HiKey, 
  HiCamera, 
  HiArrowUpTray, 
  HiCheckCircle, 
  HiXCircle, 
  HiClock,
  HiBuildingOffice
} from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import useAuth from '../../hooks/useAuth';
import { updateUserApi, getProfileContextApi } from '../../api/models/user.api';
import { toggleOutletStatusApi } from '../../api/models/outlet.api';
import { fetchCurrentUser } from '../../store/authSlice';
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from '../../utils/constants';

export default function ProfilePage({ defaultTab }) {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState(defaultTab || 'personal');
  const [loading, setLoading] = useState(false);
  const [profileContext, setProfileContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const fetchProfileContext = async () => {
    setContextLoading(true);
    try {
      const response = await getProfileContextApi();
      if (response?.data?.data) {
        setProfileContext(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load profile context', err);
    } finally {
      setContextLoading(false);
    }
  };

  const handleToggleOutletStatus = async (outletId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await toggleOutletStatusApi(outletId, newStatus);
      addToast(`Outlet status updated to ${newStatus === 'ACTIVE' ? 'OPEN' : 'CLOSED'}`, 'success');
      setProfileContext((prev) => {
        if (!prev) return prev;
        const updatedOutlets = (prev.hierarchy?.outlets || []).map((out) => {
          if ((out._id || out.id) === outletId) {
            return { ...out, status: newStatus };
          }
          return out;
        });
        return {
          ...prev,
          hierarchy: {
            ...prev.hierarchy,
            outlets: updatedOutlets,
          },
        };
      });
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update outlet status', 'error');
    }
  };

  useEffect(() => {
    fetchProfileContext();
  }, []);

  const getRoleActions = () => {
    const actions = [];
    if (user?.role === 'SYSTEM_ADMIN') {
      actions.push({ to: '/system-admin/tenants', label: 'Manage Tenants', icon: 'storefront' });
      actions.push({ to: '/system-admin/audit-logs', label: 'Global Audit Logs', icon: 'description' });
    }
    if (['SUPER_ADMIN', 'RESTAURANT_OWNER'].includes(user?.role)) {
      actions.push({ to: '/users', label: 'Manage Team', icon: 'group' });
      actions.push({ to: '/menu-management', label: 'Menu Management', icon: 'menu_book' });
      actions.push({ to: '/subscriptions', label: 'Subscriptions', icon: 'credit_card' });
    }
    if (user?.role === 'OUTLET_MANAGER') {
      actions.push({ to: '/users', label: 'Manage Scoped Staff', icon: 'group' });
      actions.push({ to: '/floor-management', label: 'Floor Management', icon: 'layers' });
      actions.push({ to: '/menu-management', label: 'Menu Management', icon: 'menu_book' });
    }
    if (user?.role === 'STAFF') {
      actions.push({ to: '/floor-management', label: 'Live Floor Operations', icon: 'layers' });
    }
    return actions;
  };

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    password: '',
    newPassword: '',
    confirmPassword: '',
    profileImage: '',
    idProof: '',
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        address: user.address || '',
        profileImage: user.profileImage || '',
        idProof: user.idProof || '',
      }));
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast('File size must be under 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, [field]: reader.result }));
      addToast(`${field === 'profileImage' ? 'Profile picture' : 'ID proof document'} loaded. Save changes to apply.`, 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) {
      addToast('First Name and Last Name are required', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateUserApi(user.id || user._id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        profileImage: form.profileImage || null,
      });
      addToast('Personal details updated successfully', 'success');
      dispatch(fetchCurrentUser(true));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserApi(user.id || user._id, {
        address: form.address.trim(),
      });
      addToast('Address details updated successfully', 'success');
      dispatch(fetchCurrentUser(true));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update address', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVerification = async (e) => {
    e.preventDefault();
    if (!form.idProof) {
      addToast('Please upload an ID proof document first', 'warning');
      return;
    }

    setLoading(true);
    try {
      await updateUserApi(user.id || user._id, {
        idProof: form.idProof,
      });
      addToast('ID verification document submitted successfully', 'success');
      dispatch(fetchCurrentUser(true));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit ID proof', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!form.password || !form.newPassword || !form.confirmPassword) {
      addToast('All password fields are required', 'error');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateUserApi(user.id || user._id, {
        password: form.newPassword,
      });
      addToast('Password updated successfully', 'success');
      setForm((prev) => ({ ...prev, password: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const idProofStatusLabel = (status) => {
    switch (status) {
      case 'VERIFIED':
        return { text: 'Verified', variant: 'success', icon: <HiCheckCircle className="text-emerald-500 text-lg shrink-0" /> };
      case 'PENDING':
        return { text: 'Pending Verification', variant: 'warning', icon: <HiClock className="text-amber-500 text-lg shrink-0" /> };
      case 'REJECTED':
        return { text: 'Rejected', variant: 'danger', icon: <HiXCircle className="text-red-500 text-lg shrink-0" /> };
      default:
        return { text: 'Not Verified', variant: 'neutral', icon: null };
    }
  };

  const statusConfig = idProofStatusLabel(user?.idProofStatus);

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header Banner Card */}
      <div className="relative bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-3xl overflow-hidden shadow-xs">
        <div className="h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 w-full" />
        <div className="p-6 relative flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-10">
          <div className="relative group w-28 h-28 rounded-2xl border-4 border-white dark:border-zinc-950 overflow-hidden shadow-md shrink-0 bg-zinc-200 dark:bg-zinc-800">
            {form.profileImage ? (
              <img src={form.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-headline-lg bg-indigo-500/25 text-indigo-600 dark:text-indigo-400">
                {user?.firstName?.[0]?.toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-all duration-200">
              <HiCamera className="text-lg mb-1" />
              <span>Change Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'profileImage')}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0 pb-1">
            <h2 className="text-headline-md font-bold text-on-surface dark:text-zinc-150 leading-snug">
              {user?.firstName} {user?.lastName}
            </h2>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1.5">
              <Badge variant={ROLE_BADGE_VARIANT[user?.role] || 'neutral'}>
                {ROLE_LABELS[user?.role] || user?.role}
              </Badge>
              {user?.idProofStatus === 'VERIFIED' && (
                <Badge variant="success" className="flex items-center gap-0.5">
                  <HiCheckCircle className="text-xs" /> Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 bg-white dark:bg-zinc-955 border border-border-base dark:border-zinc-900 p-3 rounded-2xl flex flex-row md:flex-col gap-2 overflow-x-auto scrollbar-none shadow-2xs">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex flex-col items-start gap-0.5 px-4 py-2.5 rounded-xl text-left transition-all duration-200 w-full cursor-pointer select-none border-none ${
              activeTab === 'personal'
                ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/10'
                : 'text-on-surface hover:bg-zinc-50 dark:text-zinc-350 dark:hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-2 font-extrabold text-xs">
              <HiUser className="text-sm shrink-0" />
              <span>Personal Info</span>
            </div>
            <span className={`text-[9px] font-medium leading-tight mt-0.5 ${activeTab === 'personal' ? 'text-white/80' : 'text-on-surface-variant/70 dark:text-zinc-500'}`}>
              Basic details & photo
            </span>
          </button>
          <button
            onClick={() => setActiveTab('address')}
            className={`flex flex-col items-start gap-0.5 px-4 py-2.5 rounded-xl text-left transition-all duration-200 w-full cursor-pointer select-none border-none ${
              activeTab === 'address'
                ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/10'
                : 'text-on-surface hover:bg-zinc-50 dark:text-zinc-350 dark:hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-2 font-extrabold text-xs">
              <HiMapPin className="text-sm shrink-0" />
              <span>Address Details</span>
            </div>
            <span className={`text-[9px] font-medium leading-tight mt-0.5 ${activeTab === 'address' ? 'text-white/80' : 'text-on-surface-variant/70 dark:text-zinc-500'}`}>
              Location & correspondence
            </span>
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`flex flex-col items-start gap-0.5 px-4 py-2.5 rounded-xl text-left transition-all duration-200 w-full cursor-pointer select-none border-none ${
              activeTab === 'verification'
                ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/10'
                : 'text-on-surface hover:bg-zinc-50 dark:text-zinc-350 dark:hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-2 font-extrabold text-xs">
              <HiIdentification className="text-sm shrink-0" />
              <span>ID Verification</span>
            </div>
            <span className={`text-[9px] font-medium leading-tight mt-0.5 ${activeTab === 'verification' ? 'text-white/80' : 'text-on-surface-variant/70 dark:text-zinc-500'}`}>
              Government credentials
            </span>
          </button>
          <button
            onClick={() => setActiveTab('organization')}
            className={`flex flex-col items-start gap-0.5 px-4 py-2.5 rounded-xl text-left transition-all duration-200 w-full cursor-pointer select-none border-none ${
              activeTab === 'organization'
                ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/10'
                : 'text-on-surface hover:bg-zinc-50 dark:text-zinc-350 dark:hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-2 font-extrabold text-xs">
              <HiBuildingOffice className="text-sm shrink-0" />
              <span>Access Scopes</span>
            </div>
            <span className={`text-[9px] font-medium leading-tight mt-0.5 ${activeTab === 'organization' ? 'text-white/80' : 'text-on-surface-variant/70 dark:text-zinc-500'}`}>
              Hierarchy boundaries
            </span>
          </button>
          <div className="hidden md:block border-t border-zinc-100 dark:border-zinc-900 my-1"></div>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex flex-col items-start gap-0.5 px-4 py-2.5 rounded-xl text-left transition-all duration-200 w-full cursor-pointer select-none border-none ${
              activeTab === 'security'
                ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/10'
                : 'text-on-surface hover:bg-zinc-50 dark:text-zinc-350 dark:hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-2 font-extrabold text-xs">
              <HiKey className="text-sm shrink-0" />
              <span>Security</span>
            </div>
            <span className={`text-[9px] font-medium leading-tight mt-0.5 ${activeTab === 'security' ? 'text-white/80' : 'text-on-surface-variant/70 dark:text-zinc-500'}`}>
              Password & protection
            </span>
          </button>
        </div>

        {/* Tab Panels */}
        <div className="md:col-span-3 bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-3xl p-6 shadow-xs min-h-[300px]">
          {activeTab === 'personal' && (
            <form onSubmit={handleSavePersonal} className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-zinc-150 text-[18px]">Personal Details</h3>
                <p className="text-xs text-on-surface-variant dark:text-zinc-405">Update your basic profile contact information.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="p-first"
                  label="First Name"
                  value={form.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                  placeholder="First Name"
                />
                <Input
                  id="p-last"
                  label="Last Name"
                  value={form.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                  placeholder="Last Name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 w-full">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] font-semibold mb-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-on-surface-variant/50 dark:text-zinc-550 flex items-center">
                      <HiEnvelope className="text-[17px]" />
                    </span>
                    <input
                      type="text"
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-surface-container-low dark:bg-zinc-900/60 border border-border-base dark:border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-xs font-semibold text-on-surface-variant dark:text-zinc-450 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1 w-full">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] font-semibold mb-1">
                    Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-on-surface-variant/50 dark:text-zinc-550 flex items-center">
                      <HiPhone className="text-[17px]" />
                    </span>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-xs font-semibold text-on-surface dark:text-zinc-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border-base dark:border-zinc-900">
                <Button type="submit" loading={loading} className="px-5 font-bold">
                  Save Changes
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'address' && (
            <form onSubmit={handleSaveAddress} className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-zinc-150 text-[18px]">Address Details</h3>
                <p className="text-xs text-on-surface-variant dark:text-zinc-405">Provide your current correspondence address details.</p>
              </div>

              <div className="flex flex-col gap-1 w-full">
                <label className="block font-label-sm text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] font-semibold mb-1" htmlFor="p-address">
                  Full Address
                </label>
                <textarea
                  id="p-address"
                  rows={4}
                  value={form.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter house details, street name, city, state, pincode..."
                  className="textarea textarea-bordered w-full p-3 bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-xl text-xs font-semibold text-on-surface dark:text-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 resize-y min-h-24 placeholder-on-surface-variant/40"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-border-base dark:bg-zinc-900">
                <Button type="submit" loading={loading} className="px-5 font-bold">
                  Save Address
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'verification' && (
            <form onSubmit={handleSaveVerification} className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-zinc-150 text-[18px]">Identity Verification</h3>
                <p className="text-xs text-on-surface-variant dark:text-zinc-405">Upload government issued identification proof to verify your account.</p>
              </div>

              {/* Status Banner */}
              <div className="flex items-center gap-3.5 p-4 bg-surface-subtle dark:bg-zinc-900/40 border border-border-base dark:border-zinc-850 rounded-2xl">
                {statusConfig.icon ? (
                  statusConfig.icon
                ) : (
                  <span className="material-symbols-outlined text-zinc-400 text-[24px]">shield_question</span>
                )}
                <div>
                  <h4 className="text-xs font-bold text-on-surface dark:text-zinc-250">
                    Verification Status: <span className="font-extrabold text-primary">{statusConfig.text}</span>
                  </h4>
                  <p className="text-[10px] text-on-surface-variant dark:text-zinc-450 mt-0.5 leading-normal">
                    {user?.idProofStatus === 'VERIFIED'
                      ? 'Your account identity has been successfully verified. You have full system privileges.'
                      : user?.idProofStatus === 'PENDING'
                      ? 'Your document is currently under review by system administrators. You will be notified once reviewed.'
                      : user?.idProofStatus === 'REJECTED'
                      ? 'Your previous document submission was rejected. Please upload a clear photo of your ID proof again.'
                      : 'Please upload a photo of your Aadhaar card, PAN card, or Passport to verify your identity.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1 w-full">
                <label className="block font-label-sm text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] font-semibold mb-1">
                  Government ID Document
                </label>

                {form.idProof ? (
                  <div className="relative group border border-border-base dark:border-zinc-850 rounded-2xl overflow-hidden aspect-video bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-2">
                    {form.idProof.startsWith('data:image') || form.idProof.startsWith('http') ? (
                      <img src={form.idProof} alt="ID Document Proof" className="max-w-full max-h-full object-contain rounded-lg" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-on-surface-variant dark:text-zinc-400 gap-2">
                        <span className="material-symbols-outlined text-[36px]">description</span>
                        <span className="text-[10px] font-bold">Document Uploaded Successfully</span>
                      </div>
                    )}
                    
                    {user?.idProofStatus !== 'VERIFIED' && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all duration-200">
                        <label className="bg-primary hover:bg-primary/95 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-sm">
                          <HiArrowUpTray className="text-xs" /> Upload New
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileChange(e, 'idProof')}
                            className="hidden"
                          />
                        </label>
                        <Button size="sm" variant="danger" onClick={() => handleInputChange('idProof', '')}>
                          Remove Document
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-border-base dark:border-zinc-800 hover:border-primary dark:hover:border-primary-fixed-dim rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-surface-subtle/20 dark:bg-zinc-900/10 group">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 group-hover:text-primary transition-colors mb-2">
                      upload_file
                    </span>
                    <h5 className="text-xs font-bold text-on-surface dark:text-zinc-250">Click to upload document photo</h5>
                    <p className="text-[10px] text-on-surface-variant dark:text-zinc-455 mt-1 max-w-[240px]">
                      PNG, JPG, or PDF under 2MB. Clear copy containing name, photo, and government details.
                    </p>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange(e, 'idProof')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {user?.idProofStatus !== 'VERIFIED' && form.idProof !== user?.idProof && (
                <div className="flex justify-end pt-4 border-t border-border-base dark:bg-zinc-900 animate-fade-in">
                  <Button type="submit" loading={loading} className="px-5 font-bold flex items-center gap-1.5">
                    <HiArrowUpTray className="text-xs" /> Submit for Verification
                  </Button>
                </div>
              )}
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-zinc-150 text-[18px]">Security Settings</h3>
                <p className="text-xs text-on-surface-variant dark:text-zinc-405">Manage your account password and authentication credentials. Update your password regularly to keep your account secure.</p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 text-[11px] text-amber-800 dark:text-amber-300 font-medium space-y-1">
                <p className="font-bold text-xs">🔒 Password Requirements</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400">
                  <li>Minimum 6 characters</li>
                  <li>Include a mix of letters, numbers, and symbols for best security</li>
                  <li>New password must differ from the current password</li>
                </ul>
              </div>

              <div className="space-y-4">
                <Input
                  id="p-curr-pass"
                  label="Current Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  placeholder="Enter current password"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="p-new-pass"
                    label="New Password"
                    type="password"
                    value={form.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    required
                    placeholder="Enter new password"
                  />
                  <Input
                    id="p-conf-pass"
                    label="Confirm New Password"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border-base dark:border-zinc-900">
                <Button type="submit" loading={loading} className="px-5 font-bold flex items-center gap-1.5">
                  <HiKey className="text-xs" /> Update Password
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-zinc-150 text-[18px]">Organization & Access</h3>
                <p className="text-xs text-on-surface-variant dark:text-zinc-405">View your organizational hierarchy and access boundaries resolved by the system.</p>
              </div>

              {contextLoading ? (
                <div className="flex justify-center p-8">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                </div>
              ) : profileContext ? (
                <div className="space-y-4">
                  {/* User Section */}
                  {profileContext.user && (
                    <div className="p-4 bg-surface-subtle dark:bg-zinc-900/40 border border-border-base dark:border-zinc-850 rounded-2xl">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 dark:text-zinc-500">Your Account Details</span>
                      <div className="mt-2 space-y-1.5 text-xs text-on-surface dark:text-zinc-350">
                        <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-500">User ID:</span> <span className="font-mono">{profileContext.user.id}</span></div>
                        <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-500">Full Name:</span> <span className="font-semibold">{profileContext.user.firstName} {profileContext.user.lastName}</span></div>
                        <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-500">Email:</span> <span className="font-semibold">{profileContext.user.email}</span></div>
                        <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-500">Role:</span> <span className="font-bold text-primary">{ROLE_LABELS[profileContext.user.role] || profileContext.user.role}</span></div>
                        <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-500">Account Status:</span> <Badge variant={profileContext.user.status === 'ACTIVE' ? 'success' : 'neutral'}>{profileContext.user.status}</Badge></div>
                      </div>
                    </div>
                  )}

                  {/* Tenant Section */}
                  {profileContext.hierarchy?.tenant && (
                    <div className="p-4 bg-surface-subtle dark:bg-zinc-900/40 border border-border-base dark:border-zinc-850 rounded-2xl">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 dark:text-zinc-500">Tenant Account Details</span>
                      <div className="mt-2 space-y-1.5 text-xs text-on-surface dark:text-zinc-350">
                        <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-550">Tenant ID:</span> <span className="font-mono">{profileContext.hierarchy.tenant._id || profileContext.hierarchy.tenant.id}</span></div>
                        <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-550">Company Name:</span> <span className="font-bold">{profileContext.hierarchy.tenant.name}</span></div>
                        <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-555">Tenant Slug:</span> <span className="font-mono">{profileContext.hierarchy.tenant.slug}</span></div>
                        <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-555">Status:</span> <Badge variant={profileContext.hierarchy.tenant.status === 'ACTIVE' ? 'success' : 'danger'}>{profileContext.hierarchy.tenant.status}</Badge></div>
                        <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-555">Subscription Tier:</span> <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{profileContext.hierarchy.tenant.subscriptionPlan}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Restaurants Section */}
                  {profileContext.hierarchy?.restaurants && profileContext.hierarchy.restaurants.length > 0 && (
                    <div className="p-4 bg-surface-subtle dark:bg-zinc-900/40 border border-border-base dark:border-zinc-850 rounded-2xl">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 dark:text-zinc-500">Restaurants Scope</span>
                      <div className="space-y-4 mt-2">
                        {profileContext.hierarchy.restaurants.map((rest) => (
                          <div key={rest._id || rest.id} className="border-l-2 border-primary pl-3 space-y-1 text-xs text-on-surface dark:text-zinc-350">
                            <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-550">Restaurant Name:</span> <span className="font-bold text-headline-sm">{rest.name}</span></div>
                            <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-550">Restaurant ID:</span> <span className="font-mono">{rest._id || rest.id}</span></div>
                            {rest.brandName && <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-550">Brand Name:</span> <span>{rest.brandName}</span></div>}
                            {rest.description && <div className="flex flex-col mt-0.5"><span className="text-on-surface-variant/70 dark:text-zinc-550">Description:</span> <span className="italic mt-0.5 text-on-surface-variant dark:text-zinc-400">{rest.description}</span></div>}
                            <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-550">Status:</span> <Badge variant={rest.status === 'ACTIVE' ? 'success' : 'danger'}>{rest.status}</Badge></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outlets Section */}
                  {profileContext.hierarchy?.outlets && profileContext.hierarchy.outlets.length > 0 && (
                    <div className="p-4 bg-surface-subtle dark:bg-zinc-900/40 border border-border-base dark:border-zinc-850 rounded-2xl">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 dark:text-zinc-500">Outlets Scope</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {profileContext.hierarchy.outlets.map((out) => {
                          const outletId = out._id || out.id;
                          const isOpen = out.status === 'ACTIVE';
                          const canToggle = ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'OUTLET_MANAGER'].includes(user?.role);
                          return (
                            <div key={outletId} className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-border-base/60 dark:border-zinc-900/60 shadow-2xs space-y-2 flex flex-col justify-between">
                              <div className="space-y-1.5 text-xs text-on-surface dark:text-zinc-350">
                                <h5 className="text-[13px] font-bold text-on-surface dark:text-zinc-200">{out.name}</h5>
                                <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-550">Outlet ID:</span> <span className="font-mono">{outletId}</span></div>
                                {out.slug && <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-555">Slug:</span> <span className="font-mono">{out.slug}</span></div>}
                                {out.phone && <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-555">Phone:</span> <span>{out.phone}</span></div>}
                                {out.email && <div className="flex justify-between"><span className="text-on-surface-variant/70 dark:text-zinc-555">Email:</span> <span>{out.email}</span></div>}
                                {out.address && (
                                  <div className="flex flex-col mt-0.5">
                                    <span className="text-on-surface-variant/70 dark:text-zinc-555">Address:</span>
                                    <span className="text-[11px] text-on-surface-variant dark:text-zinc-400 mt-0.5 leading-tight">
                                      {out.address}, {out.city}, {out.state} - {out.pincode}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="border-t border-border-base/40 dark:border-zinc-900/60 pt-2 flex items-center justify-between">
                                <span className="text-xs font-semibold text-on-surface-variant dark:text-zinc-450">Outlet Status:</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[11px] font-bold ${isOpen ? 'text-success-green' : 'text-zinc-500'}`}>
                                    {isOpen ? 'OPEN' : 'CLOSED'}
                                  </span>
                                  {canToggle && (
                                    <label className="relative inline-flex items-center cursor-pointer select-none">
                                      <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={isOpen}
                                        onChange={() => handleToggleOutletStatus(outletId, out.status)}
                                      />
                                      <div className="w-8 h-4.5 bg-zinc-300 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-success-green"></div>
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {getRoleActions().length > 0 && (
                    <div className="pt-4 border-t border-border-base dark:border-zinc-900">
                      <h4 className="text-xs font-bold text-on-surface dark:text-zinc-350 mb-3">Quick Navigation & Admin Actions</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getRoleActions().map((act) => (
                          <a
                            key={act.to}
                            href={act.to}
                            className="flex items-center justify-between p-3.5 bg-indigo-50/50 dark:bg-indigo-950/10 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-950/30 rounded-2xl transition-all group cursor-pointer decoration-none"
                          >
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px]">{act.icon}</span>
                              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-300">{act.label}</span>
                            </div>
                            <span className="material-symbols-outlined text-indigo-400 group-hover:translate-x-0.5 transition-transform text-[16px]">arrow_forward</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 text-on-surface-variant dark:text-zinc-500">
                  <p className="text-xs font-semibold">No active organizational context resolved for your account.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
