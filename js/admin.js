import { firebaseConfig, cloudinaryConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// State
let listings = [];
let editingId = null;
let pendingImages = []; // { file, url (local preview) } for new uploads
let existingImages = []; // URLs already uploaded (when editing)
let deleteTargetId = null;

// ===== AUTH =====
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        loadListings();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        errorEl.textContent = 'Invalid email or password';
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

// ===== LOAD LISTINGS =====
async function loadListings() {
    const tbody = document.getElementById('listingsBody');
    try {
        const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        listings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        if (listings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">No listings yet. Click "Add New Listing" to get started.</td></tr>';
            return;
        }

        tbody.innerHTML = listings.map(listing => {
            const thumb = (listing.images && listing.images[0]) || 'images/logo.png';
            const created = listing.createdAt ? new Date(listing.createdAt.seconds * 1000).toLocaleDateString() : '-';
            return `
                <tr>
                    <td><img src="${thumb}" alt="" class="table-thumb"></td>
                    <td><strong>${escapeHTML(listing.title)}</strong></td>
                    <td>${escapeHTML(listing.price || 'Contact')}</td>
                    <td>${escapeHTML(listing.category || 'equipment')}</td>
                    <td><span class="status-badge ${listing.status || 'available'}">${listing.status || 'available'}</span></td>
                    <td>${created}</td>
                    <td>
                        <div class="table-actions">
                            <button class="edit-btn" data-id="${listing.id}">Edit</button>
                            <button class="delete-btn" data-id="${listing.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach event listeners
        tbody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
        });
    } catch (err) {
        console.error('Error loading listings:', err);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#c00;">Error loading listings. Check Firebase config.</td></tr>';
    }
}

// ===== CLOUDINARY UPLOAD =====
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
        { method: 'POST', body: formData }
    );

    if (!response.ok) {
        throw new Error('Image upload failed');
    }

    const data = await response.json();
    return data.secure_url;
}

// ===== ADD/EDIT MODAL =====
function openModal() {
    document.getElementById('listingModal').classList.add('open');
}

function closeModal() {
    document.getElementById('listingModal').classList.remove('open');
    resetForm();
}

function resetForm() {
    document.getElementById('listingForm').reset();
    document.getElementById('listingId').value = '';
    document.getElementById('location').value = 'Utah';
    document.getElementById('contactName').value = 'Shane';
    document.getElementById('contactPhone').value = '(801) 935-1133';
    editingId = null;
    pendingImages = [];
    existingImages = [];
    renderImagePreviews();
    document.getElementById('uploadProgress').style.display = 'none';
}

document.getElementById('addNewBtn').addEventListener('click', () => {
    resetForm();
    document.getElementById('modalTitle').textContent = 'Add New Listing';
    openModal();
});

document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);

function openEditModal(id) {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;

    editingId = id;
    document.getElementById('modalTitle').textContent = 'Edit Listing';
    document.getElementById('listingId').value = id;
    document.getElementById('title').value = listing.title || '';
    document.getElementById('price').value = listing.price || '';
    document.getElementById('category').value = listing.category || 'equipment';
    document.getElementById('location').value = listing.location || 'Utah';
    document.getElementById('status').value = listing.status || 'available';
    document.getElementById('description').value = listing.description || '';
    document.getElementById('specs').value = (listing.specs || []).join('\n');
    document.getElementById('contactName').value = listing.contactName || 'Shane';
    document.getElementById('contactPhone').value = listing.contactPhone || '(801) 935-1133';

    existingImages = [...(listing.images || [])];
    pendingImages = [];
    renderImagePreviews();
    openModal();
}

// ===== IMAGE HANDLING =====
document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('imageInput').click();
});

document.getElementById('imageInput').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const url = URL.createObjectURL(file);
        pendingImages.push({ file, url });
    });
    renderImagePreviews();
    e.target.value = '';
});

function renderImagePreviews() {
    const grid = document.getElementById('imagePreviewGrid');
    const allImages = [
        ...existingImages.map((url, i) => ({ type: 'existing', url, index: i })),
        ...pendingImages.map((img, i) => ({ type: 'pending', url: img.url, index: i }))
    ];

    if (allImages.length === 0) {
        grid.innerHTML = '';
        return;
    }

    grid.innerHTML = allImages.map((img, globalIndex) => `
        <div class="image-preview-item">
            <img src="${img.url}" alt="Preview">
            <button type="button" class="remove-img" data-type="${img.type}" data-index="${img.index}">&times;</button>
            ${globalIndex === 0 ? '<span class="cover-badge">Cover</span>' : ''}
        </div>
    `).join('');

    grid.querySelectorAll('.remove-img').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const index = parseInt(btn.dataset.index);
            if (type === 'existing') {
                existingImages.splice(index, 1);
            } else {
                URL.revokeObjectURL(pendingImages[index].url);
                pendingImages.splice(index, 1);
            }
            renderImagePreviews();
        });
    });
}

// ===== SAVE LISTING =====
document.getElementById('listingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // Upload new images to Cloudinary
        const uploadedUrls = [];
        if (pendingImages.length > 0) {
            document.getElementById('uploadProgress').style.display = 'block';
            const fill = document.getElementById('progressFill');
            const text = document.getElementById('progressText');

            for (let i = 0; i < pendingImages.length; i++) {
                text.textContent = `Uploading image ${i + 1} of ${pendingImages.length}...`;
                fill.style.width = `${((i) / pendingImages.length) * 100}%`;

                const url = await uploadToCloudinary(pendingImages[i].file);
                uploadedUrls.push(url);

                fill.style.width = `${((i + 1) / pendingImages.length) * 100}%`;
            }
            text.textContent = 'Upload complete!';
        }

        const allImageUrls = [...existingImages, ...uploadedUrls];

        const specsRaw = document.getElementById('specs').value;
        const specs = specsRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0);

        const data = {
            title: document.getElementById('title').value,
            price: document.getElementById('price').value,
            category: document.getElementById('category').value,
            location: document.getElementById('location').value,
            status: document.getElementById('status').value,
            description: document.getElementById('description').value,
            specs: specs,
            contactName: document.getElementById('contactName').value,
            contactPhone: document.getElementById('contactPhone').value,
            images: allImageUrls,
            updatedAt: Timestamp.now()
        };

        if (editingId) {
            await updateDoc(doc(db, 'listings', editingId), data);
        } else {
            data.createdAt = Timestamp.now();
            await addDoc(collection(db, 'listings'), data);
        }

        closeModal();
        await loadListings();
    } catch (err) {
        console.error('Error saving listing:', err);
        alert('Error saving listing: ' + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Listing';
    }
});

// ===== DELETE =====
function openDeleteModal(id) {
    deleteTargetId = id;
    document.getElementById('deleteModal').classList.add('open');
}

document.getElementById('deleteCancelBtn').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('open');
    deleteTargetId = null;
});

document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
    if (!deleteTargetId) return;
    const btn = document.getElementById('deleteConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
        await deleteDoc(doc(db, 'listings', deleteTargetId));
        document.getElementById('deleteModal').classList.remove('open');
        deleteTargetId = null;
        await loadListings();
    } catch (err) {
        console.error('Error deleting listing:', err);
        alert('Error deleting listing: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Delete';
    }
});

// ===== HELPERS =====
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
