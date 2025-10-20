fetch('productsالخديوي.json')
  .then(response => response.json())
  .then(data => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    const swiper_items_sale = document.getElementById("swiper_items_sale");
    const swiper_kashri = document.getElementById("swiper_kashri");
    const swiper_tajin = document.getElementById("swiper_tajin");
    const swiper_mix = document.getElementById("swiper_mix");
    const swiper_sweet = document.getElementById("swiper_sweet");
    const swiper_add = document.getElementById("swiper_add");
    const swiper_top = document.getElementById("swiper_top");


     
    



    // Hot Deals
    data.forEach(product => {
      if (product.old_price) {
        const isIncart = cart.some(cartItem => cartItem.id === product.id);
        const percent_disc = Math.floor((product.old_price - product.price) / product.old_price * 100);

        swiper_items_sale.innerHTML += `
          <div class="swiper-slide product" id="product-${product.id}">
            <span class="sale_present">%${percent_disc}</span>
            <div class="img_product">
              <img src="${product.img}" alt="">
            </div>
     
            <p class="name_product">${product.name}</p>
            <div class="price">
               <p><span>EGP ${product.price}</span></p>
              <p class="old_price">LE:${product.old_price}</p>
            </div>
            <div class="icons">
              <span class="btn_add_cart ${isIncart ? 'active' : ''}" data-id="${product.id}">
                <i class="fa-solid fa-cart-shopping"></i>${isIncart ? 'Item in cart' : 'أضف للسلة'}
              </span>
              
            </div>
          </div>
        `;
      }
    });



    // kashri
    data.forEach(product => {
      if (product.catetory == "kashri") {
        const isIncart = cart.some(cartItem => cartItem.id === product.id);
        const old_price_pargrahp = product.old_price ? `<p class="old_price">$${product.old_price}</p>` : "";
        const percent_disc_div = product.old_price ? `<span class="sale_present">%${Math.floor((product.old_price - product.price) / product.old_price * 100)}</span>` : "";

        swiper_kashri.innerHTML += `
          <div class="swiper-slide product" id="product-${product.id}">
            ${percent_disc_div}
            <div class="img_product">
              <img src="${product.img}" alt="">
            </div>
            <p class="name_product">${product.name}</p>
            <div class="price">
              <p><span>EGP ${product.price}</span></p>
              ${old_price_pargrahp}
            </div>
            <div class="icons">
              <span class="btn_add_cart ${isIncart ? 'active' : ''}" data-id="${product.id}">
                <i class="fa-solid fa-cart-shopping"></i>${isIncart ? 'Item in cart' : 'أضف للسلة'}
              </span>
              
            </div>
          </div>
        `;
      }
    });





    // _tajin
    data.forEach(product => {
      if (product.catetory == "tajin") {
        const isIncart = cart.some(cartItem => cartItem.id === product.id);
        const old_price_pargrahp = product.old_price ? `<p class="old_price">$${product.old_price}</p>` : "";
        const percent_disc_div = product.old_price ? `<span class="sale_present">%${Math.floor((product.old_price - product.price) / product.old_price * 100)}</span>` : "";

        swiper_tajin.innerHTML += `
          <div class="swiper-slide product" id="product-${product.id}">
            ${percent_disc_div}
            <div class="img_product">
              <img src="${product.img}" alt="">
            </div>
            <p class="name_product">${product.name}</p>
            <div class="price">
               <p><span>EGP ${product.price}</span></p>
              ${old_price_pargrahp}
            </div>
            <div class="icons">
              <span class="btn_add_cart ${isIncart ? 'active' : ''}" data-id="${product.id}">
                <i class="fa-solid fa-cart-shopping"></i>${isIncart ? 'Item in cart' : 'أضف للسلة'}
              </span>
             
            </div>
          </div>
        `;
      }
    });


    // _mix
    data.forEach(product => {
      if (product.catetory == "mix") {
        const isIncart = cart.some(cartItem => cartItem.id === product.id);
        const old_price_pargrahp = product.old_price ? `<p class="old_price">$${product.old_price}</p>` : "";
        const percent_disc_div = product.old_price ? `<span class="sale_present">%${Math.floor((product.old_price - product.price) / product.old_price * 100)}</span>` : "";

        swiper_mix.innerHTML += `
          <div class="swiper-slide product" id="product-${product.id}">
            ${percent_disc_div}
            <div class="img_product">
              <img src="${product.img}" alt="">
            </div>
            
            <p class="name_product">${product.name}</p>
            <div class="price">
               <p><span>EGP ${product.price}</span></p>
              ${old_price_pargrahp}
            </div>
            <div class="icons">
              <span class="btn_add_cart ${isIncart ? 'active' : ''}" data-id="${product.id}">
                <i class="fa-solid fa-cart-shopping"></i>${isIncart ? 'Item in cart' : 'أضف للسلة'}
              </span>
            
            </div>
          </div>
        `;
      }
    });




    // _sweet
    data.forEach(product => {
      if (product.catetory == "sweet") {
        const isIncart = cart.some(cartItem => cartItem.id === product.id);
        const old_price_pargrahp = product.old_price ? `<p class="old_price">$${product.old_price}</p>` : "";
        const percent_disc_div = product.old_price ? `<span class="sale_present">%${Math.floor((product.old_price - product.price) / product.old_price * 100)}</span>` : "";

        swiper_sweet.innerHTML += `
          <div class="swiper-slide product" id="product-${product.id}">
            ${percent_disc_div}
            <div class="img_product">
             <img src="${product.img}" alt="">
            </div>
           
            <p class="name_product">${product.name}</p>
            <div class="price">
               <p><span>EGP ${product.price}</span></p>
              ${old_price_pargrahp}
            </div>
            <div class="icons">
              <span class="btn_add_cart ${isIncart ? 'active' : ''}" data-id="${product.id}">
                <i class="fa-solid fa-cart-shopping"></i>${isIncart ? 'Item in cart' : 'أضف للسلة'}
              </span>
              
            </div>
          </div>
        `;
      }
    });



    // add
    data.forEach(product => {
      if (product.catetory == "add") {
        const isIncart = cart.some(cartItem => cartItem.id === product.id);
        const old_price_pargrahp = product.old_price ? `<p class="old_price">$${product.old_price}</p>` : "";
        const percent_disc_div = product.old_price ? `<span class="sale_present">%${Math.floor((product.old_price - product.price) / product.old_price * 100)}</span>` : "";

        swiper_add.innerHTML += `
          <div class="swiper-slide product" id="product-${product.id}">
            ${percent_disc_div}
            <div class="img_product">
              <img src="${product.img}" alt="">
            </div>
           
            <p class="name_product">${product.name}</p>
            <div class="price">
              <p><span>EGP ${product.price}</span></p>
              ${old_price_pargrahp}
            </div>
            <div class="icons">
              <span class="btn_add_cart ${isIncart ? 'active' : ''}" data-id="${product.id}">
                <i class="fa-solid fa-cart-shopping"></i>${isIncart ? 'Item in cart' : 'أضف للسلة'}
              </span>
             
            </div>
          </div>
        `;
      }
    });




    
    // top
    data.forEach(product => {
      if (product.catetory == "top") {
        const isIncart = cart.some(cartItem => cartItem.id === product.id);
        const old_price_pargrahp = product.old_price ? `<p class="old_price">$${product.old_price}</p>` : "";
        const percent_disc_div = product.old_price ? `<span class="sale_present">%${Math.floor((product.old_price - product.price) / product.old_price * 100)}</span>` : "";

        swiper_top.innerHTML += `
          <div class="swiper-slide product" id="product-${product.id}">
            ${percent_disc_div}
            <div class="img_product">
              <img src="${product.img}" alt="">
            </div>
           
            <p class="name_product">${product.name}</p>
            <div class="price">
              <p><span>EGP ${product.price}</span></p>
              ${old_price_pargrahp}
            </div>
            <div class="icons">
              <span class="btn_add_cart ${isIncart ? 'active' : ''}" data-id="${product.id}">
                <i class="fa-solid fa-cart-shopping"></i>${isIncart ? 'Item in cart' : 'أضف للسلة'}
              </span>
             
            </div>
          </div>
        `;
      }
    });
  });
  



  