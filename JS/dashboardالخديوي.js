document.addEventListener('DOMContentLoaded', () => {
    const orderListContainer = document.getElementById('order-list');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const startDateInput = document.getElementById('start-date-input');
    const endDateInput = document.getElementById('end-date-input');
    const filterDateBtn = document.getElementById('filter-date-btn');
    const shiftSearchInput = document.getElementById('shift-search-input');
    const searchShiftBtn = document.getElementById('search-shift-btn');
    const dailySalesBtn = document.getElementById('daily-sales-report-btn');
    const dailyInventoryBtn = document.getElementById('daily-inventory-report-btn');
    const endShiftBtn = document.getElementById('end-shift-btn');
    const currentShiftNumberElement = document.getElementById('current-shift-number');
    const newOrdersCountElement = document.getElementById('new-orders-count');
    const inProgressCountElement = document.getElementById('in-progress-count');
    const receivedCountElement = document.getElementById('received-count');

    // ضع هنا رابط Script الخاص بك:
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-lU5fK8J01r01gk5z7gsas6_oqbgZ4qYAwimgg3Bc2VxKZt-b0KI2vEXsXr9Wxhs/exec';

    let allOrders = [];

    // جلب الأوامر ورقم الوردية عند التحميل
    fetchAllOrders();
    fetchCurrentShiftNumber();
    setInterval(fetchAllOrders, 15000); // تحديث كل 15 ثانية

    filterDateBtn.addEventListener('click', () => {
        const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
        const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
        displayFilteredOrdersByDate(startDate, endDate);
    });

    searchShiftBtn.addEventListener('click', () => {
        const shiftId = shiftSearchInput.value.trim();
        if (shiftId) {
            displayFilteredOrdersByShift(shiftId);
        } else {
            alert('يرجى إدخال رقم الوردية للبحث.');
        }
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            displayFilteredOrdersByStatus(button.dataset.status);
        });
    });

    dailySalesBtn.addEventListener('click', () => {
        const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
        const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
        const shiftId = shiftSearchInput.value.trim();

        if ((startDate && endDate) || shiftId) {
            generateSalesReport(startDate, endDate, shiftId);
        } else {
            alert('يرجى اختيار تاريخ بداية ونهاية للتقرير أو إدخال رقم الوردية.');
        }
    });

    dailyInventoryBtn.addEventListener('click', () => {
        const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
        const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
        const shiftId = shiftSearchInput.value.trim();

        if ((startDate && endDate) || shiftId) {
            generateInventoryReport(startDate, endDate, shiftId);
        } else {
            alert('يرجى اختيار تاريخ بداية ونهاية للجرد أو إدخال رقم الوردية.');
        }
    });

    endShiftBtn.addEventListener('click', () => {
        const selectedDate = startDateInput.value;
        if (!selectedDate) {
            alert('يرجى إدخال تاريخ الوردية لإنهاءها.');
            return;
        }
        if (confirm('هل أنت متأكد أنك تريد إنهاء الوردية؟ سيتم أرشفة جميع الطلبات المكتملة للتاريخ المحدد.')) {
            endShift(selectedDate);
        }
    });

    async function fetchAllOrders() {
        try {
            const response = await fetch(SCRIPT_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            allOrders = await response.json();

            // تحديث العدادات
            const newOrdersCount = allOrders.filter(order => order.Status === 'جديد').length;
            if (newOrdersCountElement) newOrdersCountElement.textContent = newOrdersCount;

            const inProgressCount = allOrders.filter(order => order.Status === 'قيد التحضير').length;
            if (inProgressCountElement) inProgressCountElement.textContent = inProgressCount;

            const receivedCount = allOrders.filter(order => order.Status === 'تم الاستلام').length;
            if (receivedCountElement) receivedCountElement.textContent = receivedCount;

            const activeFilter = document.querySelector('.filter-btn.active').dataset.status;
            displayOrders(allOrders, activeFilter);
        } catch (error) {
            console.error('Error fetching orders:', error);
            orderListContainer.innerHTML = '<p>حدث خطأ في جلب الطلبات. يرجى المحاولة مرة أخرى.</p>';
        }
    }

    async function fetchCurrentShiftNumber() {
        try {
            const response = await fetch(SCRIPT_URL + '?action=getShiftNumber');
            const result = await response.json();
            if (result.result === 'success' && result.shiftNumber) {
                currentShiftNumberElement.textContent = `رقم الوردية الحالية: ${result.shiftNumber}`;
            } else {
                currentShiftNumberElement.textContent = `فشل في جلب رقم الوردية.`;
            }
        } catch (error) {
            console.error('Error fetching current shift number:', error);
        }
    }

    function displayFilteredOrdersByDate(startDate, endDate) {
        let filteredOrders = allOrders;
        if (startDate && endDate) {
            filteredOrders = allOrders.filter(order => {
                const orderDate = new Date(order.Date);
                const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
                const start = new Date(startDate);
                const end = new Date(endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return orderDateOnly >= start && orderDateOnly <= end;
            });
        }
        const activeFilter = document.querySelector('.filter-btn.active').dataset.status;
        displayOrders(filteredOrders, activeFilter);
    }

    function displayFilteredOrdersByShift(shiftId) {
        const filteredOrders = allOrders.filter(order => String(order.Shift_Number) === shiftId);
        const activeFilter = document.querySelector('.filter-btn.active').dataset.status;
        displayOrders(filteredOrders, activeFilter);
    }

    function displayFilteredOrdersByStatus(filterStatus) {
        const filteredOrders = allOrders.filter(order => {
            if (filterStatus === 'all') return true;
            return order.Status === filterStatus;
        });
        displayOrders(filteredOrders, 'all');
    }

    function displayOrders(orders, filterStatus) {
        orderListContainer.innerHTML = '';

        const finalOrders = orders.filter(order => {
            if (filterStatus === 'all') return true;
            return order.Status === filterStatus;
        });

        if (finalOrders.length === 0) {
            orderListContainer.innerHTML = '<p>لا توجد طلبات لعرضها في هذه الفئة.</p>';
            return;
        }

        finalOrders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.classList.add('order-card');
            orderCard.dataset.row = order.row;

            let productsHtml = '';
            try {
                const products = JSON.parse(order.Products || '[]');
                products.forEach(product => {
                    productsHtml += `<li>${product.name} (الكمية: ${product.quantity}) - السعر: ${product.price}</li>`;
                });
            } catch (e) {
                productsHtml = '<li>بيانات المنتج غير متوفرة.</li>';
            }

            const shiftNumberHtml = order.Shift_Number ? `<p><strong>رقم الوردية:</strong> ${order.Shift_Number}</p>` : '';

            // عرض المنطقة واسمها (Area) والخدمة (Service) وTotalprice
            const areaHtml = `<p><strong>المنطقة:</strong> ${order.Area || 'غير محدد'}</p>`;
            const serviceValue = parseFloat(order.Service || order.service || 0);
            const totalValue = parseFloat(order.Totalprice || order.totalprice || order.TotalPrice || 0);

            orderCard.innerHTML = `
                <div class="order-header">
                    <h3>الطلب #${order.row - 1}</h3>
                    <span class="order-status ${getStatusClass(order.Status)}">${order.Status}</span>
                </div>
                <div class="order-details">
                    <p><strong>العميل:</strong> ${order.Name || '---'}</p>
                    <p><strong>رقم الهاتف:</strong> ${order.Phone || '---'}</p>
                    <p><strong>العنوان:</strong> ${order.Address || '---'}</p>
                    ${areaHtml}
                    <p><strong>ملاحظات:</strong> ${order.notes || order.Notes || 'لا يوجد'}</p>
                    <p><strong>تاريخ الطلب:</strong> ${order.Date ? new Date(order.Date).toLocaleString() : '---'}</p>
                    <p><strong>رسوم الخدمة:</strong> LE:${serviceValue.toFixed(2)}</p>
                    <p><strong>الإجمالي:</strong> LE:${totalValue.toFixed(2)}</p>
                    ${shiftNumberHtml}
                    <h4>محتويات الطلب:</h4>
                    <ul>${productsHtml}</ul>
                </div>
                <div class="action-btns">
                    <button class="action-btn prepare-btn" data-action="قيد التحضير">قيد التحضير</button>
                    <button class="action-btn received-btn" data-action="تم الاستلام">تم الاستلام</button>
                    <button class="action-btn print-btn" data-action="print">طباعة الفاتورة</button>
                    <button class="action-btn archive-btn" data-action="مؤرشف">أرشفة</button>
                </div>
            `;
            orderListContainer.appendChild(orderCard);
        });

        addEventListenersToButtons();
    }

    function generateSalesReport(startDate, endDate, shiftId) {
        orderListContainer.innerHTML = '';

        let ordersToReport = allOrders.filter(order => 
            order.Status === 'تم الاستلام' || order.Status === 'قيد التحضير'
        );

        if (shiftId) {
            ordersToReport = allOrders.filter(order => String(order.Shift_Number) === shiftId);
        } else if (startDate && endDate) {
            ordersToReport = allOrders.filter(order => {
                const orderDate = new Date(order.Date);
                const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
                const start = new Date(startDate);
                const end = new Date(endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return orderDateOnly >= start && orderDateOnly <= end;
            });
        }

        const totalSales = ordersToReport.reduce((sum, order) => {
            return sum + (parseFloat(order.Totalprice || order.totalprice || 0) || 0);
        }, 0);

        let reportHtml = `
            <div class="report-content">
                <h3>تقرير مبيعات ${startDate ? `من ${startDate.toLocaleDateString()}` : ''} ${endDate ? `إلى ${endDate.toLocaleDateString()}` : ''}</h3>
                ${shiftId ? `<h4>تقرير خاص بالوردية رقم: ${shiftId}</h4>` : ''}
                <p><strong>إجمالي المبيعات:</strong> LE ${totalSales.toFixed(2)}</p>
                <h4>الطلبات المكتملة في هذه الفترة: (${ordersToReport.length})</h4>
                <ul>
        `;

        if (ordersToReport.length > 0) {
            ordersToReport.forEach(order => {
                reportHtml += `<li>الطلب #${order.row - 1} - الحالة: ${order.Status} - السعر الإجمالي: LE ${parseFloat(order.Totalprice || order.totalprice || 0).toFixed(2)}</li>`;
            });
        } else {
            reportHtml += `<li>لا توجد مبيعات مكتملة في هذه الفترة.</li>`;
        }

        reportHtml += '</ul></div>';
        orderListContainer.innerHTML = reportHtml;
    }

    function generateInventoryReport(startDate, endDate, shiftId) {
        orderListContainer.innerHTML = '';

        let ordersToReport = allOrders.filter(order => 
            order.Status === 'تم الاستلام' || order.Status === 'قيد التحضير'
        );

        if (shiftId) {
            ordersToReport = allOrders.filter(order => String(order.Shift_Number) === shiftId);
        } else if (startDate && endDate) {
            ordersToReport = allOrders.filter(order => {
                const orderDate = new Date(order.Date);
                const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
                const start = new Date(startDate);
                const end = new Date(endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return orderDateOnly >= start && orderDateOnly <= end;
            });
        }

        const productInventory = {};

        ordersToReport.forEach(order => {
            try {
                const products = JSON.parse(order.Products || '[]');
                products.forEach(product => {
                    const productName = product.name;
                    const productQuantity = parseInt(product.quantity, 10) || 0;
                    if (productInventory[productName]) {
                        productInventory[productName] += productQuantity;
                    } else {
                        productInventory[productName] = productQuantity;
                    }
                });
            } catch (e) {
                console.error('Error parsing products data:', e);
            }
        });

        let reportHtml = `
            <div class="report-content">
                <h3>جرد المنتجات المباعة ${startDate ? `من ${startDate.toLocaleDateString()}` : ''} ${endDate ? `إلى ${endDate.toLocaleDateString()}` : ''}</h3>
                ${shiftId ? `<h4>جرد خاص بالوردية رقم: ${shiftId}</h4>` : ''}
                <h4>المنتجات المباعة:</h4>
                <ul>
        `;

        const productNames = Object.keys(productInventory);
        if (productNames.length > 0) {
            productNames.forEach(productName => {
                reportHtml += `<li><strong>${productName}:</strong> ${productInventory[productName]} قطعة</li>`;
            });
        } else {
            reportHtml += `<li>لم يتم بيع أي منتجات مكتملة في هذه الفترة.</li>`;
        }

        reportHtml += '</ul></div>';
        orderListContainer.innerHTML = reportHtml;
    }

    async function endShift(selectedDate) {
        const formData = new FormData();
        formData.append('action', 'endShift');
        formData.append('date', selectedDate);

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.result === 'success') {
                alert('تم إنهاء الوردية بنجاح. سيتم تحديث لوحة التحكم.');
                fetchCurrentShiftNumber();
                fetchAllOrders();
            } else {
                alert('فشل في إنهاء الوردية: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ في الاتصال بالخادم.');
        }
    }

    function addEventListenersToButtons() {
        document.querySelectorAll('.action-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const orderCard = event.target.closest('.order-card');
                const row = orderCard.dataset.row;
                const action = event.target.dataset.action;

                if (action === 'print') {
                    printInvoice(orderCard);
                } else {
                    const result = await updateOrderStatus(row, action);
                    if (result.result === 'success') {
                        const orderToUpdate = allOrders.find(order => order.row == row);
                        if(orderToUpdate) {
                            orderToUpdate.Status = action;
                        }

                        // تحديث العدادات
                        if (newOrdersCountElement) newOrdersCountElement.textContent = allOrders.filter(o => o.Status === 'جديد').length;
                        if (inProgressCountElement) inProgressCountElement.textContent = allOrders.filter(o => o.Status === 'قيد التحضير').length;
                        if (receivedCountElement) receivedCountElement.textContent = allOrders.filter(o => o.Status === 'تم الاستلام').length;

                        const activeFilter = document.querySelector('.filter-btn.active').dataset.status;
                        displayOrders(allOrders, activeFilter);
                    } else {
                        alert('فشل تحديث حالة الطلب.');
                    }
                }
            });
        });
    }

    async function updateOrderStatus(row, status) {
        const formData = new FormData();
        formData.append('action', 'updateStatus');
        formData.append('row', row);
        formData.append('status', status);

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ في الاتصال بالخادم.');
            return { result: 'error' };
        }
    }

    function printInvoice(orderCard) {
        const orderDetails = orderCard.querySelector('.order-details').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>فاتورة الطلب</title>
                <style>
                    body { font-family: 'Arial', sans-serif; direction: rtl; padding:20px; }
                    .invoice-container { width: 100%; border: 1px solid #ccc; padding: 20px; border-radius:8px; }
                    .invoice-header { text-align: center; margin-bottom: 10px; }
                    .order-details p { margin:6px 0; }
                </style>
            </head>
            <body>
                <div class="invoice-container">
                    <div class="invoice-header">
                        <h1>فاتورة الطلب</h1>
                    </div>
                    ${orderDetails}
                </div>
                <script>
                    window.onload = () => { window.print(); window.onafterprint = () => window.close(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    function getStatusClass(status) {
        switch (status) {
            case 'جديد': return 'status-new';
            case 'قيد التحضير': return 'status-in-progress';
            case 'تم الاستلام': return 'status-received';
            case 'مؤرشف': return 'status-archived';
            default: return '';
        }
    }
});
const openShiftBtn = document.getElementById("open-shift-btn");
const closeShiftBtn = document.getElementById("close-shift-btn");
const shiftReportBtn = document.getElementById("shift-report-btn");
const shiftStatusBox = document.getElementById("shift-status");

let currentShift = null;

// فتح وردية
openShiftBtn.addEventListener("click", async () => {
  try {
    const formData = new FormData();
    formData.append("action", "openShift");
    const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
    const result = await res.json();
    if (result.result === "success") {
      currentShift = result.shiftNumber;
      shiftStatusBox.textContent = `✅ الوردية الحالية: ${currentShift}`;
    }
  } catch (e) {
    alert("خطأ أثناء فتح الوردية");
  }
});

// قفل وردية
closeShiftBtn.addEventListener("click", async () => {
  if (!currentShift) {
    alert("لا يوجد وردية مفتوحة!");
    return;
  }
  try {
    const formData = new FormData();
    formData.append("action", "closeShift");
    formData.append("shiftNumber", currentShift);
    const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
    const result = await res.json();
    if (result.result === "success") {
      const r = result.report;
      orderListContainer.innerHTML = `
        <div class="report-content">
          <h3>📊 تقرير الوردية ${r.shiftNumber}</h3>
          <p>عدد الطلبات: ${r.totalOrders}</p>
          <p>إجمالي المبيعات: ${r.totalSales} LE</p>
          <p>إجمالي الشحن: ${r.totalService} LE</p>
          <p>صافي المبيعات: ${r.netSales} LE</p>
        </div>
      `;
      shiftStatusBox.textContent = "❌ تم إقفال الوردية";
      currentShift = null;
    }
  } catch (e) {
    alert("خطأ أثناء قفل الوردية");
  }
});

