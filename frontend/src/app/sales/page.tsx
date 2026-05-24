'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';

import InvoiceModal from '@/components/InvoiceModal';
import {
  Search,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';

import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SalesPage() {
  const { formatPrice } = useCurrency();
  const { isAdmin } = useUser();

  const [sales, setSales] = useState<any[]>([]);
  const [filteredSales, setFilteredSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const data = await fetchWithAuth('/sales');

        setSales(data || []);
        setFilteredSales(data || []);

      } catch {
        toast.error('Failed to fetch sales');
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  useEffect(() => {
    let result = [...sales];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      result = result.filter((s) =>
        s.invoiceId?.toLowerCase()?.includes(term) ||

        s.customerId?.name
          ?.toLowerCase()
          ?.includes(term) ||

        String(
          s._id || s.id || ''
        )
          .slice(-6)
          .toLowerCase()
          .includes(term)
      );
    }

    if (paymentFilter !== 'ALL') {
      result = result.filter(
        s => s.paymentType === paymentFilter
      );
    }

    setFilteredSales(result);

  }, [searchTerm, paymentFilter, sales]);



  const exportToPDF = () => {
    const doc = new jsPDF();

    const tableData =
      filteredSales.map(sale => [

        sale.invoiceId ||

        String(
          sale._id || sale.id || ''
        )
          .slice(-6)
          .toUpperCase(),

        sale.customerId?.name || 'Guest',

        formatPrice(
          sale.totalAmount || 0
        ),

        sale.paymentType,

        sale.status || 'PAID',

        sale.date
          ? format(
              new Date(sale.date),
              'MMM dd, yyyy'
            )
          : '-'
      ]);

    autoTable(doc,{
      head:[[
        'Invoice',
        'Customer',
        'Amount',
        'Payment',
        'Status',
        'Date'
      ]],
      body:tableData
    });

    doc.save('sales-report.pdf');
  };


  const handleDelete = async (
    id:string
  ) => {

    try{

      await fetchWithAuth(
        `/sales/${id}`,
        {
          method:'DELETE'
        }
      );

      setSales(prev =>
        prev.filter(
          s =>
            (s._id || s.id)
            !== id
        )
      );

      toast.success(
        'Deleted'
      );

      setDeleteId(null);

    }catch{

      toast.error(
        'Delete failed'
      );

    }
  };


  return (

<DashboardLayout>

<div className="space-y-8">

<div className="flex justify-between">

<h1 className="text-4xl font-black">
Sales Management
</h1>

<div className="flex gap-3">

<button
onClick={exportToPDF}
className="px-5 py-3"
>
<Download size={18}/>
Export
</button>

{isAdmin && (

<Link href="/sales/new">

<button>

<Plus size={18}/>

NEW SALE

</button>

</Link>

)}

</div>

</div>


<div className="flex gap-4">

<input
placeholder="Search..."
value={searchTerm}
onChange={(e)=>
setSearchTerm(
e.target.value
)}
/>

<select
value={paymentFilter}
onChange={(e)=>
setPaymentFilter(
e.target.value
)}
>
<option value="ALL">
All
</option>

<option value="CASH">
Cash
</option>

<option value="UPI">
UPI
</option>

<option value="CREDIT">
Credit
</option>

</select>

</div>


<table className="w-full">

<tbody>

{loading ? (

<tr>

<td>

<Loader2 className="animate-spin"/>

</td>

</tr>

)

:

filteredSales.length ?

filteredSales.map(
sale => (

<tr
key={
sale._id ||
sale.id
}
>

<td>

{

sale.invoiceId ||

`#${
String(
sale._id ||
sale.id ||
''
)
.slice(-6)
.toUpperCase()
}`

}

</td>

<td>

{
sale.customerId
?.name ||
'Guest'
}

</td>

<td>

{
formatPrice(
sale.totalAmount
||0
)
}

</td>

<td>

<button
onClick={()=>
setSelectedSale(
sale
)
}
>

<Eye/>

</button>

{isAdmin && (

<button

onClick={()=>
setDeleteId(
sale._id ||
sale.id
)
}

>

<Trash2/>

</button>

)}

</td>

</tr>

))

:

<tr>

<td>

No sales found

</td>

</tr>

}

</tbody>

</table>


<AnimatePresence>

{selectedSale && (

<InvoiceModal

sale={selectedSale}

onClose={()=>
setSelectedSale(
null
)
}

/>

)}

</AnimatePresence>

</div>

</DashboardLayout>

)

}