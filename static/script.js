document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardContainer = document.getElementById('dashboard-container');
    const navLinks = document.querySelectorAll('.nav-link');
    const contentPanels = document.querySelectorAll('.content-panel');
    const logoutBtn = document.getElementById('logout-btn');
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');

    const loginForm = document.getElementById('login-form');
    const addUserForm = document.getElementById('add-user-form');
    const addMenuForm = document.getElementById('add-menu-form');
    const waiterOrderForm = document.getElementById('waiter-order-form');
    
    const todayTotalBill = document.getElementById('today-total-bill');
    const revenueHistoryTableBody = document.querySelector('#revenue-history-table tbody');
    const usersTableBody = document.querySelector('#users-table tbody');
    const menuTableBody = document.querySelector('#menu-table tbody');
    const billTableBody = document.querySelector('#bill-table tbody');
    const dateSearchInput = document.getElementById('date-search');
    const searchBtn = document.getElementById('search-btn');

    const detailedHistoryTitle = document.getElementById('detailed-history-title');
    const detailedHistoryTableBody = document.querySelector('#detailed-history-table tbody');

    const staffMenuTableBody = document.querySelector('#staff-menu-table tbody');
    const staffOrdersTableBody = document.querySelector('#staff-orders-table tbody');
    
    const menuCardsContainer = document.getElementById('menu-cards-container');
    const orderSummaryItems = document.getElementById('order-summary-items');
    const orderTotalAmount = document.getElementById('order-total-amount');
    const waiterOrdersTableBody = document.querySelector('#waiter-orders-table tbody');

    const editModal = document.getElementById('edit-modal');
    const cancelModal = document.getElementById('cancel-modal');
    const editModalForm = document.getElementById('edit-order-form');
    const editModalItemsContainer = document.getElementById('edit-modal-menu-items');
    const editModalTotal = document.getElementById('edit-modal-total-amount');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const keepOrderBtn = document.getElementById('keep-order-btn');
    const modalCloseBtns = document.querySelectorAll('.close-btn');

    let currentRole = null;
    let menuItems = [];
    let currentOrder = {};

    async function login(event) {
        event.preventDefault();
        const formData = new FormData(loginForm);
        try {
            const response = await fetch('/login', { method: 'POST', body: formData });
            const result = await response.json();
            if (response.ok) {
                currentRole = result.role;
                updateUI(currentRole);
                fetchData();
            } else {
                document.getElementById('login-message').textContent = result.detail;
            }
        } catch (error) {
            document.getElementById('login-message').textContent = 'An error occurred. Please try again.';
        }
    }

    async function logout() {
        await fetch('/logout', { method: 'POST' });
        currentRole = null;
        updateUI(currentRole);
    }

    function updateUI(role) {
        if (!role) {
            loginSection.style.display = 'flex';
            dashboardContainer.style.display = 'none';
            return;
        }

        loginSection.style.display = 'none';
        dashboardContainer.style.display = 'grid';

        navLinks.forEach(link => {
            link.style.display = 'none';
            const panel = link.dataset.panel;
            if (role === 'admin') {
                if (panel.startsWith('admin-')) link.style.display = 'flex';
            } else if (role === 'staff') {
                if (panel.startsWith('staff-')) link.style.display = 'flex';
            } else if (role === 'waiter') {
                if (panel === 'waiter-orders') link.style.display = 'flex';
            }
        });

        const defaultPanel = { 'admin': 'admin-dashboard', 'staff': 'staff-menu', 'waiter': 'waiter-orders' }[role];
        showPanel(defaultPanel);
    }

    function showPanel(panelId) {
        contentPanels.forEach(panel => panel.classList.remove('active'));
        document.getElementById(panelId).classList.add('active');

        navLinks.forEach(link => link.classList.remove('active'));
        const navLink = document.querySelector(`[data-panel="${panelId}"]`);
        if (navLink) navLink.classList.add('active');
    }

    async function fetchData() {
        menuItems = await (await fetch('/api/menu')).json();
        if (currentRole === 'admin') {
            await Promise.all([
                fetchAndRenderUsers(),
                fetchAndRenderAdminMenu(),
                fetchAndRenderAdminBills(),
                fetchAndRenderRevenueData()
            ]);
        } else if (currentRole === 'staff') {
            await Promise.all([
                fetchAndRenderStaffMenu(),
                fetchAndRenderStaffOrders()
            ]);
        } else if (currentRole === 'waiter') {
            await Promise.all([
                fetchAndRenderWaiterMenu(),
                fetchAndRenderWaiterOrders()
            ]);
        }
    }

    async function fetchAndRenderUsers() {
        const users = await (await fetch('/api/users')).json();
        usersTableBody.innerHTML = '';
        users.forEach(user => {
            const row = usersTableBody.insertRow();
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.role.toUpperCase()}</td>
                <td><button data-id="${user.id}" class="btn-small btn-danger delete-user-btn">Delete</button></td>
            `;
        });
        document.querySelectorAll('.delete-user-btn').forEach(btn => btn.addEventListener('click', deleteUser));
    }
    
    async function fetchAndRenderAdminMenu() {
        menuTableBody.innerHTML = '';
        menuItems.forEach(item => {
            const row = menuTableBody.insertRow();
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>
                    <form class="update-price-form" style="display:flex;gap:5px;">
                        <input type="hidden" name="item_id" value="${item.id}">
                        <input type="number" name="price" placeholder="Price" style="width: 80px;" value="${item.price}" step="0.01" required>
                        <button type="submit" class="btn-small btn-success">Update</button>
                    </form>
                </td>
                <td>${item.stock}</td>
                <td>
                    <form class="actions-form" style="display:inline-block;">
                        <input type="hidden" name="item_id" value="${item.id}">
                        <button type="submit" class="btn-small btn-danger delete-menu-item-btn">Delete</button>
                    </form>
                </td>
            `;
        });
        document.querySelectorAll('.delete-menu-item-btn').forEach(btn => btn.addEventListener('click', deleteMenuItem));
        document.querySelectorAll('.update-price-form').forEach(form => form.addEventListener('submit', updatePrice));
    }

    async function fetchAndRenderStaffMenu() {
        staffMenuTableBody.innerHTML = '';
        menuItems.forEach(item => {
            const row = staffMenuTableBody.insertRow();
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>${item.stock}</td>
                <td>
                    <form class="update-stock-form" style="display:flex;gap:5px;">
                        <input type="hidden" name="item_id" value="${item.id}">
                        <input type="number" name="quantity" placeholder="New Stock" style="width: 80px;" required>
                        <button type="submit" class="btn-small btn-success">Update</button>
                    </form>
                </td>
            `;
        });
        document.querySelectorAll('.update-stock-form').forEach(form => form.addEventListener('submit', updateStock));
    }
    
    async function fetchAndRenderAdminBills() {
        const orders = await (await fetch('/api/orders')).json();
        billTableBody.innerHTML = '';
        orders.forEach(order => {
            const itemsList = order.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            const row = billTableBody.insertRow();
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.customer_name}</td>
                <td><span class="status-badge ${order.status}">${order.status.toUpperCase()}</span></td>
                <td>₹${order.total.toFixed(2)}</td>
                <td>${itemsList}</td>
                <td>
                    <button data-id="${order.id}" data-status="paid" class="btn-small btn-success update-status-btn">Mark Paid</button>
                </td>
            `;
        });
        document.querySelectorAll('.update-status-btn').forEach(btn => btn.addEventListener('click', updateOrderStatus));
    }

    async function fetchAndRenderRevenueData(searchDate = '') {
        let url = '/api/admin/revenue_data';
        const data = await (await fetch(url)).json();
        
        todayTotalBill.textContent = `₹${data.today_total.toFixed(2)}`;
        
        let historyToRender = data.revenue_history;
        if (searchDate) {
            historyToRender = historyToRender.filter(item => item.date.includes(searchDate));
        }

        revenueHistoryTableBody.innerHTML = '';
        historyToRender.forEach(item => {
            const row = revenueHistoryTableBody.insertRow();
            row.innerHTML = `<td data-date="${item.date}">${item.date}</td><td>₹${item.total.toFixed(2)}</td>`;
            row.style.cursor = 'pointer';
        });

        document.querySelectorAll('#revenue-history-table tbody tr').forEach(row => {
            row.addEventListener('click', () => {
                const date = row.querySelector('td').dataset.date;
                showDetailedOrderHistoryPage(date);
            });
        });
    }

    async function showDetailedOrderHistoryPage(date) {
        const orders = await (await fetch(`/api/orders/date?date=${date}`)).json();
        
        detailedHistoryTitle.textContent = `Order History for ${date}`;
        detailedHistoryTableBody.innerHTML = '';

        orders.forEach(order => {
            const time = order.date.split(', ')[1];
            const itemsList = order.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            const row = detailedHistoryTableBody.insertRow();
            row.innerHTML = `
                <td>${time}</td>
                <td>${order.customer_name}</td>
                <td>${itemsList}</td>
                <td>₹${order.total.toFixed(2)}</td>
            `;
        });
        
        showPanel('admin-detailed-history');
    }

    async function fetchAndRenderStaffOrders() {
        const orders = await (await fetch('/api/orders')).json();
        staffOrdersTableBody.innerHTML = '';
        orders.forEach(order => {
            const itemsList = order.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            const row = staffOrdersTableBody.insertRow();
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.customer_name}</td>
                <td>₹${order.total.toFixed(2)}</td>
                <td>${itemsList}</td>
                <td><span class="status-badge ${order.status}">${order.status.toUpperCase()}</span></td>
                <td>
                    <select data-id="${order.id}" class="status-select">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                        <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                    </select>
                </td>
            `;
        });
        document.querySelectorAll('.status-select').forEach(select => select.addEventListener('change', updateOrderStatus));
    }

    async function fetchAndRenderWaiterMenu() {
        menuItems = await (await fetch('/api/menu')).json();
        menuCardsContainer.innerHTML = '';
        currentOrder = {};
        
        menuItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.innerHTML = `
                <div class="menu-item-info">
                    <h4>${item.name}</h4>
                    <span>₹${item.price.toFixed(2)} | ${item.stock} available</span>
                </div>
                <div class="quantity-controls">
                    <button type="button" class="btn-small btn-secondary minus-btn" data-id="${item.id}">-</button>
                    <span id="qty-${item.id}" class="quantity-display">0</span>
                    <button type="button" class="btn-small btn-secondary plus-btn" data-id="${item.id}">+</button>
                </div>
            `;
            menuCardsContainer.appendChild(div);
        });

        document.querySelectorAll('.minus-btn').forEach(btn => btn.addEventListener('click', updateQuantity));
        document.querySelectorAll('.plus-btn').forEach(btn => btn.addEventListener('click', updateQuantity));
    }

    async function fetchAndRenderWaiterOrders() {
        const allOrders = await (await fetch('/api/orders')).json();
        const myOrders = allOrders.filter(o => o.status !== 'paid');
        waiterOrdersTableBody.innerHTML = '';
        myOrders.forEach(order => {
            const row = waiterOrdersTableBody.insertRow();
            const itemsList = order.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.customer_name}</td>
                <td>₹${order.total.toFixed(2)}</td>
                <td><span class="status-badge ${order.status}">${order.status.toUpperCase()}</span></td>
                <td>
                    <button data-id="${order.id}" class="btn-small btn-secondary edit-order-btn">Edit</button>
                    <button data-id="${order.id}" class="btn-small btn-danger cancel-order-btn">Cancel</button>
                </td>
            `;
            if (order.status !== 'pending' && order.status !== 'preparing') {
                row.querySelector('.edit-order-btn').disabled = true;
                row.querySelector('.cancel-order-btn').disabled = true;
            }
        });
        document.querySelectorAll('.edit-order-btn').forEach(btn => btn.addEventListener('click', showEditModal));
        document.querySelectorAll('.cancel-order-btn').forEach(btn => btn.addEventListener('click', showCancelModal));
    }

    async function deleteUser(e) {
        const userId = e.currentTarget.dataset.id;
        const formData = new FormData();
        formData.append('user_id', userId);
        await fetch('/api/users/delete', { method: 'POST', body: formData });
        await fetchAndRenderUsers();
    }
    
    async function deleteMenuItem(e) {
        e.preventDefault();
        const itemId = e.currentTarget.dataset.id;
        const formData = new FormData();
        formData.append('item_id', itemId);
        await fetch('/api/menu/delete', { method: 'POST', body: formData });
        await fetchAndRenderAdminMenu();
    }

    async function cancelOrder(orderId) {
        const formData = new FormData();
        formData.append('order_id', orderId);
        const response = await fetch('/api/orders/delete', { method: 'POST', body: formData });
        if (response.ok) {
            alert("Order cancelled successfully.");
            closeModal();
            await fetchData();
        } else {
            const result = await response.json();
            alert(`Error: ${result.detail}`);
        }
    }

    async function updateStock(e) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        await fetch('/api/menu/update_stock', { method: 'POST', body: formData });
        await fetchData();
    }
    
    async function updatePrice(e) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        await fetch('/api/menu/update_price', { method: 'POST', body: formData });
        await fetchData();
    }

    async function updateOrderStatus(e) {
        const orderId = e.currentTarget.dataset.id || e.currentTarget.value;
        const newStatus = e.currentTarget.value || e.currentTarget.dataset.status;
        const formData = new FormData();
        formData.append('order_id', orderId);
        formData.append('new_status', newStatus);
        await fetch('/api/orders/update_status', { method: 'POST', body: formData });
        if (currentRole === 'staff') await fetchAndRenderStaffOrders();
        else if (currentRole === 'admin') await fetchAndRenderAdminBills();
    }
    
    async function showEditModal(e) {
        const orderId = e.currentTarget.dataset.id;
        const order = await (await fetch(`/api/orders/item?order_id=${orderId}`)).json();
        
        document.getElementById('edit-modal-order-id').value = orderId;
        document.getElementById('edit-modal-customer-name').value = order.customer_name;
        
        editModalItemsContainer.innerHTML = '';
        const orderItems = {};
        let total = 0;
        
        menuItems.forEach(item => {
            const currentQty = (order.items.find(i => i.name === item.name) || { quantity: 0 }).quantity;
            orderItems[item.id] = currentQty;
            total += currentQty * item.price;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item';
            itemDiv.innerHTML = `
                <div class="menu-item-info">
                    <h4>${item.name}</h4>
                    <span>₹${item.price.toFixed(2)} | ${item.stock} available</span>
                </div>
                <div class="quantity-controls">
                    <button type="button" class="btn-small btn-secondary minus-btn-modal" data-id="${item.id}">-</button>
                    <span id="modal-qty-${item.id}" class="quantity-display">${currentQty}</span>
                    <button type="button" class="btn-small btn-secondary plus-btn-modal" data-id="${item.id}">+</button>
                </div>
            `;
            editModalItemsContainer.appendChild(itemDiv);
        });

        editModalTotal.textContent = `₹${total.toFixed(2)}`;
        
        document.querySelectorAll('.plus-btn-modal').forEach(btn => btn.addEventListener('click', updateModalQuantity));
        document.querySelectorAll('.minus-btn-modal').forEach(btn => btn.addEventListener('click', updateModalQuantity));
        
        editModal.currentOrder = orderItems;
        editModal.style.display = 'flex';
    }

    function updateModalQuantity(e) {
        const itemId = e.currentTarget.dataset.id;
        const item = menuItems.find(i => i.id == itemId);
        const currentQty = editModal.currentOrder[itemId] || 0;

        if (e.currentTarget.textContent === '+') {
            if (currentQty < item.stock) editModal.currentOrder[itemId] = currentQty + 1;
        } else {
            if (currentQty > 0) editModal.currentOrder[itemId] = currentQty - 1;
        }

        const qtySpan = document.getElementById(`modal-qty-${itemId}`);
        if (qtySpan) qtySpan.textContent = editModal.currentOrder[itemId] || 0;
        
        let newTotal = 0;
        for (const id in editModal.currentOrder) {
            const orderedItem = menuItems.find(i => i.id == id);
            newTotal += (editModal.currentOrder[id] || 0) * orderedItem.price;
        }
        editModalTotal.textContent = `₹${newTotal.toFixed(2)}`;
    }
    
    async function submitEditedOrder(e) {
        e.preventDefault();
        const orderId = document.getElementById('edit-modal-order-id').value;
        const customerName = document.getElementById('edit-modal-customer-name').value;
        
        const items = Object.keys(editModal.currentOrder).filter(id => editModal.currentOrder[id] > 0).map(id => {
            const item = menuItems.find(i => i.id == id);
            return { name: item.name, quantity: editModal.currentOrder[id] };
        });

        if (items.length === 0) {
            alert('Please select at least one item.');
            return;
        }
        
        const requestBody = {
            order_id: parseInt(orderId),
            customer_name: customerName,
            items: items
        };

        const response = await fetch('/api/orders/edit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            alert('Order updated successfully!');
            closeModal();
            await fetchData();
        } else {
            const result = await response.json();
            alert(`Failed to update order: ${result.detail}`);
        }
    }

    function showCancelModal(e) {
        const orderId = e.currentTarget.dataset.id;
        confirmCancelBtn.dataset.id = orderId;
        cancelModal.style.display = 'flex';
    }
    
    function closeModal() {
        editModal.style.display = 'none';
        cancelModal.style.display = 'none';
    }

    function updateQuantity(e) {
        const itemId = e.currentTarget.dataset.id;
        const item = menuItems.find(i => i.id == itemId);
        const currentQty = currentOrder[itemId] || 0;
    
        if (e.currentTarget.textContent === '+') {
            if (currentQty < item.stock) {
                currentOrder[itemId] = currentQty + 1;
            }
        } else {
            if (currentQty > 0) {
                currentOrder[itemId] = currentQty - 1;
            }
        }
    
        const qtySpan = document.getElementById(`qty-${itemId}`);
        if (qtySpan) qtySpan.textContent = currentOrder[itemId] || 0;
        updateOrderSummary();
    }
    
    function updateOrderSummary() {
        orderSummaryItems.innerHTML = '';
        let total = 0;
        for (const itemId in currentOrder) {
            if (currentOrder[itemId] > 0) {
                const item = menuItems.find(i => i.id == itemId);
                const itemTotal = currentOrder[itemId] * item.price;
                total += itemTotal;
                const div = document.createElement('div');
                div.innerHTML = `<span>${item.name} x ${currentOrder[itemId]}</span><span>₹${itemTotal.toFixed(2)}</span>`;
                orderSummaryItems.appendChild(div);
            }
        }
        orderTotalAmount.textContent = `₹${total.toFixed(2)}`;
    }
    
    async function submitOrder(e) {
        e.preventDefault();
        const customerName = document.getElementById('customer-name').value;
        if (!customerName) {
            alert('Please enter a customer name.');
            return;
        }

        const items = Object.keys(currentOrder).filter(id => currentOrder[id] > 0).map(id => {
            const item = menuItems.find(i => i.id == id);
            return { name: item.name, quantity: currentOrder[id] };
        });

        if (items.length === 0) {
            alert('Please select at least one item.');
            return;
        }

        const requestBody = {
            customer_name: customerName,
            items: items
        };

        const response = await fetch('/api/orders/place', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            alert('Order placed successfully!');
            resetWaiterForm();
            await fetchData();
        } else {
            const result = await response.json();
            alert(`Failed to place order: ${result.detail}`);
        }
    }
    
    function resetWaiterForm() {
        waiterOrderForm.reset();
        currentOrder = {};
        orderSummaryItems.innerHTML = '';
        orderTotalAmount.textContent = '₹0.00';
        document.querySelectorAll('.quantity-display').forEach(el => el.textContent = '0');
    }

    loginForm.addEventListener('submit', login);
    logoutBtn.addEventListener('click', logout);
    navLinks.forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        showPanel(e.currentTarget.dataset.panel);
    }));

    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        await fetch('/api/users/add', { method: 'POST', body: formData });
        e.currentTarget.reset();
        await fetchAndRenderUsers();
    });

    addMenuForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        await fetch('/api/menu/add', { method: 'POST', body: formData });
        e.currentTarget.reset();
        await fetchAndRenderAdminMenu();
    });
    
    confirmCancelBtn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.id;
        cancelOrder(orderId);
    });
    keepOrderBtn.addEventListener('click', closeModal);
    modalCloseBtns.forEach(btn => btn.addEventListener('click', closeModal));

    backToDashboardBtn.addEventListener('click', () => {
        showPanel('admin-dashboard');
        fetchAndRenderRevenueData();
    });

    searchBtn.addEventListener('click', () => {
        const date = dateSearchInput.value;
        fetchAndRenderRevenueData(date);
    });

    dateSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchBtn.click();
        }
    });
    
    waiterOrderForm.addEventListener('submit', submitOrder);
    editModalForm.addEventListener('submit', submitEditedOrder);
});