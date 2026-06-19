'use client';

import { motion } from 'framer-motion';
import { X, Printer, Download, ShieldCheck, Package, User, Calendar } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyContext';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InvoiceModal({
 sale,
 onClose
}:{
 sale:any,
 onClose:()=>void
}) {

 const { formatPrice } = useCurrency();

 if (!sale) return null;

 const subtotal = sale.items?.reduce((acc: number, item: any) => {
  return acc + (item.totalPrice || ((item.unitPrice || item.sellingPrice || 0) * item.quantity));
 }, 0) || 0;

 const discount = sale.discount || 0;

 // FIX
 const saleId =
  String(
   sale?._id ||
   sale?.id ||
   ''
  );

 const invoiceCode =
  sale.invoiceId ||
  `#${saleId.slice(-8).toUpperCase()}`;


 const downloadPDF = () => {

  const doc = new jsPDF();

  const primaryColor:[number,number,number]=[
   6,
   182,
   212
  ];

  doc.setFillColor(
   15,
   23,
   42
  );

  doc.rect(
   0,
   0,
   210,
   40,
   'F'
  );

  doc.setTextColor(
   255,
   255,
   255
  );

  doc.setFontSize(24);

  doc.text(
   'AURASALES',
   14,
   25
  );

  doc.setFontSize(18);

  doc.text(
   'INVOICE',
   160,
   25
  );

  // FIX
  doc.text(
   invoiceCode,
   160,
   32
  );

  // Render metadata details (billed to, date, payment method)
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text('Billed To:', 14, 52);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.customerId?.name || 'Guest Customer', 14, 59);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(sale.customerId?.phone || 'No Phone', 14, 65);

  doc.text('Invoice Date:', 120, 52);
  doc.setTextColor(15, 23, 42);
  const dateStr = sale.date 
    ? format(new Date(sale.date), 'MMM dd, yyyy') 
    : format(new Date(), 'MMM dd, yyyy');
  doc.text(dateStr, 120, 59);

  doc.setTextColor(100, 116, 139);
  doc.text('Payment Method:', 160, 52);
  doc.setTextColor(15, 23, 42);
  doc.text(sale.paymentType || 'CASH', 160, 59);

  const tableData=
  sale.items?.map(
   (item:any)=>[
    item.name,
    item.quantity,

    formatPrice(
     item.unitPrice ||
     (
      item.totalPrice /
      item.quantity
     )
    ),

    formatPrice(
     item.totalPrice ||
     (
      item.sellingPrice*
      item.quantity
     )
    )
   ]
  ) || [];



  autoTable(
   doc,
   {
    startY:75,

    head:[
      [
       'Product',
       'Qty',
       'Price',
       'Total'
      ]
    ],

    body:tableData,

    headStyles:{
     fillColor:
      primaryColor
    }
   }
  );

  const finalY = (doc as any).lastAutoTable?.finalY || 110;

  let currentY = finalY + 15;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);

  if (discount > 0) {
   doc.setFont('helvetica', 'normal');
   doc.text('Subtotal:', 130, currentY);
   doc.text(formatPrice(subtotal), 196, currentY, { align: 'right' });
   currentY += 8;

   doc.text(`Discount (${sale.discountType === 'PERCENT' ? `${sale.discountValue}%` : 'Flat'}):`, 130, currentY);
   doc.text(`-${formatPrice(discount)}`, 196, currentY, { align: 'right' });
   currentY += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(6, 182, 212); // Cyan theme accent
  doc.text('Total Amount:', 130, currentY);
  doc.text(formatPrice(sale.totalAmount), 196, currentY, { align: 'right' });

  doc.save(
   `Invoice_${saleId}.pdf`
  );
 };


 return (

<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

<motion.div
onClick={onClose}
className="absolute inset-0 bg-black/80"
/>

<motion.div
className="glass-panel w-full max-w-4xl rounded-[2rem] relative z-10 overflow-hidden"
>

<div className="p-8 flex justify-between border-b border-white/5">

<div>

<h2 className="text-2xl font-black">
Invoice Details
</h2>

<p className="text-gray-400 text-xs">
{invoiceCode}
</p>

</div>

<button onClick={onClose}>
<X/>
</button>

</div>


<div className="p-8">

<div className="grid md:grid-cols-2 gap-6">

<div>

<div className="flex gap-2 text-cyan-400">
<User size={16}/>
Customer
</div>

<div className="mt-4">

<h3 className="font-bold">

{
sale.customerId?.name
||
'Guest Customer'
}

</h3>

<p>

{
sale.customerId?.phone
||
'No Phone'
}

</p>

</div>

</div>



<div>

<div className="flex gap-2 text-indigo-400">

<Calendar size={16}/>
Payment

</div>

<div className="mt-4">

<p>

{sale.paymentType}

</p>

<p>

{
sale.status
||
'PAID'
}

</p>

</div>

</div>

</div>



<div className="mt-8">

{sale.items?.map(
(item:any,index:number)=>(

<div
key={index}
className="flex justify-between py-3 border-b border-white/5"
>

<div>

<p>

{item.name}

</p>

<p className="text-xs text-gray-500">

ID:

{
item.productId?._id
||
item.productId?.id
||
item.productId
||
'-'
}

</p>

</div>

<div>

{
formatPrice(
item.totalPrice
)
}

</div>

</div>

))
}

</div>



      {/* Price Summary */}
      <div className="mt-8 border-t border-white/5 pt-6 space-y-3">
        {discount > 0 && (
          <>
            <div className="flex justify-between text-sm text-gray-400 font-medium">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-400 font-medium">
              <span>Discount ({sale.discountType === 'PERCENT' ? `${sale.discountValue}%` : 'Flat'})</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center pt-2">
          <span className="font-bold text-white">Total Amount</span>
          <span className="text-xl font-black text-cyan-400 font-mono">
            {formatPrice(sale.totalAmount)}
          </span>
        </div>
      </div>


<button
onClick={downloadPDF}
className="mt-8 glass-button"
>

<Download/>

Download PDF

</button>


</div>

</motion.div>

</div>

)

}