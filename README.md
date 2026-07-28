# Choir Invoice Pro

Build a web app called Costridot Invoice Generator for a Nigerian choir robe / gown business. The goal is to generate invoices that look exactly like the attached invoice screenshots and allow the user to download as PDF (A4) and print.




1) Core Requirements




Tech: React / Next.js with Tailwind CSS




Must support:




Invoice Preview (live preview as you type)




PDF Download (A4, high quality, identical layout)




Print button




Save invoice locally (localStorage) and view a list/history




Duplicate invoice (because customers request multiple invoices for the same job)




Currency formatting must be NGN 1,710,000.00 style:




Thousands separators




Always 2 decimals




Prefix currency label “NGN”




Calculations:




Line amount = quantity × rate




Subtotal = sum of line amounts




Tax default = 0% (editable)




Total = subtotal + tax




Optional deposit received (Rental invoice)




Balance Due = Total − Deposit Received (if deposit exists), else Balance Due = Total




2) Two Invoice Types (IMPORTANT)




Create a toggle/select field: Invoice Type




Production




Rental




Each type prints a different bottom text block (like screenshots):




A) Production invoice bottom “Terms” block (exact wording and formatting)




Label: Terms:
Text lines (exact):




“A minimum of 80% upfront payment is required to book production timeline.”




“Balance is to be paid upon notification of completion ( not later than forty eight (48) hours. Pick-up or delivery is to be handled by client.”




“Account details:”




“Olayinka Fagbuaro”




“Stanbic”




“0017208098”




Production invoice header should show:




Payment Terms: Minimum of 80% (editable, but default exactly that)




Deposit received line should NOT appear in totals area.




B) Rental invoice bottom blocks (Notes + Terms) (match screenshot)




Label: Notes:
Default line:




“Pick-up or delivery is to be handled by client”




Label: Terms:
Default lines:




“100% payment into:”




“Oluyemi Olayinka Fagbuaro”




“0017208098”




“Stanbic Ibtc Bank”




Rental invoice header should show:




Payment Terms default = 100% (editable)
Rental invoice totals area should show an extra line:




Deposit received: NGN X,XXX,XXX.XX (editable)
Balance Due must reflect Total − Deposit.




3) Layout Must Match the Screenshot (very important)




Recreate the invoice design precisely:




Page Setup




PDF size: A4 portrait




White invoice on white background




Clean spacing, large top padding




Use a modern sans font (Inter or system)




Colors:




Dark gray header bar: approx #3f3f3f




Light gray highlight box behind Balance Due: approx #eeeeee




Text gray: #666




Title “INVOICE” large, right aligned




Header Layout (Top)




Left side:




A square logo block (same as screenshot) at top left (about 110px–140px wide)




Under the logo, the business/sender name line:




“Olayinka O Fagbuaro” (editable sender name field; default to this)




Then “Bill To:” and the church/customer name below it




Right side:




Large text: INVOICE




Under it: # {invoiceNumber}




Then two lines:




Date: {date}




Payment Terms: {paymentTerms}




Then a wide light-gray rectangle containing:




“Balance Due:” left aligned




Amount right aligned e.g. “NGN 1,710,000.00”




Table Layout




Full width table with a dark-gray header row:




Item | Quantity | Rate | Amount




Rows show item description left, quantity center/right, rate right, amount right




Support multiple line items (add/remove rows)




Totals Area (Right aligned, below table)




On the right side:




Subtotal: NGN ...




Tax (X%): NGN ...




Total: NGN ...




If Rental type: show “Deposit received:” NGN ...
(keep these aligned like screenshot, with labels left and values right)




Bottom Left Text Blocks




Production: a single “Terms:” section as provided above




Rental: “Notes:” section + “Terms:” section as provided above
Keep it light gray text and left aligned near bottom.




4) Form UI (Left) + Preview (Right)




Create a clean two-column layout desktop:




Left: form fields




Right: live invoice preview (exact design)




Form fields:
Invoice Meta




Invoice Type (Production / Rental)




Invoice Number (auto-generate but editable)




Date (date picker)




Payment Terms (text input; defaults depend on type)




Sender




Sender Name (default “Olayinka O Fagbuaro”)




Account Name (default depends on type)




Bank Name (default depends on type)




Account Number (default “0017208098”)




Customer




Bill To / Church Name (required)




Line Items




Repeating rows with:




Item description (text)




Quantity (number)




Rate (number)




Amount (auto-calculated, read-only)




Buttons: Add Row / Remove Row




Totals




Tax % (default 0)




Deposit Received (ONLY show if Rental type)




Everything else computed




Actions




Save Invoice




Duplicate Invoice




Download PDF




Print




5) PDF Export Implementation (must be reliable)




Must export the exact preview layout as a PDF:




Use a robust solution (preferred):




Render the invoice preview as a single DOM container




Convert to PDF using html2canvas + jsPDF (A4 scaling, high DPI)




Ensure margins and scaling preserve layout




The PDF should have crisp text and correct spacing.




The exported PDF filename format:




Costridot_Invoice_{invoiceNumber}.pdf




6) Logo Handling (must include logo)




The invoice must include the Costridot logo (gold “CD” on black).




Add a default embedded logo image in the project (use the provided logo image)




Also allow optional “Upload Logo” that replaces it




Keep it in a square frame like the screenshot




7) Data Persistence + History




Save invoices into localStorage as objects




Create a simple “Invoices” list page/section showing:




Invoice #, date, bill-to name, total, balance due, type




Click an invoice to load it back into the editor




Add Duplicate button to clone an invoice quickly (common Nigerian behavior)




8) Validation + UX details




Require Bill To and at least 1 line item




Quantity and Rate must be >= 0




Show NGN formatting everywhere in preview and PDF




Keep the UI fast and minimal, no clutter




Deliver the full working app with clean components and the invoice preview matching the screenshots as closely as possible.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://costridotinvoicegenerator.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/14220859-53bf-40f3-a045-7811662c2e2c).

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
