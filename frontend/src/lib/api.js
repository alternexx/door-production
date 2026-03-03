const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('door_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

async function uploadFile(path, formData) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export const api = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login:    (data) => request('/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
  me:       ()     => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  // Qual
  submitQual: (data) => request('/qual/submit',  { method: 'POST', body: JSON.stringify(data) }),
  getQual:    ()     => request('/qual/profile'),

  // Listings
  getListings: ()   => request('/listings'),
  getListing:  (id) => request(`/listings/${id}`),
  createListing: (data) => request('/listings', { method: 'POST', body: JSON.stringify(data) }),

  // Bookings
  createBooking: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getMyBookings: ()     => request('/bookings/mine'),
  cancelBooking: (id)   => request(`/bookings/${id}`, { method: 'DELETE' }),

  // Uploads
  uploadDocument: (formData) => uploadFile('/uploads/document', formData),
  getMyDocuments: ()         => request('/uploads/my-documents'),
  deleteDocument: (id)       => request(`/uploads/document/${id}`, { method: 'DELETE' }),

  // Health
  health: () => request('/health'),
};
