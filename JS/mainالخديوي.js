let category_nav_list = document.querySelector(".category_nav_list");

function open_categ_list() {
    category_nav_list.classList.toggle("active")
}
let nav_linkc = document.querySelector(".nav_linkc")
function open_Menu() {
    nav_linkc.classList.toggle("active")
}


var cart = document.querySelector('.cart');

function open_close_cart() {
    cart.classList.toggle("active")
}

fetch('productsالخديوي.json')
    .then(response => response.json())
    .then(data => {

        const addTocartButtons = document.querySelectorAll(".btn_add_cart")

        addTocartButtons.forEach(button => {
            button.addEventListener("click", (event) => {
                const productId = event.target.getAttribute('data-id')
                const selcetedproduct = data.find(product => product.id == productId)


                addTocart(selcetedproduct)
                const allMatchingButtons = document.querySelectorAll(`.btn_add_cart[data-id="${productId}"]`)

                allMatchingButtons.forEach(btn => {
                    btn.classList.add("active")
                    btn.innerHTML = `   <i class="fa-solid fa-cart-shopping"></i> item in cart`
                })

            })
        })

    })



function addTocart(product) {

    let cart = JSON.parse(localStorage.getItem('cart')) || []

    cart.push({ ...product, quantity: 1 })
    localStorage.setItem('cart', JSON.stringify(cart))

    updateCart()

}


function updateCart() {
    const cartItemsContainer = document.getElementById("cart_items")

    const cart = JSON.parse(localStorage.getItem('cart')) || []


    const checkout_items =document.getElementById("checkout_items")

        let itmes_input = document.getElementById("items")
        let total_price_input = document.getElementById("total_price")
        let count_items_input = document.getElementById("count_items")

    if (checkout_items){
        checkout_items.innerHTML=""

        
       


        itmes_input.value = "";
        total_price_input.value = "";
        count_items_input.value = "";


    }

    var total_price = 0
    var total_count = 0

    cartItemsContainer.innerHTML = "" ;
        cart.forEach((item, index) => {

            let total_price_item = item.price * item.quantity;

            total_price += total_price_item
            total_count += item.quantity

            // check out inputs
if (checkout_items){
            itmes_input.value += item.name + "  ---   " + "price : " + total_price_item + "  ---   " + "count : " + item.quantity + "\n";

            total_price_input.value = total_price + 20
            count_items_input.value = total_count

}
            
            



            


            cartItemsContainer.innerHTML += `

             <div class="item_cart">
                <img src="${item.img}" alt="">
                <div class="content">
                    <h4>${item.name}</h4>
                    <p class="price_cart">LE:${total_price_item}</p>
                    <div class="quantity_control">
                        <button class="decrease_quantity" data-index=${index}>-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="Increase_quantity" data-index=${index}>+</button>

                    </div>
                </div>

                <button class="delete_item" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button>
            </div>



            `


if(checkout_items){
    checkout_items.innerHTML += `
    
                        <div class="item_cart">

                            <div class="image_name">
                                <img src="${item.img}" alt="">
                                <div class="content">
                                    <h4>${item.name}</h4>
                                    <p class="price_cart">LE:${total_price_item}</p>
                                    <div class="quantity_control">
                                        <button class="decrease_quantity" data-index=${index}>-</button>
                                        <span class="quantity">${item.quantity}</span>
                                        <button class="Increase_quantity" data-index=${index}>+</button>

                                    </div>
                                </div>
                            </div>

                            <button class="delete_item" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button>




                        </div>


    `
}



        })


    const price_cart_total_elements = document.querySelectorAll('.price_cart_total'); // اسم أفضل للفئة التي تعرض الإجمالي
    price_cart_total_elements.forEach(element => {
        element.innerHTML = `LE:${total_price.toFixed(2)}`;
    });

    // تحديث عدد العناصر في سلة التسوق (في أي مكان يظهر فيه هذا العدد)
    const count_item_cart_elements = document.querySelectorAll('.count_item_cart');
    count_item_cart_elements.forEach(element => {
        element.innerHTML = total_count;
    });

    const count_item_header_elements = document.querySelectorAll('.count_item_heater, .count_item_header'); // تضمين كلا الاسمين تحسباً لوجود خطأ مطبعي
    count_item_header_elements.forEach(element => {
        element.innerHTML = total_count;
    });

if (checkout_items) {
    const subtotal_chekout = document.querySelector(".subtotal_chekout")
    const total_chekout = document.querySelector(".total_chekout")



    subtotal_chekout.innerHTML= ` ${total_price.toFixed(2)}`
    total_chekout.innerHTML= `$ ${total_price + 0}`

}



    const increaseButtons = document.querySelectorAll('.Increase_quantity')
    const decreaseButtons = document.querySelectorAll('.decrease_quantity')

    increaseButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            const itemIndex = event.target.getAttribute("data-index")
            increaseQuantity(itemIndex)
        })
    })


    decreaseButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            const itemIndex = event.target.getAttribute("data-index")
            decreaseQuantity(itemIndex)
        })
    })




    const deleteButtons = document.querySelectorAll('.delete_item')

    deleteButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const itemIndex = event.target.closest('button').getAttribute('data-index')
            removeFormCart(itemIndex)
        })
    })
}


function increaseQuantity(index) {
    let cart = JSON.parse(localStorage.getItem('cart')) || []
    cart[index].quantity += 1
    localStorage.setItem('cart', JSON.stringify(cart))
    updateCart()
}

function decreaseQuantity(index) {
    let cart = JSON.parse(localStorage.getItem('cart')) || []

    if (cart[index].quantity > 1) {
        cart[index].quantity -= 1
    }

    localStorage.setItem('cart', JSON.stringify(cart))
    updateCart()
}



function removeFormCart(index) {
    const cart = JSON.parse(localStorage.getItem('cart')) || []

    const removeProduct = cart.splice(index, 1)[0]
    localStorage.setItem('cart', JSON.stringify(cart))
    updateCart()
    updateButoonsState(removeProduct.id)
}


function updateButoonsState(productId) {
    const allMatchingButtons = document.querySelectorAll(`.btn_add_cart[data-id="${productId}"]`)
    allMatchingButtons.forEach(button => {
        button.classList.remove('active');
        buttonf.innerHTML = `<i class="fa-solid fa-cart-shopping"></i> add to cart`
    })

}


updateCart()











