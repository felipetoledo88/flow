import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface TestLoaderProps {
  message?: string;
}

const TestLoader: React.FC<TestLoaderProps> = ({
  message = 'Carregando...'
}) => {

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="relative">
        {/* Ring animado */}
        <motion.div
          className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Segundo ring */}
        <motion.div
          className="absolute inset-1 border-2 border-purple-200 border-r-purple-500 rounded-full"
          animate={{ rotate: -360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
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

export { TestLoader };