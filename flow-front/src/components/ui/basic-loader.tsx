import React from 'react';

interface BasicLoaderProps {
  message?: string;
}

const BasicLoader: React.FC<BasicLoaderProps> = ({
  message = 'Carregando...'
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      {/* Ring CSS puro */}
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>

      <div className="text-center">
        <h3 className="font-semibold text-lg text-gray-900">
          {message}
        </h3>
        <p className="text-sm text-gray-500">
          Por favor, aguarde...
        </p>
      </div>
    </div>
  );
};

export { BasicLoader };