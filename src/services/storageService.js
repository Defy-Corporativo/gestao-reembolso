import { supabase } from './supabaseClient';

const BUCKET_NAME = 'rebl_receipts';

// Verifica se um caminho/nome de arquivo é PDF
export const isPdfFile = (path) => {
    if (!path) return false;
    return path.toLowerCase().endsWith('.pdf');
};

export const storageService = {
    // Upload de comprovante seguindo o padrão: reembolso-NOMEUSUARIOAZURE-AAAAMMDDHHMMSS-SEQ
    // sequentialIndex: número sequencial do anexo dentro da solicitação (1, 2, 3...)
    async uploadReceipt(file, userName, sequentialIndex = 1) {
        const now = new Date();
        const timestamp = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0'),
        ].join('');

        // Normalizar nome: "daniel.ribeiro" -> "danielribeiro"
        const normalizedName = userName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');

        // Extrair extensão do arquivo
        const ext = file.name.split('.').pop() || 'jpg';

        const fileName = `reembolso-${normalizedName}-${timestamp}-${sequentialIndex}.${ext}`;

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) throw error;
        return fileName;
    },

    // Retorna URL assinada para visualizar o comprovante (válida por 1h)
    async getReceiptUrl(path) {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(path, 3600); // 1 hora de validade

        if (error) throw error;
        return data?.signedUrl;
    },

    // Dispara o download do comprovante no navegador
    async downloadReceipt(path) {
        const url = await this.getReceiptUrl(path);
        const response = await fetch(url);
        const blob = await response.blob();

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = path; // mantém o nome original do arquivo
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    },

    // Remove um comprovante do storage
    async deleteReceipt(path) {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path]);

        if (error) throw error;
    },
};
