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
    startY:85,

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



<div className="mt-8 flex justify-between">

<span>
Total
</span>

<span className="font-black text-cyan-400">

{
formatPrice(
sale.totalAmount
)
}

</span>

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