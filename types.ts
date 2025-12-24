
export interface Product {
  id: string; 
  nomor: number;       // Kolom 1: Nomor Barang
  category: string;    // Kolom 2: Jenis Barang
  brand: string;       // Kolom 3: Merk Barang
  code: string;        // Kolom 4: Kode
  size: string;        // Kolom 5: Ukuran barang
  ring: string;        // Kolom 6: Ukuran Ring
  stock: number;       // Kolom 7: Jumlah barang
  description: string; // Kolom 8: Keterangan
  expiryCode: string;  // Kolom 9: Kode kadaluarsa
  image: string;       // Kolom 10: URL Gambar
  soldCount: number;   // Kolom 11: Total Terjual
  price: number; 
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
