
import { Product } from '../types';

export async function fetchProductsFromScript(scriptUrl: string): Promise<Product[]> {
  try {
    const cleanUrl = scriptUrl.trim();
    const response = await fetch(cleanUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Gagal menghubungi Google Sheet: ${response.status}`);
    }

    const rawData = await response.json();
    let rows: any[] = [];

    // Deteksi format array (biasanya dikirim oleh Apps Script sebagai array baris)
    if (Array.isArray(rawData)) {
      rows = rawData;
    } else if (typeof rawData === 'object') {
      // Jika dikirim dalam bentuk objek, ambil array pertama yang ditemukan
      const firstKey = Object.keys(rawData)[0];
      if (Array.isArray(rawData[firstKey])) {
        rows = rawData[firstKey];
      }
    }

    if (rows.length === 0) return [];

    // Buang header jika baris pertama berisi teks "Nomor" atau "Jenis"
    const hasHeader = rows[0] && isNaN(Number(rows[0][0]));
    const dataRows = hasHeader ? rows.slice(1) : rows;

    return dataRows.map((row: any, index: number) => {
      const getVal = (idx: number) => {
        if (Array.isArray(row)) return row[idx] ?? '';
        const keys = Object.keys(row);
        return row[keys[idx]] ?? '';
      };

      const brand = String(getVal(2)).trim();
      const code = String(getVal(3)).trim();

      // Lewati baris kosong
      if (!brand && !code) return null;

      const nomor = parseInt(String(getVal(0))) || (index + 1);
      const category = String(getVal(1)).trim() || 'Ban';

      return {
        id: `prod-${nomor}-${index}`,
        nomor: nomor,
        category: category,
        brand: brand,
        code: code,
        size: String(getVal(4)) || '-',
        ring: String(getVal(5)) || '-',
        stock: Number(getVal(6)) || 0,
        description: String(getVal(7)) || '',
        expiryCode: String(getVal(8)) || '',
        image: `https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=400&h=300&sig=${nomor}`,
        soldCount: 0,
        price: 0,
      };
    }).filter(p => p !== null) as Product[];

  } catch (error: any) {
    console.error("Fetch Data Error:", error);
    throw new Error(error.message || "Gagal sinkronisasi data Ban.");
  }
}

async function postToSheet(scriptUrl: string, payload: any) {
  try {
    await fetch(scriptUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    return true; 
  } catch (err) {
    return false;
  }
}

export const addProductToSheet = (url: string, data: any) => postToSheet(url, { action: 'add_product', ...data });
export const editProductInSheet = (url: string, data: any) => postToSheet(url, { action: 'edit_product', ...data });
export const deleteProductFromSheet = (url: string, nomor: number) => postToSheet(url, { action: 'delete_product', nomor });

export const recordSaleToSheet = (url: string, product: Product, qty: number) => 
  postToSheet(url, { 
    action: 'record_sale', 
    nomor: product.nomor, 
    brand: product.brand,
    code: product.code,
    category: product.category,
    qty: qty,
    timestamp: new Date().toLocaleString('id-ID')
  });

export const logRequestToSheet = (url: string, itemName: string, note: string) => 
  postToSheet(url, { 
    action: 'log_request', 
    itemName, 
    note,
    timestamp: new Date().toLocaleString('id-ID')
  });
