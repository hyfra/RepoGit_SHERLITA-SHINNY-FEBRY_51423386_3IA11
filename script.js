// ===========================
// STATE MANAGEMENT
// ===========================
let bills = [];
let showForm = false;
let editingId = null;
let currentStep = 1;

// Form Data
let formData = {
    billName: '',
    date: new Date().toISOString().split('T')[0],
    participants: [''],
    items: [{ name: '', price: '', sharedBy: [] }],
    taxPercent: 10,
    servicePercent: 0,
    useTax: false,
    useService: false
};

// ===========================
// INITIALIZATION
// ===========================
function loadData() {
    const saved = localStorage.getItem('hyfraSplitBills');
    if (saved) {
        bills = JSON.parse(saved);
    }
    render();
}

function saveData() {
    localStorage.setItem('hyfraSplitBills', JSON.stringify(bills));
}

document.addEventListener('DOMContentLoaded', loadData);

// ===========================
// PARTICIPANT FUNCTIONS
// ===========================
function addParticipant() {
    formData.participants.push('');
    render();
}

function removeParticipant(index) {
    if (formData.participants.length > 1) {
        const removedName = formData.participants[index];
        formData.participants.splice(index, 1);

        formData.items = formData.items.map(item => ({
            ...item,
            sharedBy: item.sharedBy.filter(name => name !== removedName)
        }));

        render();
    }
}

function updateParticipant(index, value) {
    const oldName = formData.participants[index];
    formData.participants[index] = value;

    if (oldName && value) {
        formData.items = formData.items.map(item => ({
            ...item,
            sharedBy: item.sharedBy.map(name =>
                name === oldName ? value : name
            )
        }));
    }
}

// ===========================
// ITEM FUNCTIONS
// ===========================
function addItem() {
    formData.items.push({ name: '', price: '', sharedBy: [] });
    render();
}

function removeItem(index) {
    if (formData.items.length > 1) {
        formData.items.splice(index, 1);
        render();
    }
}

function updateItem(index, field, value) {
    formData.items[index][field] = value;
}

function toggleItemShare(itemIndex, participant) {
    const item = formData.items[itemIndex];
    const idx = item.sharedBy.indexOf(participant);

    if (idx > -1) {
        item.sharedBy.splice(idx, 1);
    } else {
        item.sharedBy.push(participant);
    }

    render();
}

// ===========================
// CALCULATION
// ===========================
function calculateBill() {
    const validParticipants = formData.participants.filter(p => p.trim() !== '');
    const validItems = formData.items.filter(item => 
        item.name.trim() && item.price && parseFloat(item.price) > 0
    );
    
    const subtotal = validItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const taxAmount = formData.useTax ? (subtotal * formData.taxPercent / 100) : 0;
    const serviceAmount = formData.useService ? (subtotal * formData.servicePercent / 100) : 0;
    const total = subtotal + taxAmount + serviceAmount;
    
    const splits = {};
    validParticipants.forEach(p => {
        splits[p] = { items: [], subtotal: 0, tax: 0, service: 0, total: 0, paid: false };
    });
    
    validItems.forEach(item => {
        const itemPrice = parseFloat(item.price);
        // PERUBAHAN: Tidak dibagi, setiap orang bayar full price
        const pricePerPerson = itemPrice; // Setiap orang bayar harga penuh
        
        item.sharedBy.forEach(person => {
            if (splits[person]) {
                splits[person].items.push({
                    name: item.name,
                    price: pricePerPerson,
                    shared: item.sharedBy.length > 1
                });
                splits[person].subtotal += pricePerPerson;
            }
        });
    });
    
    validParticipants.forEach(p => {
        const personSubtotal = splits[p].subtotal;
        splits[p].tax = formData.useTax ? (personSubtotal * formData.taxPercent / 100) : 0;
        splits[p].service = formData.useService ? (personSubtotal * formData.servicePercent / 100) : 0;
        splits[p].total = personSubtotal + splits[p].tax + splits[p].service;
    });
    
    return { splits, subtotal, taxAmount, serviceAmount, total };
}

// ===========================
// FORM SUBMISSION
// ===========================
function handleSubmit() {
    const validParticipants = formData.participants.filter(
        p => p.trim() !== ''
    );

    const validItems = formData.items.filter(
        item => item.name.trim() && item.price && parseFloat(item.price) > 0
    );

    if (!formData.billName.trim()) {
        alert('Masukkan nama tagihan!');
        return;
    }

    if (validParticipants.length === 0) {
        alert('Tambahkan minimal 1 peserta!');
        return;
    }

    if (validItems.length === 0) {
        alert('Tambahkan minimal 1 menu/item!');
        return;
    }

    const hasUnassignedItems = validItems.some(
        item => item.sharedBy.length === 0
    );

    if (hasUnassignedItems) {
        alert(
            'Ada item yang belum di-assign ke peserta! Pastikan semua item sudah dipilih pesertanya.'
        );
        return;
    }

    const calculation = calculateBill();

    const newBill = {
        id: editingId || Date.now(),
        name: formData.billName,
        date: formData.date,
        participants: validParticipants,
        items: validItems,
        useTax: formData.useTax,
        taxPercent: formData.taxPercent,
        useService: formData.useService,
        servicePercent: formData.servicePercent,
        ...calculation,
        createdAt: new Date().toISOString()
    };

    if (editingId) {
        bills = bills.map(b =>
            b.id === editingId ? newBill : b
        );
        editingId = null;
    } else {
        bills.unshift(newBill);
    }

    resetForm();
    saveData();
    render();
}

function resetForm() {
    formData = {
        billName: '',
        date: new Date().toISOString().split('T')[0],
        participants: [''],
        items: [{ name: '', price: '', sharedBy: [] }],
        taxPercent: 10,
        servicePercent: 0,
        useTax: false,
        useService: false
    };

    showForm = false;
    editingId = null;
    currentStep = 1;
}

// ===========================
// BILL OPERATIONS
// ===========================
function deleteBill(id) {
    if (confirm('Yakin ingin menghapus tagihan ini?')) {
        bills = bills.filter(b => b.id !== id);
        saveData();
        render();
    }
}

function editBill(bill) {
    formData.billName = bill.name;
    formData.date = bill.date;
    formData.participants = [...bill.participants];
    formData.items = JSON.parse(JSON.stringify(bill.items));
    formData.useTax = bill.useTax;
    formData.taxPercent = bill.taxPercent;
    formData.useService = bill.useService;
    formData.servicePercent = bill.servicePercent;

    editingId = bill.id;
    showForm = true;
    currentStep = 1;

    render();
}

function togglePaid(billId, participant) {
    bills = bills.map(bill => {
        if (bill.id === billId) {
            return {
                ...bill,
                splits: {
                    ...bill.splits,
                    [participant]: {
                        ...bill.splits[participant],
                        paid: !bill.splits[participant].paid
                    }
                }
            };
        }
        return bill;
    });

    saveData();
    render();
}

function getTotalPaid(bill) {
    return Object.values(bill.splits).filter(
        s => s.paid
    ).length;
}

// ===========================
// NAVIGATION
// ===========================
function nextStep() {
    if (currentStep === 1) {
        if (!formData.billName.trim()) {
            alert('Masukkan nama tagihan!');
            return;
        }

        const validParticipants = formData.participants.filter(
            p => p.trim() !== ''
        );

        if (validParticipants.length === 0) {
            alert('Tambahkan minimal 1 peserta!');
            return;
        }
    }

    if (currentStep === 2) {
        const validItems = formData.items.filter(
            item => item.name.trim() && item.price && parseFloat(item.price) > 0
        );

        if (validItems.length === 0) {
            alert('Tambahkan minimal 1 menu/item!');
            return;
        }
    }

    currentStep++;
    render();
}

function prevStep() {
    currentStep--;
    render();
}

function toggleForm() {
    showForm = !showForm;

    if (!showForm) {
        resetForm();
    }

    render();
}

// ===========================
// UTILITY FUNCTIONS
// ===========================
function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// ===========================
// EVENT LISTENERS
// ===========================
function attachEventListeners() {
    const billNameInput = document.getElementById('billName');
    const dateInput = document.getElementById('date');

    if (billNameInput) {
        billNameInput.addEventListener('input', e => {
            formData.billName = e.target.value;
        });
    }

    if (dateInput) {
        dateInput.addEventListener('change', e => {
            formData.date = e.target.value;
        });
    }
}

// ===========================
// RENDER FUNCTIONS
// ===========================
function render() {
    const root = document.getElementById('root');

    root.innerHTML = `
        <div class="container">
            ${renderHeader()}
            ${showForm ? renderForm() : ''}
            ${renderBillsList()}
            ${bills.length > 0 ? renderStats() : ''}
        </div>
    `;

    attachEventListeners();
}

function renderHeader() {
    return `
        <div class="header">
            <div class="header-content">
                <div class="header-title">
                    <div class="icon-box">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                    </div>
                    <div>
                        <h1>Split Bill Calculator - hyfra</h1>
                        <p class="subtitle">Hitung patungan dengan mudah</p>
                    </div>
                </div>

                <button class="btn-primary" onclick="toggleForm()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    ${showForm ? 'Tutup Form' : 'Buat Bill Baru'}
                </button>
            </div>
        </div>
    `;
}

function renderForm() {
    return `
        <div class="form-container">
            ${renderProgressSteps()}
            <h2 class="form-title">
                ${editingId ? 'Edit Tagihan' : 'Buat Tagihan Baru'}
            </h2>

            ${currentStep === 1 ? renderStep1() : ''}
            ${currentStep === 2 ? renderStep2() : ''}
            ${currentStep === 3 ? renderStep3() : ''}
            ${currentStep === 4 ? renderStep4() : ''}
        </div>
    `;
}

function renderProgressSteps() {
    const steps = ['Info', 'Menu', 'Bagikan', 'Review'];

    return `
        <div class="progress-steps">
            ${steps
                .map((label, index) => {
                    const stepNum = index + 1;

                    return `
                        <div class="step ${currentStep >= stepNum ? 'active' : ''}">
                            <div class="step-circle">${stepNum}</div>
                            <p class="step-label">${label}</p>
                        </div>
                        ${
                            stepNum < 4
                                ? `
                        <div class="step-line ${
                            currentStep > stepNum ? 'active' : ''
                        }"></div>
                        `
                                : ''
                        }
                    `;
                })
                .join('')}
        </div>
    `;
}

function renderBillsList() {
    if (bills.length === 0) {
        return `
            <div class="bill-card empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>

                <h3 style="color: #999; font-size: 1.5rem; margin-bottom: 10px;">
                    Belum ada tagihan
                </h3>

                <p style="color: #999;">
                    Klik "Buat Bill Baru" untuk memulai split bill
                </p>
            </div>
        `;
    }

    return bills
        .map(
            bill => `
        <div class="bill-card">
            ${renderBillHeader(bill)}
            ${renderBillSummary(bill)}
            ${renderBillItems(bill)}
            ${renderBillSplits(bill)}
        </div>
    `
        )
        .join('');
}

function renderStats() {
    const totalBills = bills.length;
    const totalAmount = bills.reduce((sum, b) => sum + b.total, 0);
    const totalItems = bills.reduce((sum, b) => sum + b.items.length, 0);

    return `
        <div class="stats-container">
            <h3 style="margin-bottom: 20px;">Statistik</h3>

            <div class="stats-grid">
                <div class="stat-card red">
                    <p class="stat-number">${totalBills}</p>
                    <p class="stat-label">Total Tagihan</p>
                </div>

                <div class="stat-card rose">
                    <p class="stat-number">
                        Rp ${totalAmount.toLocaleString('id-ID')}
                    </p>
                    <p class="stat-label">Total Semua Biaya</p>
                </div>

                <div class="stat-card pink">
                    <p class="stat-number">${totalItems}</p>
                    <p class="stat-label">Total Item</p>
                </div>
            </div>
        </div>
    `;
}

function renderBillHeader(bill) {
    return `
        <div class="bill-header">
            <div class="bill-info">
                <h3>${bill.name}</h3>
                <div class="bill-meta">
                    <span>📅 ${formatDate(bill.date)}</span>
                    <span>👥 ${bill.participants.length} orang</span>
                    <span>🛒 ${bill.items.length} item</span>
                </div>
            </div>

            <div class="bill-actions">
                <button
                    class="btn-icon btn-edit"
                    onclick="editBillById(${bill.id})"
                >
                    ✏
                </button>
                <button
                    class="btn-icon btn-delete"
                    onclick="deleteBill(${bill.id})"
                >
                    🗑
                </button>
            </div>
        </div>
    `;
}

function renderBillSummary(bill) {
    return `
        <div class="summary-banner">
            <div class="summary-grid">
                <div class="summary-item">
                    <p>Subtotal</p>
                    <p class="amount">
                        Rp ${bill.subtotal.toLocaleString('id-ID')}
                    </p>
                </div>

                ${
                    bill.useTax
                        ? `
                <div class="summary-item">
                    <p>PPN (${bill.taxPercent}%)</p>
                    <p class="amount">
                        Rp ${bill.taxAmount.toLocaleString('id-ID')}
                    </p>
                </div>
                `
                        : ''
                }

                ${
                    bill.useService
                        ? `
                <div class="summary-item">
                    <p>Service (${bill.servicePercent}%)</p>
                    <p class="amount">
                        Rp ${bill.serviceAmount.toLocaleString('id-ID')}
                    </p>
                </div>
                `
                        : ''
                }

                <div class="summary-item">
                    <p>TOTAL</p>
                    <p class="amount" style="font-size: 2rem;">
                        Rp ${bill.total.toLocaleString('id-ID')}
                    </p>
                </div>
            </div>

            <div class="summary-status">
                Status: ${getTotalPaid(bill)}/${bill.participants.length}
                terbayar
            </div>
        </div>
    `;
}

function renderBillItems(bill) {
    return `
        <div class="menu-section">
            <h4 class="section-title">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
                    ></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                Daftar Menu
            </h4>

            ${bill.items
                .map(
                    item => `
                <div class="menu-item">
                    <div class="menu-item-info">
                        <p>${item.name}</p>
                        <p>Dibagi: ${item.sharedBy.join(', ')}</p>
                    </div>
                    <p class="menu-item-price">
                        Rp ${parseFloat(item.price).toLocaleString('id-ID')}
                    </p>
                </div>
            `
                )
                .join('')}
        </div>
    `;
}

function renderBillSplits(bill) {
    return `
        <div>
            <h4 class="section-title">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                    ></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path
                        d="M23 21v-2a4 4 0 0 0-3-3.87"
                    ></path>
                    <path
                        d="M16 3.13a4 4 0 0 1 0 7.75"
                    ></path>
                </svg>
                Pembagian Per Orang
            </h4>

            ${bill.participants
                .map(participant =>
                    renderParticipantSplit(bill, participant)
                )
                .join('')}
        </div>
    `;
}

function renderStep1() {
    return `
        <div class="form-group">
            <label>Nama Tagihan *</label>
            <input type="text" id="billName" value="${formData.billName}" placeholder="Contoh: Makan di Resto ABC">
        </div>
        
        <div class="form-group">
            <label>Tanggal</label>
            <input type="date" id="date" value="${formData.date}">
        </div>
        
        <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <label style="margin: 0;">Peserta Patungan *</label>
                <button class="btn-secondary" onclick="addParticipant()" style="padding: 8px 15px;">
                    ➕ Tambah Peserta
                </button>
            </div>
            ${renderParticipants()}
        </div>
        
        <button class="btn-primary" onclick="nextStep()" style="width: 100%;">
            Lanjut ke Menu
        </button>
    `;
}

function renderParticipants() {
    return formData.participants.map((participant, index) => `
        <div class="participant-row">
            <input 
                type="text" 
                value="${participant}" 
                placeholder="Nama peserta ${index + 1}"
                onchange="updateParticipant(${index}, this.value)"
                style="flex: 1;"
            >
            ${formData.participants.length > 1 ? `
                <button class="btn-delete" onclick="removeParticipant(${index})">
                    🗑️
                </button>
            ` : ''}
        </div>
    `).join('');
}

function renderStep2() {
    const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    
    return `
        <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <label style="margin: 0;">Daftar Menu/Item *</label>
                <button class="btn-secondary" onclick="addItem()" style="padding: 8px 15px;">
                    ➕ Tambah Item
                </button>
            </div>
            ${renderItems()}
        </div>
        
        <div class="info-box">
            <p><strong>💡 Subtotal Menu: Rp ${subtotal.toLocaleString('id-ID')}</strong></p>
        </div>
        
        <div style="display: flex; gap: 15px;">
            <button class="btn-secondary" onclick="prevStep()" style="flex: 1;">
                Kembali
            </button>
            <button class="btn-primary" onclick="nextStep()" style="flex: 1;">
                Lanjut ke Pembagian
            </button>
        </div>
    `;
}

function renderItems() {
    return formData.items.map((item, index) => `
        <div class="participant-row">
            <input 
                type="text" 
                value="${item.name}" 
                placeholder="Nama menu"
                onchange="updateItem(${index}, 'name', this.value)"
                style="flex: 1;"
            >
            <input 
                type="number" 
                value="${item.price}" 
                placeholder="Harga"
                onchange="updateItem(${index}, 'price', this.value)"
                style="width: 150px;"
                min="0"
                step="1000"
            >
            ${formData.items.length > 1 ? `
                <button class="btn-delete" onclick="removeItem(${index})">
                    🗑️
                </button>
            ` : ''}
        </div>
    `).join('');
}

function renderParticipantSplit(bill, participant) {
    const split = bill.splits[participant];
    
    return `
        <div class="participant-item ${split.paid ? 'paid' : ''}">
            <div class="participant-header">
                <div class="participant-info">
                    <div class="avatar ${split.paid ? 'paid' : ''}">
                        ${participant.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p class="participant-name">${participant}</p>
                        <p class="participant-items-count">${split.items.length} item</p>
                    </div>
                </div>
                <button class="btn-check ${split.paid ? 'paid' : 'unpaid'}" onclick="togglePaid(${bill.id}, '${participant}')">
                    ${split.paid ? '✓' : '✗'}
                </button>
            </div>
            
            <div class="item-list">
                ${split.items.map(item => `
                    <div class="item-row">
                        <span class="item-row-name">• ${item.name} ${item.shared ? '(bersama)' : ''}</span>
                        <span class="item-row-price">Rp ${item.price.toLocaleString('id-ID')}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="breakdown">
                <div class="breakdown-row">
                    <span>Subtotal:</span>
                    <span>Rp ${split.subtotal.toLocaleString('id-ID')}</span>
                </div>
                ${bill.useTax ? `
                    <div class="breakdown-row">
                        <span>PPN (${bill.taxPercent}%):</span>
                        <span>Rp ${split.tax.toLocaleString('id-ID')}</span>
                    </div>
                ` : ''}
                ${bill.useService ? `
                    <div class="breakdown-row">
                        <span>Service (${bill.servicePercent}%):</span>
                        <span>Rp ${split.service.toLocaleString('id-ID')}</span>
                    </div>
                ` : ''}
                <div class="breakdown-total">
                    <span>Total:</span>
                    <span class="breakdown-total-amount">Rp ${split.total.toLocaleString('id-ID')}</span>
                </div>
            </div>
        </div>
    `;
}

function renderStep3() {
    const validParticipants = formData.participants.filter(p => p.trim());
    
    return `
        <div class="alert alert-warning">
            <p><strong>📋 Pilih peserta untuk setiap menu.</strong> Setiap orang yang dipilih akan membayar harga penuh item tersebut.</p>
        </div>
        
        ${formData.items
            .map((item, itemIndex) => {
                // Hanya tampilkan item yang sudah diisi
                if (!item.name.trim() || !item.price) return '';
                
                return `
                    <div class="item-card">
                        <div class="item-header">
                            <div>
                                <p class="item-name">${item.name}</p>
                                <p class="item-price">Rp ${parseFloat(item.price).toLocaleString('id-ID')} / orang</p>
                            </div>
                            ${item.sharedBy.length > 0 ? `
                                <span class="item-badge">${item.sharedBy.length} orang</span>
                            ` : ''}
                        </div>
                        <div class="participant-chips">
                            ${validParticipants.map(participant => `
                                <button 
                                    class="chip ${item.sharedBy.includes(participant) ? 'selected' : ''}"
                                    onclick="toggleItemShare(${itemIndex}, '${participant}')"
                                >
                                    ${item.sharedBy.includes(participant) ? '✓ ' : ''}${participant}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            })
            .join('')}
        
        <div style="display: flex; gap: 15px; margin-top: 20px;">
            <button class="btn-secondary" onclick="prevStep()" style="flex: 1;">
                Kembali
            </button>
            <button class="btn-primary" onclick="nextStep()" style="flex: 1;">
                Lanjut ke Pajak
            </button>
        </div>
    `;
}

function renderStep4() {
    const calc = calculateBill();

    return `
        <div class="form-group">
            <label
                style="display: flex; align-items: center; gap: 10px; cursor: pointer;"
            >
                <input
                    type="checkbox"
                    ${formData.useTax ? 'checked' : ''}
                    onchange="formData.useTax = this.checked; render();"
                >
                <span>Tambahkan PPN (Pajak)</span>
            </label>

            ${
                formData.useTax
                    ? `
            <div style="margin-left: 30px; margin-top: 10px;">
                <label style="font-size: 0.85rem;">
                    Persentase PPN (%)
                </label>
                <input
                    type="number"
                    value="${formData.taxPercent}"
                    onchange="formData.taxPercent = parseFloat(this.value) || 0; render();"
                    style="width: 120px;"
                    min="0"
                    max="100"
                    step="0.1"
                >
            </div>
            `
                    : ''
            }
        </div>

        <div class="form-group">
            <label
                style="display: flex; align-items: center; gap: 10px; cursor: pointer;"
            >
                <input
                    type="checkbox"
                    ${formData.useService ? 'checked' : ''}
                    onchange="formData.useService = this.checked; render();"
                >
                <span>Tambahkan Service Charge</span>
            </label>

            ${
                formData.useService
                    ? `
            <div style="margin-left: 30px; margin-top: 10px;">
                <label style="font-size: 0.85rem;">
                    Persentase Service (%)
                </label>
                <input
                    type="number"
                    value="${formData.servicePercent}"
                    onchange="formData.servicePercent = parseFloat(this.value) || 0; render();"
                    style="width: 120px;"
                    min="0"
                    max="100"
                    step="0.1"
                >
            </div>
            `
                    : ''
            }
        </div>

        <div class="info-box">
            <h4
                style="font-weight: bold; margin-bottom: 15px; color: #7f1d1d;"
            >
                💰 Ringkasan Total
            </h4>

            <div
                style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #555;"
            >
                <span>Subtotal Menu:</span>
                <span style="font-weight: 600;">
                    Rp ${calc.subtotal.toLocaleString('id-ID')}
                </span>
            </div>

            ${
                formData.useTax
                    ? `
            <div
                style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #dc2626;"
            >
                <span>PPN (${formData.taxPercent}%):</span>
                <span style="font-weight: 600;">
                    Rp ${calc.taxAmount.toLocaleString('id-ID')}
                </span>
            </div>
            `
                    : ''
            }

            ${
                formData.useService
                    ? `
            <div
                style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #dc2626;"
            >
                <span>Service (${formData.servicePercent}%):</span>
                <span style="font-weight: 600;">
                    Rp ${calc.serviceAmount.toLocaleString('id-ID')}
                </span>
            </div>
            `
                    : ''
            }

            <div
                style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 12px; border-top: 2px solid #dc2626; font-size: 1.1rem;"
            >
                <span style="font-weight: bold; color: #333;">
                    TOTAL:
                </span>
                <span style="font-weight: bold; color: #dc2626;">
                    Rp ${calc.total.toLocaleString('id-ID')}
                </span>
            </div>
        </div>

        <div style="display: flex; gap: 15px; margin-top: 20px;">
            <button
                class="btn-secondary"
                onclick="prevStep()"
                style="flex: 1;"
            >
                Kembali
            </button>

            <button
                class="btn-primary"
                onclick="handleSubmit()"
                style="flex: 1;"
            >
                ${editingId ? '✓ Update Tagihan' : '✓ Simpan Tagihan'}
            </button>
        </div>
    `;
}

// ===========================
// HELPER
// ===========================
function editBillById(id) {
    const bill = bills.find(b => b.id === id);
    if (bill) {
        editBill(bill);
    }
}