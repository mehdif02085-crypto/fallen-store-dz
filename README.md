# Fallen Store Builder

Build a complete modern e-commerce website called Fallen Store, a clothing brand based in Algeria.



Brand



- Name: Fallen Store

- Market: Algeria

- Currency: Algerian Dinar (DZD / DA)

- Language: Arabic and French, with an easy language switcher

- Responsive design optimized for mobile first, then desktop

- Premium streetwear/fashion aesthetic

- Dark, modern, clean visual identity

- Fast-loading product pages and smooth animations



Customer storefront



Create these pages:



1. Home

2. Shop / All Products

3. Product details

4. Categories

5. Custom Shirt

6. Cart

7. Checkout

8. Order confirmation

9. Contact / FAQ



Products should support:



- Product name

- Product photos

- Description

- Price in DZD

- Available sizes

- Available colors

- Stock quantity

- Category

- Multiple product images

- Sale/discount price when applicable



Categories can include:



- T-shirts

- Oversized T-shirts

- Hoodies

- Pants

- Sweatshirts

- Accessories

- New arrivals

- Sale



Product customization



Create a Custom Shirt feature where customers can:



- Choose a shirt model

- Choose shirt color

- Choose size

- Upload their own image/design

- Add custom text

- Choose text color

- Position the design on the shirt

- Preview the customization before ordering

- Add the customized product to the cart



Clearly show that customized products may have a different price if configured by the admin.



Checkout



Customers must provide:



- Full name

- Algerian phone number

- Wilaya

- City/commune

- Full delivery address

- Clothing size

- Optional delivery notes



Validate the Algerian phone number format.



The checkout must clearly display:



- Products

- Sizes

- Quantities

- Product/customization details

- Subtotal

- Delivery fee

- Total in DZD



Do not allow checkout without the required customer information.



Algerian payment and delivery



Build the payment system so it is designed to support legitimate payment providers available in Algeria.



Create a payment-method architecture that can support:



- Online card payment

- CIB

- Edahabia

- Other locally available payment providers

- Cash on delivery



Do not hard-code fake payment integrations. Use environment variables/API credentials and clearly separated payment-provider modules so real providers can be connected later.



If a payment provider is not configured yet, show it as unavailable rather than pretending the payment succeeded.



For Cash on Delivery, allow the customer to place the order directly.



Admin dashboard



Create a secure "/admin" dashboard.



Only authenticated administrators can access it.



Admin features:



- Add products

- Edit products

- Delete products

- Upload product photos

- Change product name

- Change description

- Change price

- Set sale price

- Manage sizes

- Manage colors

- Manage stock

- Manage categories

- View orders

- Change order status

- View customer information needed to fulfill orders

- View customized-shirt orders and uploaded designs

- Manage delivery fees

- Enable/disable payment methods



IMPORTANT:

Customers must NEVER be able to modify product prices.



Only authorized admins can create or modify prices.



Use proper authentication, authorization, database security rules, and server-side validation. Never rely only on hiding admin controls in the frontend.



Orders



Each order should have:



- Unique order number

- Customer name

- Phone number

- Wilaya

- City

- Delivery address

- Products

- Sizes

- Quantities

- Customization information

- Payment method

- Payment status

- Order status

- Total

- Creation date



Order statuses:



- Pending

- Confirmed

- Preparing

- Shipped

- Delivered

- Cancelled



Create an admin order-management interface with filtering and search.



Database



Use a proper relational database structure.



Suggested tables:



- users

- admins

- products

- product_images

- categories

- product_variants

- orders

- order_items

- customers

- custom_designs

- payments

- delivery_settings



Use secure row-level authorization so customers can only access their own permitted data and only administrators can manage products and prices.



Product photography workflow



Add an admin-friendly product image upload workflow.



When an admin uploads a clothing photo, provide an option to prepare it for the storefront:



- Clean studio background

- Professional lighting

- Accurate clothing colors

- Preserve the exact design, logo, print, stitching and proportions

- Center the product

- Remove distracting background elements

- Generate consistent product-photo presentation

- Create a square version suitable for the product grid

- Create a larger version suitable for the product page



Do NOT alter the clothing design or invent details.



Product cards should display:

PRODUCT NAME

PRICE in DA

Available sizes

Add to cart button



Homepage



Create a strong fashion homepage with:



- Fallen Store logo/name

- Hero section

- New arrivals

- Best sellers

- Categories

- Custom Shirt CTA

- Featured products

- Instagram/social section

- Footer



Use realistic placeholder products initially, but make it extremely easy for the admin to replace them with real products.



UX



Make the shopping experience extremely simple:

Home → Product → Size → Add to Cart → Checkout → Order Confirmation.



Use clear buttons, excellent mobile navigation, product filters, search, cart quantity controls, and helpful validation messages.



Make the website feel like a real professional Algerian streetwear brand, not a generic template.



Before finishing, test:



- Customer checkout

- Required checkout fields

- Cart calculations

- Product sizes

- Product stock

- Admin authentication

- Admin price editing

- Customer inability to edit prices

- Custom shirt upload

- Order creation

- Payment states

- Mobile responsiveness

- Error handling

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fallen-store-dz.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/088b8fd2-791c-441b-a20f-1b75daecce24).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
