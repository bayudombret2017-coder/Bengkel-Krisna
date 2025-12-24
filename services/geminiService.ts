
import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

export const getGeminiResponse = async (userPrompt: string, products: Product[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const productContext = products.map(p => 
    `- Merk: ${p.brand}, Kode/Model: ${p.code}, Ukuran: ${p.size}, Ring: R${p.ring}, Stok: ${p.stock > 0 ? p.stock + ' Unit' : 'KOSONG'}`
  ).join('\n');

  const systemPrompt = `
    Anda adalah "Asisten Ahli Ban Karya Makmur". 
    Anda bertugas membantu pelanggan menemukan ban yang tepat di gudang Karya Makmur.
    
    ATURAN:
    1. Selalu ramah, profesional, dan gunakan Bahasa Indonesia.
    2. Jika stok ADA, sebutkan detailnya dan tambahkan format [[SEARCH:KataKunci]] untuk memicu pencarian di UI.
    3. Jika pelanggan menanyakan lokasi, gunakan alat Maps untuk membantu.
    4. Jika stok KOSONG, tawarkan alternatif merk atau ukuran terdekat yang ada.
    5. Fokus hanya pada Ban dan Velg.

    DATA GUDANG SAAT INI:
    ${productContext}

    Lokasi Bengkel: Karya Makmur Ban, Area Semarang & Sekitarnya. Melayani ganti ban dan tambal ban darurat.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
      },
    });

    return response.text || "Maaf, database sedang sibuk. Silakan coba lagi.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Maaf, asisten AI sedang maintenance untuk sinkronisasi cloud.";
  }
};
