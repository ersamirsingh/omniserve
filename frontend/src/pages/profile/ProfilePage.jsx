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
  HiClock 
} from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import useAuth from '../../hooks/useAuth';
import { updateUserApi } from '../../api/models/user.api';
import { fetchCurrentUser } from '../../store/authSlice';
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from '../../utils/constants';

export default function ProfilePage() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
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
        <div className="md:col-span-1 bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 p-2.5 rounded-2xl flex flex-row md:flex-col gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap w-full cursor-pointer border-none text-left font-sans select-none ${
              activeTab === 'personal'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant dark:text-zinc-405 hover:bg-surface-container-low dark:hover:bg-zinc-900/60 hover:text-on-surface dark:hover:text-zinc-200'
            }`}
          >
            <HiUser className="text-sm shrink-0" /> Personal Info
          </button>
          <button
            onClick={() => setActiveTab('address')}
            className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap w-full cursor-pointer border-none text-left font-sans select-none ${
              activeTab === 'address'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant dark:text-zinc-405 hover:bg-surface-container-low dark:hover:bg-zinc-900/60 hover:text-on-surface dark:hover:text-zinc-200'
            }`}
          >
            <HiMapPin className="text-sm shrink-0" /> Address Details
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap w-full cursor-pointer border-none text-left font-sans select-none ${
              activeTab === 'verification'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant dark:text-zinc-405 hover:bg-surface-container-low dark:hover:bg-zinc-900/60 hover:text-on-surface dark:hover:text-zinc-200'
            }`}
          >
            <HiIdentification className="text-sm shrink-0" /> ID Verification
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap w-full cursor-pointer border-none text-left font-sans select-none ${
              activeTab === 'security'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant dark:text-zinc-405 hover:bg-surface-container-low dark:hover:bg-zinc-900/60 hover:text-on-surface dark:hover:text-zinc-200'
            }`}
          >
            <HiKey className="text-sm shrink-0" /> Security
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
                  className="w-full p-3 bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-xl text-xs font-semibold text-on-surface dark:text-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 resize-y min-h-24 placeholder-on-surface-variant/40"
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
            <form onSubmit={handleSavePassword} className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-zinc-150 text-[18px]">Change Password</h3>
                <p className="text-xs text-on-surface-variant dark:text-zinc-405">Update your password security regularly to prevent unauthorized access.</p>
              </div>

              <Input
                id="p-curr-pass"
                label="Current Password"
                type="password"
                value={form.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                placeholder="Enter current password"
              />
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

              <div className="flex justify-end pt-4 border-t border-border-base dark:bg-zinc-900">
                <Button type="submit" loading={loading} className="px-5 font-bold">
                  Update Password
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
