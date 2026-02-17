import React, { useEffect, useState, useRef } from 'react';
import { apiFetch, getApiBaseUrl } from '../lib/api';

export default function AdminContact() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        linkedinUrl: '',
        description: '',
        isVisible: true
    });
    const fileInputRef = useRef(null);
    const [submissionLoading, setSubmissionLoading] = useState(false);

    useEffect(() => {
        loadContacts();
    }, []);

    async function loadContacts() {
        setLoading(true);
        try {
            const data = await apiFetch('/contact/admin/all');
            setContacts(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setFormData({ name: '', linkedinUrl: '', description: '', isVisible: true });
        setEditId(null);
        setIsEditing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleEdit(contact) {
        setFormData({
            name: contact.name,
            linkedinUrl: contact.linkedinUrl || '',
            description: contact.description || '',
            isVisible: contact.isVisible
        });
        setEditId(contact.id);
        setIsEditing(true);
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this contact?')) return;
        try {
            await apiFetch(`/contact/${id}`, { method: 'DELETE' });
            setMsg('Contact deleted successfully.');
            loadContacts();
        } catch (e) {
            setError(e.message);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmissionLoading(true);
        setError('');
        setMsg('');

        try {
            const token = localStorage.getItem('accessToken');
            const baseUrl = getApiBaseUrl();
            const data = new FormData();
            data.append('name', formData.name);
            data.append('linkedinUrl', formData.linkedinUrl);
            data.append('description', formData.description);
            data.append('isVisible', formData.isVisible);

            if (fileInputRef.current && fileInputRef.current.files[0]) {
                data.append('picture', fileInputRef.current.files[0]);
            }

            let url = `${baseUrl}/contact`;
            let method = 'POST';

            if (isEditing) {
                url = `${baseUrl}/contact/${editId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Failed to save contact');
            }

            setMsg(isEditing ? 'Contact updated successfully.' : 'Contact added successfully.');
            resetForm();
            loadContacts();
        } catch (e) {
            setError(e.message);
        } finally {
            setSubmissionLoading(false);
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Contact Management</h1>
                    <p className="text-base-content/70">Manage the "Contact Us" page team members.</p>
                </div>
                <button className="btn btn-ghost" onClick={loadContacts}>Reload</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {msg && <div className="alert alert-success">{msg}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
                {/* List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Current Contacts</h2>
                    {loading ? (
                        <div className="grid gap-4">
                            {Array.from({ length: 4 }).map((_, idx) => (
                                <div key={`admin-contact-skeleton-${idx}`} className="card card-side bg-base-100 shadow-xl border border-base-200">
                                    <span className="app-skeleton h-32 w-32 rounded-none rounded-l-2xl" />
                                    <div className="card-body p-4">
                                        <span className="app-skeleton h-7 w-48" />
                                        <span className="app-skeleton h-4 w-full" />
                                        <span className="app-skeleton h-4 w-4/5" />
                                        <div className="mt-2 flex gap-2 justify-end">
                                            <span className="app-skeleton h-8 w-16 rounded-lg" />
                                            <span className="app-skeleton h-8 w-16 rounded-lg" />
                                            <span className="app-skeleton h-8 w-16 rounded-lg" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {contacts.map(c => (
                                <div key={c.id} className="card card-side bg-base-100 shadow-xl border border-base-200">
                                    <figure className="w-32 bg-base-200 object-cover">
                                        {c.pictureUrl ? (
                                            <img src={`${getApiBaseUrl().replace(/\/api$/, '')}${c.pictureUrl}`} alt={c.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full w-full text-4xl">👤</div>
                                        )}
                                    </figure>
                                    <div className="card-body p-4">
                                        <h3 className="card-title text-lg">{c.name} {c.isVisible ? <span className="badge badge-success badge-sm">Visible</span> : <span className="badge badge-ghost badge-sm">Hidden</span>}</h3>
                                        <p className="text-sm opacity-70 line-clamp-2">{c.description}</p>
                                        <div className="card-actions justify-end mt-2">
                                            {c.linkedinUrl && (
                                                <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="btn btn-xs btn-ghost text-blue-600">LinkedIn</a>
                                            )}
                                            <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(c)}>Edit</button>
                                            <button className="btn btn-sm btn-error btn-outline" onClick={() => handleDelete(c.id)}>Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {contacts.length === 0 && <p className="text-base-content/50 italic">No contacts found.</p>}
                        </div>
                    )}
                </div>

                {/* Form */}
                <div className="card bg-base-100 shadow-xl border border-base-200 h-fit sticky top-4">
                    <div className="card-body">
                        <h2 className="card-title">{isEditing ? 'Edit Contact' : 'Add New Contact'}</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text">Name</span></label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label className="label"><span className="label-text">LinkedIn URL</span></label>
                                <input
                                    type="url"
                                    className="input input-bordered"
                                    value={formData.linkedinUrl}
                                    onChange={e => setFormData({ ...formData, linkedinUrl: e.target.value })}
                                    placeholder="https://linkedin.com/in/..."
                                />
                            </div>

                            <div className="form-control">
                                <label className="label"><span className="label-text">Description</span></label>
                                <textarea
                                    className="textarea textarea-bordered h-24"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="form-control">
                                <label className="label"><span className="label-text">Picture</span></label>
                                <input
                                    type="file"
                                    className="file-input file-input-bordered w-full"
                                    ref={fileInputRef}
                                    accept="image/*"
                                />
                                {isEditing && <span className="text-xs text-info mt-1">Leave empty to keep current picture</span>}
                            </div>

                            <div className="form-control">
                                <label className="label cursor-pointer justify-start gap-4">
                                    <span className="label-text">Visible to public</span>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={formData.isVisible}
                                        onChange={e => setFormData({ ...formData, isVisible: e.target.checked })}
                                    />
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                {isEditing && <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>}
                                <button type="submit" className="btn btn-primary" disabled={submissionLoading}>
                                    {submissionLoading && <span className="modern-loader modern-loader-xs modern-loader-on-solid modern-loader-inline" aria-hidden="true"></span>}
                                    {isEditing ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
