import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { Upload, File, Image, Trash2, X, ExternalLink, FileText } from 'lucide-react';

const DOC_TYPES = [
  { value: 'pay_stub',    label: 'Pay Stub' },
  { value: 'tax_return',  label: 'Tax Return (W-2)' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'id_front',    label: 'ID — Front' },
  { value: 'id_back',     label: 'ID — Back' },
  { value: 'lease',       label: 'Lease Agreement' },
  { value: 'reference',   label: 'Reference Letter' },
  { value: 'other',       label: 'Other Document' },
];

function FileIcon({ mime }) {
  if (mime?.startsWith('image/')) return <Image size={20} color="#0071e3" />;
  return <FileText size={20} color="#ffd60a" />;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragover, setDragover] = useState(false);
  const [selectedType, setSelectedType] = useState('pay_stub');
  const [uploadModal, setUploadModal] = useState(false);
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { documents } = await api.getMyDocuments();
      setDocs(documents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', selectedType);
      await api.uploadDocument(fd);
      setSuccess('Document uploaded successfully!');
      setUploadModal(false);
      await load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragover(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.deleteDocument(id);
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const groupedDocs = DOC_TYPES.reduce((acc, t) => {
    const items = docs.filter(d => d.type === t.value);
    if (items.length) acc[t.label] = items;
    return acc;
  }, {});
  const otherDocs = docs.filter(d => !DOC_TYPES.find(t => t.value === d.type));

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 6 }}>Documents</h1>
          <p style={{ color: 'rgba(245,245,247,0.45)', fontSize: 14 }}>
            Securely store your rental application documents
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setUploadModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={16} /> Upload Document
        </button>
      </div>

      {success && (
        <div style={{ background:'rgba(48,209,88,0.08)', border:'1px solid rgba(48,209,88,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:20, color:'#30d158', fontSize:14 }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{ background:'rgba(255,69,58,0.08)', border:'1px solid rgba(255,69,58,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:20, color:'#ff453a', fontSize:14 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div className="spinner spinner-lg" />
        </div>
      )}

      {!loading && docs.length === 0 && (
        <div
          className={`upload-zone ${dragover ? 'dragover' : ''}`}
          onClick={() => setUploadModal(true)}
          onDragOver={e => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={handleDrop}
          style={{ padding: 60 }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>📎</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No documents yet</h3>
          <p style={{ color: 'rgba(245,245,247,0.4)', fontSize: 14, marginBottom: 20 }}>
            Drag & drop files here, or click to browse
          </p>
          <p style={{ fontSize: 12, color: 'rgba(245,245,247,0.25)' }}>
            Supported: JPG, PNG, PDF, DOC · Max 10MB
          </p>
        </div>
      )}

      {/* Document list */}
      {!loading && docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(groupedDocs).map(([label, items]) => (
            <div key={label}>
              <h3 style={{ fontSize: 13, color: 'rgba(245,245,247,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {label}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(doc => <DocRow key={doc.id} doc={doc} onDelete={handleDelete} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div className="modal-overlay" onClick={() => setUploadModal(false)}>
          <div className="modal-box" style={{ padding: 32, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>Upload Document</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setUploadModal(false)}><X size={18} /></button>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Document Type</label>
              <select className="form-input" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                {DOC_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div
              className={`upload-zone ${dragover ? 'dragover' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragover(true); }}
              onDragLeave={() => setDragover(false)}
              onDrop={handleDrop}
              style={{ marginBottom: 20 }}
            >
              {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="spinner spinner-lg" />
                  <p style={{ color: 'rgba(245,245,247,0.5)', fontSize: 14 }}>Uploading…</p>
                </div>
              ) : (
                <>
                  <Upload size={28} color="rgba(245,245,247,0.3)" style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Drop file here</p>
                  <p style={{ fontSize: 13, color: 'rgba(245,245,247,0.35)' }}>or click to browse</p>
                  <p style={{ fontSize: 11, color: 'rgba(245,245,247,0.2)', marginTop: 8 }}>JPG, PNG, PDF, DOC · Max 10MB</p>
                </>
              )}
            </div>

            <input ref={fileRef} type="file" style={{ display: 'none' }}
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
              onChange={e => handleFile(e.target.files[0])} />

            {error && (
              <div style={{ background:'rgba(255,69,58,0.08)', border:'1px solid rgba(255,69,58,0.2)', borderRadius:10, padding:'10px 14px', color:'#ff453a', fontSize:13 }}>
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DocRow({ doc, onDelete }) {
  return (
    <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileIcon mime={doc.mime_type} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.name}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(245,245,247,0.35)' }}>
          {formatSize(doc.size)} · {new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon btn-sm">
          <ExternalLink size={14} />
        </a>
        <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(doc.id)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
