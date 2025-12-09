import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

interface SimpleLoaderProps {
  isVisible?: boolean;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  submessage?: string;
  variant?: 'spinner' | 'flow' | 'pulse';
  color?: 'blue' | 'purple' | 'green';
  overlay?: boolean;
}

const SimpleLoader: React.FC<SimpleLoaderProps> = ({
  isVisible = true,
  size = 'md',
  message = 'Carregando...',
  submessage,
  variant = 'flow',
  color = 'blue',
  overlay = false
}) => {
  if (!isVisible) return null;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  const colorClasses = {
    blue: {
      primary: 'from-blue-500 to-cyan-400',
      accent: 'bg-blue-500'
    },
    purple: {
      primary: 'from-purple-500 to-pink-400',
      accent: 'bg-purple-500'
    },
    green: {
      primary: 'from-green-500 to-emerald-400', 
      accent: 'bg-green-500'
    }
  };

  const renderAnimation = () => {
    switch (variant) {
      case 'flow':
        return (
          <div className="relative flex items-center justify-center">
            <div className={`${sizeClasses[size]} relative`}>
              {/* Rings */}
              {[0, 1].map((ring) => (
                <motion.div
                  key={ring}
                  className="absolute inset-0 border-2 border-transparent rounded-full"
                  style={{
                    borderTopColor: color === 'blue' ? '#3b82f6' : color === 'purple' ? '#8b5cf6' : '#10b981',
                    width: `${100 - ring * 20}%`,
                    height: `${100 - ring * 20}%`,
                    left: `${ring * 10}%`,
                    top: `${ring * 10}%`
                  }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 2 + ring * 0.5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              ))}
              
              {/* Center */}
              <motion.div
                className={`absolute inset-2 rounded-full bg-gradient-to-r ${colorClasses[color].primary} flex items-center justify-center shadow-lg`}
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          </div>
        );

      case 'pulse':
        return (
          <motion.div
            className={`${sizeClasses[size]} rounded-full bg-gradient-to-r ${colorClasses[color].primary} flex items-center justify-center shadow-lg`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </motion.div>
        );

      default:
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ color: color === 'blue' ? '#3b82f6' : color === 'purple' ? '#8b5cf6' : '#10b981' }}
          >
            <Loader2 className={sizeClasses[size]} />
          </motion.div>
        );
    }
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center gap-4"
    >
      {renderAnimation()}
      
      {(message || submessage) && (
        <div className="text-center space-y-1">
          {message && (
            <h3 className="font-semibold text-foreground">
              {message}
            </h3>
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

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export { SimpleLoader };