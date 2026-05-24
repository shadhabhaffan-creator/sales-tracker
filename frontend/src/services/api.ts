import { fakeDB } from '@/lib/fakeDB';

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
) {
  const body = options.body
    ? JSON.parse(options.body as string)
    : null;

  const routes = [
    'sale',
    'sales',

    'customer',
    'customers',

    'settlement',
    'settlements',

    'product',
    'products',

    'purchase',
    'purchases',

    'supplier',
    'suppliers',

    'outstanding-payment',
    'outstandingpayments',
    'outstanding-payments',

    'warehouse',
    'warehouses',

    'expense',
    'expenses',

    'report',
    'reports',

    'employee',
    'employees'
  ];

  for (const route of routes) {
    if (endpoint.toLowerCase().includes(route)) {

      let key = route;

      if (
        route === 'customer'
      ) key = 'customers';

      if (
        route === 'product'
      ) key = 'products';

      if (
        route === 'sale'
      ) key = 'sales';

      if (
        route === 'purchase'
      ) key = 'purchases';

      if (
        route === 'supplier'
      ) key = 'suppliers';

      if (
        route === 'warehouse'
      ) key = 'warehouses';

      if (
        route === 'employee'
      ) key = 'employees';

      if (
        route === 'expense'
      ) key = 'expenses';

      if (
        route === 'report'
      ) key = 'reports';

      if (
        route === 'settlement'
      ) key = 'settlements';

      if (
        route.includes('outstanding')
      ) key = 'outstanding-payments';


      if (
        options.method === 'POST'
      ) {
        return fakeDB.add(
          key,
          body
        );
      }

      if (
        options.method === 'DELETE'
      ) {
        return fakeDB.remove(
          key,
          body?.id
        );
      }

      return fakeDB.get(key);
    }
  }

  return [];
}