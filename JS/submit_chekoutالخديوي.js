document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form_contact");
    const addressInput = document.getElementById("Address");
    const areaSelect = document.getElementById("Area");
    const subtotalPriceElement = document.querySelector(".subtotal_chekout");
    const servicePriceElement = document.querySelector(".service_price");
    const finalTotalPriceElement = document.querySelector(".total_chekout");

    // الحقول المخفية
    const serviceChargeInput = document.getElementById("service_charge_input");
    const productsInput = document.getElementById("products_input");
    const totalPriceInput = document.getElementById("total_price_input");

    function getDeliveryFee() {
        const selectedOption = areaSelect.options[areaSelect.selectedIndex];
        return selectedOption ? parseFloat(selectedOption.dataset.fee || 0) : 0;
    }

    function updateFinalPrice() {
        const subtotalText = subtotalPriceElement.textContent.replace('LE:', '').replace('$', '').trim();
        const subtotal = parseFloat(subtotalText) || 0;

        const deliveryFee = getDeliveryFee();
        servicePriceElement.textContent = `LE:${deliveryFee.toFixed(2)}`;

        const finalTotal = subtotal + deliveryFee;
        finalTotalPriceElement.textContent = `LE:${finalTotal.toFixed(2)}`;

        if (serviceChargeInput) serviceChargeInput.value = deliveryFee.toFixed(2);
        if (totalPriceInput) totalPriceInput.value = finalTotal.toFixed(2);
    }

    // تحديث عند تغيير المنطقة
    areaSelect.addEventListener('change', updateFinalPrice);
    updateFinalPrice();

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        const productsData = JSON.stringify(cartItems);

        productsInput.value = productsData;
        serviceChargeInput.value = getDeliveryFee();
        totalPriceInput.value = (
            parseFloat(subtotalPriceElement.textContent.replace('LE:', '').replace('$', '')) + getDeliveryFee()
        ).toFixed(2);

        const formData = new FormData(form);
        formData.append('action', 'addOrder');

        const scriptURL = "https://script.google.com/macros/s/AKfycbz-lU5fK8J01r01gk5z7gsas6_oqbgZ4qYAwimgg3Bc2VxKZt-b0KI2vEXsXr9Wxhs/exec";

        fetch(scriptURL, {
            method: "POST",
            body: formData,
        })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.result === 'success') {
                alert("تم إرسال طلبك بنجاح!Toskanini");
                form.reset();
                localStorage.removeItem('cart');
                window.location.href = "الخديوي.html";
            } else {
                alert("حدث خطأ في إرسال طلبك. يرجى المحاولة مرة أخرى. رسالة الخطأ: " + data.error);
                console.error('Error from server:', data.error);
            }
        })
        .catch(error => {
            console.error("Error!", error.message);
            alert("حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.");
        });
    });
});
