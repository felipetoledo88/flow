import React from 'react';
import { motion } from 'framer-motion';

interface NewLoaderProps {
  message?: string;
  submessage?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'purple' | 'green' | 'red';
  variant?: 'flow' | 'pulse' | 'spinner';
}

const NewLoader: React.FC<NewLoaderProps> = ({
  message = 'Carregando...',
  submessage,
  size = 'md',
  color = 'red',
  variant = 'flow'
}) => {
  // Configurações de tamanho
  const sizes = {
    sm: { container: 'w-8 h-8', icon: 'w-3 h-3' },
    md: { container: 'w-12 h-12', icon: 'w-4 h-4' },
    lg: { container: 'w-16 h-16', icon: 'w-5 h-5' }
  };

  // Configurações de cor
  const colors = {
    blue: {
      ring: 'border-blue-500',
      gradient: 'from-blue-500 to-cyan-400',
      bg: 'bg-blue-500'
    },
    purple: {
      ring: 'border-purple-500',
      gradient: 'from-purple-500 to-pink-400',
      bg: 'bg-purple-500'
    },
    green: {
      ring: 'border-green-500',
      gradient: 'from-green-500 to-emerald-400',
      bg: 'bg-green-500'
    },
    red: {
      ring: 'border-red-500',
      gradient: 'from-red-500 to-rose-400',
      bg: 'bg-red-500'
    }
  };

  const sizeConfig = sizes[size];
  const colorConfig = colors[color];

  // Renderizar baseado na variante
  const renderAnimation = () => {
    if (variant === 'flow') {
      return (
        <div className="flex items-center gap-1">
          {/* 3 pontos saltitantes */}
          {[0, 1, 2].map((dot) => (
            <motion.div
              key={dot}
              className={`w-3 h-3 rounded-full bg-gradient-to-r ${colorConfig.gradient}`}
              animate={{
                y: [0, -12, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: dot * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      );
    }

    if (variant === 'pulse') {
      return (
        <div className="flex items-center gap-2">
          {/* Barras de altura variável */}
          {[0, 1, 2, 3].map((bar) => (
            <motion.div
              key={bar}
              className={`w-1 bg-gradient-to-t ${colorConfig.gradient} rounded-full`}
              animate={{
                height: [16, 32, 16],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: bar * 0.1,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      );
    }

    // Spinner limpo
    return (
      <div className={`${sizeConfig.container} relative`}>
        <motion.div
          className={`w-full h-full border-2 border-transparent ${colorConfig.ring} border-t-transparent rounded-full`}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-4 p-6"
    >
      {renderAnimation()}
      
      {(message || submessage) && (
        <div className="text-center space-y-1 max-w-xs">
          {message && (
            <motion.h3
              className="font-semibold text-foreground"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {message}
            </motion.h3>
          )}
          
          {submessage && (
            <p className="text-sm text-muted-foreground">
              {submessage}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export { NewLoader };