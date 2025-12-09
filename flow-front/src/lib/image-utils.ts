/**
 * Utilitários para manipulação de imagens
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 a 1
  maxSizeKB?: number; // Tamanho máximo em KB
}

const defaultOptions: CompressOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  maxSizeKB: 500, // 500KB máximo
};

/**
 * Comprime uma imagem reduzindo suas dimensões e qualidade
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  // Se não for imagem, retorna o arquivo original
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Não comprimir GIFs (perderia animação)
  if (file.type === 'image/gif') {
    return file;
  }

  const opts = { ...defaultOptions, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calcular novas dimensões mantendo proporção
      let { width, height } = img;
      const maxW = opts.maxWidth!;
      const maxH = opts.maxHeight!;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Função para converter canvas para blob com qualidade ajustável
      const tryCompress = (quality: number): Promise<Blob> => {
        return new Promise((res) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                res(blob);
              } else {
                // Fallback para PNG se JPEG falhar
                canvas.toBlob((pngBlob) => res(pngBlob!), 'image/png');
              }
            },
            'image/jpeg',
            quality
          );
        });
      };

      // Tentar comprimir até atingir o tamanho desejado
      const compress = async () => {
        let quality = opts.quality!;
        let blob = await tryCompress(quality);
        const maxSizeBytes = (opts.maxSizeKB || 500) * 1024;

        // Se ainda estiver muito grande, reduzir qualidade progressivamente
        while (blob.size > maxSizeBytes && quality > 0.1) {
          quality -= 0.1;
          blob = await tryCompress(quality);
        }

        // Se ainda estiver grande, reduzir dimensões
        if (blob.size > maxSizeBytes && width > 800) {
          const reductionRatio = 0.7;
          canvas.width = Math.round(width * reductionRatio);
          canvas.height = Math.round(height * reductionRatio);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          blob = await tryCompress(0.7);
        }

        // Criar novo arquivo com o blob comprimido
        const extension = file.type === 'image/png' ? 'png' : 'jpg';
        const compressedFileName = file.name.replace(/\.[^/.]+$/, '') + '_compressed.' + extension;

        const compressedFile = new File([blob], compressedFileName, {
          type: blob.type,
          lastModified: Date.now(),
        });

        // Log para debug
        const originalSizeKB = (file.size / 1024).toFixed(2);
        const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);
        console.log(`Image compressed: ${originalSizeKB}KB -> ${compressedSizeKB}KB (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`);

        resolve(compressedFile);
      };

      compress().catch(reject);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Carregar imagem do arquivo
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Verifica se um arquivo é uma imagem
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Formata o tamanho do arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}
