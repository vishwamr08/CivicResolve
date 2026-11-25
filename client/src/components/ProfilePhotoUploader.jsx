import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';
import AvatarDisplay from './AvatarDisplay';
import { getApiUrl } from '../config/api';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProfilePhotoUploader({
  user,
  userType = 'citizen',
  token,
  onPhotoUpdated,
  lang = 'en'
}) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const endpoint = userType === 'admin'
    ? getApiUrl('/api/admin/profile/photo')
    : getApiUrl('/api/citizen/profile/photo');

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    setStatusMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatusMsg({
        type: 'error',
        text: lang === 'ta'
          ? 'JPEG, PNG அல்லது WebP படங்கள் மட்டுமே அனுமதிக்கப்படும்.'
          : 'Invalid file format. Please choose a JPEG, PNG, or WebP photo.'
      });
      e.target.value = '';
      return;
    }

    if (file.size > MAX_BYTES) {
      setStatusMsg({
        type: 'error',
        text: lang === 'ta'
          ? 'புகைப்பட அளவு 2 MB க்கு மேல் இருக்கக்கூடாது.'
          : 'File is too large. Maximum allowed profile photo size is 2 MB.'
      });
      e.target.value = '';
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(nextUrl);
  };

  const handleUploadSave = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(25);
    setStatusMsg(null);

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);

      setUploadProgress(60);
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      headers['X-Portal-Context'] = userType;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData
      });

      setUploadProgress(90);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload profile photo.');
      }

      setUploadProgress(100);
      const updatedUser = data.citizen || data.admin || { ...user, profile_photo_url: data.profile_photo_url };
      if (onPhotoUpdated) onPhotoUpdated(updatedUser);

      clearPreview();
      setStatusMsg({
        type: 'success',
        text: lang === 'ta'
          ? 'சுயவிவரப் புகைப்படம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!'
          : 'Profile photo uploaded and saved securely!'
      });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  };

  const handleRemovePhoto = async () => {
    setRemoving(true);
    setStatusMsg(null);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      headers['X-Portal-Context'] = userType;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove profile photo.');
      }

      const updatedUser = data.citizen || data.admin || { ...user, profile_photo_url: null };
      if (onPhotoUpdated) onPhotoUpdated(updatedUser);
      clearPreview();

      setStatusMsg({
        type: 'success',
        text: lang === 'ta'
          ? 'புகைப்படம் நீக்கப்பட்டு இயல்புநிலை அவதார் மீட்டமைக்கப்பட்டது.'
          : 'Profile photo removed. Default avatar restored.'
      });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setRemoving(false);
    }
  };

  const hasSavedPhoto = Boolean(user?.profile_photo_url);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#1a3c6e]" />
            <span>{lang === 'ta' ? 'சுயவிவரப் புகைப்படம்' : 'Profile Photo'}</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            JPEG, PNG or WebP up to 2 MB. Stored securely and displayed across navigation & portal.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          role="status"
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative">
          <AvatarDisplay user={user} previewUrl={previewUrl} size="xl" variant={userType} />
          {previewUrl && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#f47920] text-white text-[9px] font-bold uppercase tracking-wide shadow">
              Preview
            </span>
          )}
        </div>

        <div className="flex-1 w-full space-y-3 text-center sm:text-left">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            aria-label="Choose profile photo file"
            className="hidden"
          />

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#1a3c6e]">
                <span>Optimizing & Saving Photo...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1a3c6e] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-[#1a3c6e] bg-slate-50 border border-slate-300 hover:bg-slate-100 transition-colors min-h-[42px] disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{hasSavedPhoto || previewUrl ? 'Change Photo' : 'Select Photo'}</span>
            </button>

            {previewUrl && (
              <>
                <button
                  type="button"
                  onClick={handleUploadSave}
                  disabled={uploading}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#f47920] hover:bg-[#d96810] transition-colors shadow-xs min-h-[42px] disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Save Photo</span>
                </button>
                <button
                  type="button"
                  onClick={clearPreview}
                  disabled={uploading}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors min-h-[42px]"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </>
            )}

            {hasSavedPhoto && !previewUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={removing || uploading}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors min-h-[42px] disabled:opacity-50"
              >
                {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Supports mobile camera & gallery selection. Photos are automatically resized and stripped of EXIF location data.
          </p>
        </div>
      </div>
    </div>
  );
}
